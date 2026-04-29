import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

// --- Types ---

export interface TrackedPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  region: string;
}

export interface PlayerCurrentStats {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  lastUpdated: string;
}

export interface HistorySnapshot {
  date: string;
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
}

export interface MatchRecord {
  matchId: string;
  placement: number;
  duration: number; // seconds
  timestamp: number; // epoch ms
}

// --- Players ---

export async function getTrackedPlayers(): Promise<TrackedPlayer[]> {
  const puuids = await redis.smembers("players");
  if (!puuids.length) return [];
  const players: TrackedPlayer[] = [];
  for (const puuid of puuids) {
    const data = await redis.get<TrackedPlayer>(`player:${puuid}`);
    if (data) players.push(data);
  }
  return players;
}

export async function addPlayer(player: TrackedPlayer): Promise<void> {
  await redis.sadd("players", player.puuid);
  await redis.set(`player:${player.puuid}`, player);
}

export async function removePlayer(puuid: string): Promise<void> {
  await redis.srem("players", puuid);
  await redis.del(
    `player:${puuid}`,
    `player:${puuid}:current`,
    `player:${puuid}:history`,
    `player:${puuid}:matches`
  );
}

// --- Current Stats ---

export async function getPlayerCurrent(
  puuid: string
): Promise<PlayerCurrentStats | null> {
  return redis.get<PlayerCurrentStats>(`player:${puuid}:current`);
}

export async function setPlayerCurrent(
  puuid: string,
  stats: PlayerCurrentStats
): Promise<void> {
  await redis.set(`player:${puuid}:current`, stats);
}

// --- History ---

export async function getPlayerHistory(
  puuid: string
): Promise<HistorySnapshot[]> {
  return (await redis.get<HistorySnapshot[]>(`player:${puuid}:history`)) ?? [];
}

export async function appendPlayerHistory(
  puuid: string,
  snapshot: HistorySnapshot
): Promise<void> {
  const history = await getPlayerHistory(puuid);
  // Avoid duplicate entries for the same date
  const existing = history.findIndex((h) => h.date === snapshot.date);
  if (existing >= 0) {
    history[existing] = snapshot;
  } else {
    history.push(snapshot);
  }
  // Keep last 365 days
  const trimmed = history.slice(-365);
  await redis.set(`player:${puuid}:history`, trimmed);
}

// --- Matches ---

export async function getPlayerMatches(
  puuid: string
): Promise<MatchRecord[]> {
  return (await redis.get<MatchRecord[]>(`player:${puuid}:matches`)) ?? [];
}

export async function setPlayerMatches(
  puuid: string,
  matches: MatchRecord[]
): Promise<void> {
  // Keep last 200 matches
  const trimmed = matches.slice(-200);
  await redis.set(`player:${puuid}:matches`, trimmed);
}
