import { NextResponse } from "next/server";
import { addPlayer, getTrackedPlayers, setPlayerCurrent, setPlayerMatches } from "@/lib/kv";
import {
  getAccountByRiotId,
  getLeagueEntries,
  getMatchIds,
  getMatch,
  delay,
} from "@/lib/riot";
import type { MatchRecord } from "@/lib/kv";

const SEED_PLAYERS = [
  { gameName: "Banh", tagLine: "boi" },
  { gameName: "Richardpression", tagLine: "SAD" },
  { gameName: "Lionnel", tagLine: "NA1" },
  { gameName: "FireLordAppa", tagLine: "1335" },
  { gameName: "V for Taehyung", tagLine: "NA1" },
  { gameName: "Caramel Papi", tagLine: "PAPI1" },
  { gameName: "demure", tagLine: "ggez" },
];

export async function POST() {
  let existing;
  try {
    existing = await getTrackedPlayers();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Redis connection failed: ${msg}` },
      { status: 500 }
    );
  }
  const existingPuuids = new Set(existing.map((p) => p.puuid));

  const results: { name: string; success: boolean; error?: string; skipped?: boolean }[] = [];

  for (const { gameName, tagLine } of SEED_PLAYERS) {
    try {
      // Look up account
      const account = await getAccountByRiotId(gameName, tagLine);
      await delay(100);

      if (existingPuuids.has(account.puuid)) {
        results.push({ name: `${gameName}#${tagLine}`, success: true, skipped: true });
        continue;
      }

      // Save player
      await addPlayer({
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        summonerId: "",
        region: "na1",
      });
      await delay(100);

      // Fetch rank
      const entries = await getLeagueEntries(account.puuid);
      const tftEntry = entries.find((e) => e.queueType === "RANKED_TFT");
      if (tftEntry) {
        await setPlayerCurrent(account.puuid, {
          tier: tftEntry.tier,
          rank: tftEntry.rank,
          lp: tftEntry.leaguePoints,
          wins: tftEntry.wins,
          losses: tftEntry.losses,
          lastUpdated: new Date().toISOString(),
        });
      }
      await delay(100);

      // Fetch recent matches
      const matchIds = await getMatchIds(account.puuid, 20);
      const matchRecords: MatchRecord[] = [];
      for (const matchId of matchIds) {
        await delay(100);
        try {
          const match = await getMatch(matchId);
          const participant = match.info.participants.find(
            (p) => p.puuid === account.puuid
          );
          if (participant) {
            matchRecords.push({
              matchId,
              placement: participant.placement,
              duration: Math.round(match.info.game_length),
              timestamp: match.info.game_datetime,
            });
          }
        } catch {
          // skip failed match fetches
        }
      }
      if (matchRecords.length > 0) {
        await setPlayerMatches(account.puuid, matchRecords);
      }

      results.push({ name: `${account.gameName}#${account.tagLine}`, success: true });
    } catch (err) {
      results.push({
        name: `${gameName}#${tagLine}`,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    await delay(200);
  }

  const added = results.filter((r) => r.success && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ added, skipped, failed, results });
}
