import { NextResponse } from "next/server";
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
  getMatchIds,
  getMatch,
  delay,
} from "@/lib/riot";

export async function POST() {
  const players = await getTrackedPlayers();
  const results: { puuid: string; success: boolean; error?: string }[] = [];

  for (const player of players) {
    try {
      // Refresh profileIconId if missing
      if (!player.profileIconId) {
        const summoner = await getSummonerByPuuid(player.puuid);
        await addPlayer({ ...player, profileIconId: summoner.profileIconId });
        player.profileIconId = summoner.profileIconId;
        await delay(100);
      }

      // Fetch rank data
      const entries = await getLeagueEntries(player.puuid);
      const tftEntry = entries.find(
        (e) => e.queueType === "RANKED_TFT"
      );

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
      }

      // Fetch new matches
      await delay(100);
      const matchIds = await getMatchIds(player.puuid, 100);
      const existing = await getPlayerMatches(player.puuid);
      const existingIds = new Set(existing.map((m) => m.matchId));
      const newMatchIds = matchIds.filter((id) => !existingIds.has(id));

      const newRecords: MatchRecord[] = [];
      for (const matchId of newMatchIds) {
        await delay(100);
        try {
          const match = await getMatch(matchId);
          const participant = match.info.participants.find(
            (p) => p.puuid === player.puuid
          );
          if (participant) {
            newRecords.push({
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

      if (newRecords.length > 0) {
        const allMatches = [...existing, ...newRecords].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        await setPlayerMatches(player.puuid, allMatches);
      }

      results.push({ puuid: player.puuid, success: true });
    } catch (err) {
      results.push({
        puuid: player.puuid,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Delay between players to respect rate limits
    await delay(200);
  }

  return NextResponse.json({ synced: results.length, results });
}
