import { NextRequest, NextResponse } from "next/server";
import {
  getTrackedPlayers,
  addPlayer,
  getPlayerCurrent,
  getPlayerMatches,
  getPlayerHistory,
  type TrackedPlayer,
  type PlayerCurrentStats,
  type MatchRecord,
  type HistorySnapshot,
} from "@/lib/kv";
import {
  getAccountByRiotId,
  getLeagueEntries,
  getMatchIds,
  getMatch,
  delay,
} from "@/lib/riot";
import { isMockMode, MOCK_PLAYERS } from "@/lib/mock";

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json(MOCK_PLAYERS);
  }

  const players = await getTrackedPlayers();

  const enriched = await Promise.all(
    players.map(async (p) => {
      const [current, matches, history] = await Promise.all([
        getPlayerCurrent(p.puuid),
        getPlayerMatches(p.puuid),
        getPlayerHistory(p.puuid),
      ]);
      return { ...p, current, matches, history };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gameName, tagLine } = body as {
    gameName: string;
    tagLine: string;
  };

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "gameName and tagLine are required" },
      { status: 400 }
    );
  }

  try {
    // Validate with Riot API
    const account = await getAccountByRiotId(gameName, tagLine);

    const player: TrackedPlayer = {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerId: "",
      region: "na1",
    };

    await addPlayer(player);

    // Fetch initial data
    const entries = await getLeagueEntries(account.puuid);
    const tftEntry = entries.find(
      (e) => e.queueType === "RANKED_TFT"
    );

    let current: PlayerCurrentStats | null = null;
    if (tftEntry) {
      current = {
        tier: tftEntry.tier,
        rank: tftEntry.rank,
        lp: tftEntry.leaguePoints,
        wins: tftEntry.wins,
        losses: tftEntry.losses,
        lastUpdated: new Date().toISOString(),
      };
      const { setPlayerCurrent } = await import("@/lib/kv");
      await setPlayerCurrent(account.puuid, current);
    }

    // Fetch recent matches
    const matchIds = await getMatchIds(account.puuid, 100);
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
        // Skip failed match fetches
      }
    }

    if (matchRecords.length > 0) {
      const { setPlayerMatches } = await import("@/lib/kv");
      await setPlayerMatches(account.puuid, matchRecords);
    }

    return NextResponse.json({ ...player, current, matches: matchRecords });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add player";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
