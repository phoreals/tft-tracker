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
  getSummonerByPuuid,
  getLeagueEntries,
  getAllMatchIds,
  getMatch,
  delay,
} from "@/lib/riot";
import { getActiveSet, resolveSet } from "@/lib/utils";
import { isMockMode, getMockPlayersForSet } from "@/lib/mock";

// The set to serve is chosen by the `?set=` param (the global switcher), falling
// back to the active set. Data is read from that set's namespace, so an archived
// set returns its frozen snapshot.
export async function GET(req: NextRequest) {
  const setNumber = resolveSet(req.nextUrl.searchParams.get("set")).number;

  if (isMockMode()) {
    return NextResponse.json(getMockPlayersForSet(setNumber));
  }

  const players = await getTrackedPlayers();

  const enriched = await Promise.all(
    players.map(async (p) => {
      const [current, matches, history] = await Promise.all([
        getPlayerCurrent(p.puuid, setNumber),
        getPlayerMatches(p.puuid, setNumber),
        getPlayerHistory(p.puuid, setNumber),
      ]);
      return { ...p, current, matches, history };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const gameName = typeof body.gameName === "string" ? body.gameName.trim() : "";
  const tagLine = typeof body.tagLine === "string" ? body.tagLine.trim() : "";

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "gameName and tagLine are required" },
      { status: 400 }
    );
  }

  if (gameName.length > 16 || tagLine.length > 5) {
    return NextResponse.json(
      { error: "Invalid Riot ID format" },
      { status: 400 }
    );
  }

  // New players are always added to the active set's namespace.
  const activeSet = getActiveSet();

  try {
    // Validate with Riot API
    const account = await getAccountByRiotId(gameName, tagLine);
    const summoner = await getSummonerByPuuid(account.puuid);

    const player: TrackedPlayer = {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerId: summoner.id,
      region: "na1",
      profileIconId: summoner.profileIconId,
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
      await setPlayerCurrent(account.puuid, activeSet.number, current);
    }

    // Fetch active-set match history (paginated). Caps at 30 on initial add;
    // subsequent Sync Now calls backfill the rest 30 at a time.
    const setStartSec = Math.floor(activeSet.start / 1000);
    const allMatchIds = await getAllMatchIds(account.puuid, setStartSec);
    const matchIds = allMatchIds.slice(0, 30);
    const matchRecords: MatchRecord[] = [];

    for (const matchId of matchIds) {
      await delay(100);
      try {
        const match = await getMatch(matchId);
        if (match.info.tft_set_number !== activeSet.number) continue;
        const participant = match.info.participants.find(
          (p) => p.puuid === account.puuid
        );
        if (participant) {
          matchRecords.push({
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
      } catch {
        // Skip failed match fetches
      }
    }

    if (matchRecords.length > 0) {
      const { setPlayerMatches } = await import("@/lib/kv");
      await setPlayerMatches(account.puuid, activeSet.number, matchRecords);
    }

    return NextResponse.json({ ...player, current, matches: matchRecords });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add player";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
