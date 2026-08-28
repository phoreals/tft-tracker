import { NextResponse } from "next/server";

export const maxDuration = 60;
import {
  getTrackedPlayers,
  addPlayer,
  setPlayerCurrent,
  clearPlayerCurrent,
  appendPlayerHistory,
  getPlayerMatches,
  setPlayerMatches,
  getPlayerSyncMeta,
  touchPlayerSynced,
  addExcludedMatchIds,
  type PlayerCurrentStats,
  type MatchRecord,
} from "@/lib/kv";
import {
  getLeagueEntries,
  getSummonerByPuuid,
  getAllMatchIds,
  getMatch,
  delay,
  RateLimitError,
} from "@/lib/riot";
import { getActiveSet } from "@/lib/utils";

const BATCH_SIZE = 30;
const TOTAL_TIMEOUT_MS = 50_000; // leave 10s buffer before Vercel's 60s limit

export async function POST() {
  const syncStart = Date.now();
  const deadline = syncStart + TOTAL_TIMEOUT_MS;
  // Resolve the active set per-request — do not use module-level SET_* aliases,
  // which freeze at module load and could go stale on a warm serverless instance.
  const activeSet = getActiveSet();
  const rawPlayers = await getTrackedPlayers();
  // Stalest-first. The time budget will always cut someone off; ordering by when
  // each player was last reached is what guarantees it isn't the same someone
  // every run. Never-synced players carry syncedAt 0 and therefore go first.
  const syncMetas = await Promise.all(rawPlayers.map((p) => getPlayerSyncMeta(p.puuid, activeSet.number)));
  const players = rawPlayers
    .map((p, i) => ({ ...p, _syncedAt: syncMetas[i].syncedAt, _excluded: syncMetas[i].excludedMatchIds }))
    .sort((a, b) => a._syncedAt - b._syncedAt);
  console.log(`[sync] Player order: ${players.map((p) => `${p.gameName ?? p.puuid}(${p._syncedAt === 0 ? "never" : new Date(p._syncedAt).toISOString()})`).join(", ")}`);
  const results: {
    puuid: string;
    name: string;
    success: boolean;
    matchesAdded: number;
    matchesRemaining: number;
    batches: number;
    matchErrors: number;
    error?: string;
    rateLimitMs?: number;
    skipped?: boolean;
  }[] = [];

  console.log(`[sync] Starting sync for ${players.length} players`);

  for (const player of players) {
    const playerLabel = `${player.gameName ?? player.puuid}`;

    if (Date.now() >= deadline) {
      // Resumable, not fatal: this player keeps their old (older) syncedAt, so
      // the next pass puts them at the front. Reported as success so the client
      // runs that next pass instead of aborting the whole multi-pass loop.
      console.warn(`[sync] ${playerLabel}: skipping — out of time budget, will lead the next pass`);
      results.push({ puuid: player.puuid, name: playerLabel, success: true, matchesAdded: 0, matchesRemaining: 0, batches: 0, matchErrors: 0, skipped: true });
      continue;
    }

    try {
      // Refresh profileIconId if missing
      if (!player.profileIconId) {
        console.log(`[sync] ${playerLabel}: fetching missing profileIconId`);
        const summoner = await getSummonerByPuuid(player.puuid);
        await addPlayer({ ...player, profileIconId: summoner.profileIconId });
        player.profileIconId = summoner.profileIconId;
        await delay(100);
      }

      // Fetch rank data
      const entries = await getLeagueEntries(player.puuid, deadline);
      const tftEntry = entries.find((e) => e.queueType === "RANKED_TFT");

      if (tftEntry) {
        const current: PlayerCurrentStats = {
          tier: tftEntry.tier,
          rank: tftEntry.rank,
          lp: tftEntry.leaguePoints,
          wins: tftEntry.wins,
          losses: tftEntry.losses,
          lastUpdated: new Date().toISOString(),
        };
        await setPlayerCurrent(player.puuid, activeSet.number, current);

        // Append to history (one entry per day)
        const today = new Date().toISOString().split("T")[0];
        await appendPlayerHistory(player.puuid, activeSet.number, {
          date: today,
          tier: tftEntry.tier,
          rank: tftEntry.rank,
          lp: tftEntry.leaguePoints,
          wins: tftEntry.wins,
          losses: tftEntry.losses,
        });
        console.log(`[sync] ${playerLabel}: rank updated (${tftEntry.tier} ${tftEntry.rank} ${tftEntry.leaguePoints} LP)`);
      } else {
        // No entry = unranked in this set (hasn't placed yet). Clear rather than
        // leave the previous value standing, or a rank captured before the set's
        // ladder reset would never be overwritten.
        await clearPlayerCurrent(player.puuid, activeSet.number);
        console.warn(`[sync] ${playerLabel}: no RANKED_TFT entry — cleared rank for set ${activeSet.number}`);
      }

      // Fetch all new match IDs upfront, then process in batches until
      // caught up or the function timeout approaches.
      await delay(100);
      const setStartSec = Math.floor(activeSet.start / 1000);
      const matchIds = await getAllMatchIds(player.puuid, setStartSec, deadline);
      const existing = await getPlayerMatches(player.puuid, activeSet.number);
      const existingIds = new Set(existing.map((m) => m.matchId));
      // Drop IDs already known to belong to another set — they are inside this
      // set's time window but were rejected on a previous run, and re-fetching
      // them every sync is what starved the players behind this one.
      const excludedIds = new Set(player._excluded);
      const allNewMatchIds = matchIds.filter((id) => !existingIds.has(id) && !excludedIds.has(id));

      const skippedByExclusion = matchIds.length - existingIds.size - allNewMatchIds.length;
      console.log(`[sync] ${playerLabel}: ${existing.length} stored, ${allNewMatchIds.length} new to fetch${skippedByExclusion > 0 ? `, ${skippedByExclusion} known foreign-set skipped` : ""}`);

      const allNewRecords: MatchRecord[] = [];
      const foreignMatchIds: string[] = [];
      let offset = 0;
      let batches = 0;
      let matchErrors = 0;

      while (offset < allNewMatchIds.length && Date.now() < deadline) {
        const batch = allNewMatchIds.slice(offset, offset + BATCH_SIZE);
        batches++;
        console.log(`[sync] ${playerLabel}: batch ${batches} — fetching matches ${offset + 1}–${offset + batch.length} of ${allNewMatchIds.length}`);

        for (const matchId of batch) {
          await delay(100);
          try {
            const match = await getMatch(matchId, deadline);
            // Defensive guard: never store a match from another set into this
            // set's archive (start_time scoping should already prevent it).
            if (match.info.tft_set_number !== activeSet.number) {
              // Remember it, or the next sync fetches it again — and every sync after that.
              foreignMatchIds.push(matchId);
              console.warn(`[sync] ${playerLabel}: skipping match ${matchId} from set ${match.info.tft_set_number} (active is ${activeSet.number})`);
              continue;
            }
            const participant = match.info.participants.find(
              (p) => p.puuid === player.puuid
            );
            if (participant) {
              allNewRecords.push({
                matchId,
                placement: participant.placement,
                duration: Math.round(match.info.game_length),
                timestamp: match.info.game_datetime,
                ranked: match.info.queue_id === 1100,
                lastRound: participant.last_round,
                gameType: match.info.tft_game_type,
                setNumber: match.info.tft_set_number,
              });
            } else {
              console.warn(`[sync] ${playerLabel}: participant not found in match ${matchId}`);
            }
          } catch (err) {
            matchErrors++;
            console.error(`[sync] ${playerLabel}: failed to fetch match ${matchId} —`, err instanceof Error ? err.message : err);
          }
        }

        offset += batch.length;
      }

      const remaining = allNewMatchIds.length - offset;

      if (allNewRecords.length > 0) {
        const allMatches = [...existing, ...allNewRecords].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        await setPlayerMatches(player.puuid, activeSet.number, allMatches);
        console.log(`[sync] ${playerLabel}: saved ${allNewRecords.length} new matches (${remaining} still remaining)`);
      } else {
        console.log(`[sync] ${playerLabel}: no new matches to save`);
      }

      if (foreignMatchIds.length > 0) {
        await addExcludedMatchIds(player.puuid, activeSet.number, foreignMatchIds);
        console.log(`[sync] ${playerLabel}: excluded ${foreignMatchIds.length} foreign-set match(es) from future syncs`);
      }

      if (remaining > 0) {
        console.warn(`[sync] ${playerLabel}: timed out with ${remaining} matches still unprocessed — run sync again to continue`);
      }

      results.push({
        puuid: player.puuid,
        name: playerLabel,
        success: true,
        matchesAdded: allNewRecords.length,
        matchesRemaining: remaining,
        batches,
        matchErrors,
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.warn(`[sync] ${playerLabel}: rate limited — will retry after ${err.retryAfterMs}ms`);
        results.push({
          puuid: player.puuid,
          name: playerLabel,
          success: true,
          matchesAdded: 0,
          matchesRemaining: 1,
          batches: 0,
          matchErrors: 0,
          rateLimitMs: err.retryAfterMs,
        });
      } else {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[sync] ${playerLabel}: sync failed —`, message);
        results.push({
          puuid: player.puuid,
          name: playerLabel,
          success: false,
          matchesAdded: 0,
          matchesRemaining: 0,
          batches: 0,
          matchErrors: 0,
          error: message,
        });
      }
    }

    // Stamp every terminal outcome — success, rate limit, and error alike — so a
    // player who reliably fails still surrenders their spot at the front of the
    // queue. The out-of-budget path above `continue`s past this on purpose: it
    // never got its turn, so it keeps its older timestamp and leads next pass.
    await touchPlayerSynced(player.puuid, activeSet.number);

    // Delay between players to respect rate limits
    await delay(200);
  }

  const totalAdded = results.reduce((s, r) => s + r.matchesAdded, 0);
  const totalRemaining = results.reduce((s, r) => s + r.matchesRemaining, 0);
  const maxRateLimitMs = results.reduce((max, r) => Math.max(max, r.rateLimitMs ?? 0), 0);
  const totalSkipped = results.filter((r) => r.skipped).length;
  console.log(`[sync] Done — ${totalAdded} matches added, ${totalRemaining} still remaining across all players${totalSkipped > 0 ? `, ${totalSkipped} player(s) skipped for time` : ""}${maxRateLimitMs > 0 ? `, rate limited (retry in ${maxRateLimitMs}ms)` : ""}`);

  return NextResponse.json({ synced: results.length, totalAdded, totalRemaining, totalSkipped, maxRateLimitMs, results });
}
