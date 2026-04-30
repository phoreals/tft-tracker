import { NextResponse } from "next/server";

export const maxDuration = 60;
import {
  getTrackedPlayers,
  addPlayer,
  setPlayerCurrent,
  appendPlayerHistory,
  getPlayerMatches,
  setPlayerMatches,
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
import { SET_START } from "@/lib/utils";

const BATCH_SIZE = 30;
const TOTAL_TIMEOUT_MS = 50_000; // leave 10s buffer before Vercel's 60s limit

export async function POST() {
  const syncStart = Date.now();
  const deadline = syncStart + TOTAL_TIMEOUT_MS;
  const players = await getTrackedPlayers();
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
  }[] = [];

  console.log(`[sync] Starting sync for ${players.length} players`);

  for (const player of players) {
    const playerLabel = `${player.gameName ?? player.puuid}`;

    if (Date.now() >= deadline) {
      console.warn(`[sync] ${playerLabel}: skipping — out of time budget`);
      results.push({ puuid: player.puuid, name: playerLabel, success: false, matchesAdded: 0, matchesRemaining: -1, batches: 0, matchErrors: 0, error: "Skipped: out of time budget" });
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
        await setPlayerCurrent(player.puuid, current);

        // Append to history (one entry per day)
        const today = new Date().toISOString().split("T")[0];
        await appendPlayerHistory(player.puuid, {
          date: today,
          tier: tftEntry.tier,
          rank: tftEntry.rank,
          lp: tftEntry.leaguePoints,
          wins: tftEntry.wins,
          losses: tftEntry.losses,
        });
        console.log(`[sync] ${playerLabel}: rank updated (${tftEntry.tier} ${tftEntry.rank} ${tftEntry.leaguePoints} LP)`);
      } else {
        console.warn(`[sync] ${playerLabel}: no RANKED_TFT entry found`);
      }

      // Fetch all new match IDs upfront, then process in batches until
      // caught up or the function timeout approaches.
      await delay(100);
      const setStartSec = Math.floor(SET_START / 1000);
      const matchIds = await getAllMatchIds(player.puuid, setStartSec, deadline);
      const existing = await getPlayerMatches(player.puuid);
      const existingIds = new Set(existing.map((m) => m.matchId));
      const allNewMatchIds = matchIds.filter((id) => !existingIds.has(id));

      console.log(`[sync] ${playerLabel}: ${existing.length} stored, ${allNewMatchIds.length} new to fetch`);

      const allNewRecords: MatchRecord[] = [];
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
            const participant = match.info.participants.find(
              (p) => p.puuid === player.puuid
            );
            if (participant) {
              allNewRecords.push({
                matchId,
                placement: participant.placement,
                duration: Math.round(match.info.game_length),
                timestamp: match.info.game_datetime,
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
        await setPlayerMatches(player.puuid, allMatches);
        console.log(`[sync] ${playerLabel}: saved ${allNewRecords.length} new matches (${remaining} still remaining)`);
      } else {
        console.log(`[sync] ${playerLabel}: no new matches to save`);
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

    // Delay between players to respect rate limits
    await delay(200);
  }

  const totalAdded = results.reduce((s, r) => s + r.matchesAdded, 0);
  const totalRemaining = results.reduce((s, r) => s + r.matchesRemaining, 0);
  const maxRateLimitMs = results.reduce((max, r) => Math.max(max, r.rateLimitMs ?? 0), 0);
  console.log(`[sync] Done — ${totalAdded} matches added, ${totalRemaining} still remaining across all players${maxRateLimitMs > 0 ? `, rate limited (retry in ${maxRateLimitMs}ms)` : ""}`);

  return NextResponse.json({ synced: results.length, totalAdded, totalRemaining, maxRateLimitMs, results });
}
