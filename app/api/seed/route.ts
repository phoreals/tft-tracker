import { NextRequest, NextResponse } from "next/server";
import { addPlayer, getTrackedPlayers, setPlayerCurrent, setPlayerMatches } from "@/lib/kv";
import {
  getAccountByRiotId,
  getLeagueEntries,
  getAllMatchIds,
  getMatch,
  delay,
} from "@/lib/riot";
import type { MatchRecord } from "@/lib/kv";

export const maxDuration = 60;

const SEED_PLAYERS = [
  { gameName: "Banh", tagLine: "boi" },
  { gameName: "Richardpression", tagLine: "SAD" },
  { gameName: "Lionnel", tagLine: "NA1" },
  { gameName: "FireLordAppa", tagLine: "1335" },
  { gameName: "V for Taehyung", tagLine: "NA1" },
  { gameName: "Caramel Papi", tagLine: "PAPI1" },
  { gameName: "Demure", tagLine: "GGEZ" },
  { gameName: "Nisca", tagLine: "CREAM" },
  { gameName: "Goldeen", tagLine: "NA1" },
  { gameName: "MrBonChen", tagLine: "NA1" },
];

// GET returns the seed player list for the client to iterate
export async function GET() {
  let existing;
  try {
    existing = await getTrackedPlayers();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Redis connection failed: ${msg}` }, { status: 500 });
  }
  const existingPuuids = new Set(existing.map((p) => p.puuid));

  const players = SEED_PLAYERS.map((p) => ({
    ...p,
    // We can't check skip status without calling Riot API, so return all
  }));

  return NextResponse.json({ players, totalExisting: existingPuuids.size });
}

// POST seeds a single player by index, or all if no index given
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const index = body.index as number | undefined;

  let existing;
  try {
    existing = await getTrackedPlayers();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Redis connection failed: ${msg}` }, { status: 500 });
  }
  const existingPuuids = new Set(existing.map((p) => p.puuid));

  const toSeed = index != null ? [SEED_PLAYERS[index]] : SEED_PLAYERS;
  if (!toSeed[0]) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }

  const results: { name: string; success: boolean; error?: string; skipped?: boolean; matchCount?: number }[] = [];

  for (const { gameName, tagLine } of toSeed) {
    try {
      const account = await getAccountByRiotId(gameName, tagLine);
      await delay(100);

      if (existingPuuids.has(account.puuid)) {
        results.push({ name: `${gameName}#${tagLine}`, success: true, skipped: true });
        continue;
      }

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

      // Fetch all match history (paginated)
      const matchIds = await getAllMatchIds(account.puuid);
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

      results.push({
        name: `${account.gameName}#${account.tagLine}`,
        success: true,
        matchCount: matchRecords.length,
      });
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

  return NextResponse.json({
    added, skipped, failed, results,
    total: SEED_PLAYERS.length,
    remaining: index != null ? SEED_PLAYERS.length - index - 1 : 0,
  });
}
