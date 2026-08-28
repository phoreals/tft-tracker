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
const FOREIGN_RUN_LIMIT = 15;
const TOTAL_TIMEOUT_MS = 50_000;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ puuid: string }> }
) {
  const { puuid } = await params;
  // Resolve the active set per-request (see note in ../route.ts).
  const activeSet = getActiveSet();
  const players = await getTrackedPlayers();
  const player = players.find((p) => p.puuid === puuid);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const playerLabel = player.gameName ?? player.puuid;
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  console.log(`[sync:player] Starting sync for ${playerLabel}`);

  try {
    if (!player.profileIconId) {
      const summoner = await getSummonerByPuuid(player.puuid);
      await addPlayer({ ...player, profileIconId: summoner.profileIconId });
      player.profileIconId = summoner.profileIconId;
      await delay(100);
    }

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

      const today = new Date().toISOString().split("T")[0];
      await appendPlayerHistory(player.puuid, activeSet.number, {
        date: today,
        tier: tftEntry.tier,
        rank: tftEntry.rank,
        lp: tftEntry.leaguePoints,
        wins: tftEntry.wins,
        losses: tftEntry.losses,
      });
      console.log(`[sync:player] ${playerLabel}: rank updated (${tftEntry.tier} ${tftEntry.rank} ${tftEntry.leaguePoints} LP)`);
    } else {
      // See the matching branch in ../route.ts — unranked must clear, not no-op.
      await clearPlayerCurrent(player.puuid, activeSet.number);
      console.warn(`[sync:player] ${playerLabel}: no RANKED_TFT entry — cleared rank for set ${activeSet.number}`);
    }

    await delay(100);
    const setStartSec = Math.floor(activeSet.start / 1000);
    const matchIds = await getAllMatchIds(player.puuid, setStartSec, deadline);
    const existing = await getPlayerMatches(player.puuid, activeSet.number);
    const existingIds = new Set(existing.map((m) => m.matchId));
    // Same exclusion filter as the bulk route — see the note in ../route.ts.
    const excludedIds = new Set((await getPlayerSyncMeta(player.puuid, activeSet.number)).excludedMatchIds);
    const allNewMatchIds = matchIds.filter((id) => !existingIds.has(id) && !excludedIds.has(id));

    const skippedByExclusion = matchIds.length - existingIds.size - allNewMatchIds.length;
    console.log(`[sync:player] ${playerLabel}: ${existing.length} stored, ${allNewMatchIds.length} new to fetch${skippedByExclusion > 0 ? `, ${skippedByExclusion} known foreign-set skipped` : ""}`);

    const allNewRecords: MatchRecord[] = [];
    const foreignMatchIds: string[] = [];
    let offset = 0;
    let batches = 0;
    let matchErrors = 0;
    let consecutiveForeign = 0;
    let walkedOffTheSet = false;

    while (offset < allNewMatchIds.length && Date.now() < deadline && !walkedOffTheSet) {
      const batch = allNewMatchIds.slice(offset, offset + BATCH_SIZE);
      batches++;
      console.log(`[sync:player] ${playerLabel}: batch ${batches} — fetching matches ${offset + 1}–${offset + batch.length} of ${allNewMatchIds.length}`);

      for (const matchId of batch) {
        await delay(100);
        try {
          const match = await getMatch(matchId, deadline);
          // Defensive guard: never store a match from another set into this
          // set's archive (start_time scoping should already prevent it).
          if (match.info.tft_set_number !== activeSet.number) {
            foreignMatchIds.push(matchId);
            consecutiveForeign++;
            console.warn(`[sync:player] ${playerLabel}: skipping match ${matchId} from set ${match.info.tft_set_number} (active is ${activeSet.number})`);
            // See the matching guard in ../route.ts.
            if (consecutiveForeign >= FOREIGN_RUN_LIMIT) {
              walkedOffTheSet = true;
              console.warn(`[sync:player] ${playerLabel}: ${consecutiveForeign} consecutive foreign-set matches — stopping; the ID window looks unscoped`);
              break;
            }
            continue;
          }
          consecutiveForeign = 0;
          const participant = match.info.participants.find((p) => p.puuid === player.puuid);
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
          }
        } catch (err) {
          matchErrors++;
          console.error(`[sync:player] ${playerLabel}: failed to fetch match ${matchId} —`, err instanceof Error ? err.message : err);
        }
      }

      offset += batch.length;
    }

    const matchesRemaining = walkedOffTheSet ? 0 : allNewMatchIds.length - offset;

    if (allNewRecords.length > 0) {
      const allMatches = [...existing, ...allNewRecords].sort((a, b) => a.timestamp - b.timestamp);
      await setPlayerMatches(player.puuid, activeSet.number, allMatches);
    }

    if (foreignMatchIds.length > 0) {
      await addExcludedMatchIds(player.puuid, activeSet.number, foreignMatchIds);
      console.log(`[sync:player] ${playerLabel}: excluded ${foreignMatchIds.length} foreign-set match(es) from future syncs`);
    }

    await touchPlayerSynced(player.puuid, activeSet.number);

    console.log(`[sync:player] ${playerLabel}: done — ${allNewRecords.length} added, ${matchesRemaining} remaining`);

    return NextResponse.json({
      totalAdded: allNewRecords.length,
      matchesRemaining,
      maxRateLimitMs: 0,
      batches,
      matchErrors,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn(`[sync:player] ${playerLabel}: rate limited — retry after ${err.retryAfterMs}ms`);
      return NextResponse.json({
        totalAdded: 0,
        matchesRemaining: 1,
        maxRateLimitMs: err.retryAfterMs,
        batches: 0,
        matchErrors: 0,
      });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[sync:player] ${playerLabel}: failed —`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
