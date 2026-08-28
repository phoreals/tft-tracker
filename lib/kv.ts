import { Redis } from "@upstash/redis";
import { SETS } from "@/lib/utils";

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

// Per-set data lives under set-namespaced keys (player:{puuid}:s{n}:{facet}) so
// that once the active set rolls over, the previous set's keys are never written
// again and freeze into a browsable archive. Roster/identity (the `players` set
// and `player:{puuid}`) stay cross-set.
//
// LEGACY_SET_NUMBER is the set that existed before namespacing was introduced;
// its data lives under un-namespaced keys (player:{puuid}:{facet}). Getters fall
// back to those keys and copy them up to the namespaced key on first read, so the
// old data self-migrates. POST /api/migrate does the same eagerly.
const LEGACY_SET_NUMBER = 17;

// "sync" is bookkeeping rather than player data — it has no legacy un-namespaced
// equivalent, so readFacet's s17 fallback simply misses and returns null.
type Facet = "current" | "history" | "matches" | "sync";

function facetKey(puuid: string, setNumber: number, facet: Facet): string {
  return `player:${puuid}:s${setNumber}:${facet}`;
}

function legacyFacetKey(puuid: string, facet: Facet): string {
  return `player:${puuid}:${facet}`;
}

// --- Types ---

export interface TrackedPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  region: string;
  profileIconId?: number;
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

export interface PlayerSyncMeta {
  // Epoch ms of the last sync pass that reached this player. Sync processes the
  // stalest players first, so this is what stops a fixed order from cutting the
  // same tail every run when the time budget expires.
  syncedAt: number;
  // Match IDs that fall inside this set's time window but belong to another set
  // (games played after our set boundary but before Riot's actual set patch).
  // They are rejected on fetch, so without remembering them they would never
  // enter stored matches and would be re-fetched on every sync forever.
  excludedMatchIds: string[];
}

export interface MatchRecord {
  matchId: string;
  placement: number;
  duration: number;   // seconds
  timestamp: number;  // epoch ms
  ranked?: boolean;   // undefined = unknown (pre-migration records)
  lastRound?: number; // round number when player was eliminated / game ended
  gameType?: string;  // "standard" | "turbo" | "pairs" | "choncc"
  setNumber?: number; // TFT set the match belongs to (undefined = pre-migration records)
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
  const facets: Facet[] = ["current", "history", "matches", "sync"];
  const keys = [
    `player:${puuid}`,
    // Legacy un-namespaced facet keys
    ...facets.map((f) => legacyFacetKey(puuid, f)),
    // Per-set namespaced facet keys across every known set
    ...SETS.flatMap((s) => facets.map((f) => facetKey(puuid, s.number, f))),
  ];
  await redis.del(...keys);
}

// --- Per-set read with legacy fallback ---
// Reads the namespaced key; if absent for the legacy set, falls back to the old
// un-namespaced key and copies it up so the data self-migrates on first read.
async function readFacet<T>(puuid: string, setNumber: number, facet: Facet): Promise<T | null> {
  const value = await redis.get<T>(facetKey(puuid, setNumber, facet));
  if (value != null) return value;
  if (setNumber === LEGACY_SET_NUMBER) {
    const legacy = await redis.get<T>(legacyFacetKey(puuid, facet));
    if (legacy != null) {
      await redis.set(facetKey(puuid, setNumber, facet), legacy);
      return legacy;
    }
  }
  return null;
}

// --- Current Stats ---

export async function getPlayerCurrent(
  puuid: string,
  setNumber: number
): Promise<PlayerCurrentStats | null> {
  return readFacet<PlayerCurrentStats>(puuid, setNumber, "current");
}

export async function setPlayerCurrent(
  puuid: string,
  setNumber: number,
  stats: PlayerCurrentStats
): Promise<void> {
  await redis.set(facetKey(puuid, setNumber, "current"), stats);
}

// Drop a set's rank so the player reads as Unranked again. Riot omits the
// RANKED_TFT entry for anyone who hasn't finished placements, and at a set
// rollover that's *everyone* — without this, a rank written before the ladder
// reset would sit in the new set's namespace forever, because sync would never
// have an entry to overwrite it with.
//
// Only ever called for the active set. Calling it for LEGACY_SET_NUMBER would
// let readFacet resurrect the value from the old un-namespaced key on next read.
export async function clearPlayerCurrent(
  puuid: string,
  setNumber: number
): Promise<void> {
  await redis.del(facetKey(puuid, setNumber, "current"));
}

// --- History ---

export async function getPlayerHistory(
  puuid: string,
  setNumber: number
): Promise<HistorySnapshot[]> {
  return (await readFacet<HistorySnapshot[]>(puuid, setNumber, "history")) ?? [];
}

export async function appendPlayerHistory(
  puuid: string,
  setNumber: number,
  snapshot: HistorySnapshot
): Promise<void> {
  const history = await getPlayerHistory(puuid, setNumber);
  // Avoid duplicate entries for the same date
  const existing = history.findIndex((h) => h.date === snapshot.date);
  if (existing >= 0) {
    history[existing] = snapshot;
  } else {
    history.push(snapshot);
  }
  // Keep last 365 days
  const trimmed = history.slice(-365);
  await redis.set(facetKey(puuid, setNumber, "history"), trimmed);
}

// --- Matches ---

export async function getPlayerMatches(
  puuid: string,
  setNumber: number
): Promise<MatchRecord[]> {
  return (await readFacet<MatchRecord[]>(puuid, setNumber, "matches")) ?? [];
}

export async function setPlayerMatches(
  puuid: string,
  setNumber: number,
  matches: MatchRecord[]
): Promise<void> {
  await redis.set(facetKey(puuid, setNumber, "matches"), matches);
}

// --- Sync Metadata ---

const EXCLUDED_CAP = 500;

const EMPTY_SYNC_META: PlayerSyncMeta = { syncedAt: 0, excludedMatchIds: [] };

export async function getPlayerSyncMeta(
  puuid: string,
  setNumber: number
): Promise<PlayerSyncMeta> {
  const meta = await readFacet<PlayerSyncMeta>(puuid, setNumber, "sync");
  if (!meta) return { ...EMPTY_SYNC_META };
  // Tolerate partial records written by an older deploy.
  return {
    syncedAt: meta.syncedAt ?? 0,
    excludedMatchIds: meta.excludedMatchIds ?? [],
  };
}

// Stamp the player as synced for this set. Called on every terminal outcome —
// success, rate limit, or error — so a player who keeps failing still yields
// their place at the front of the queue instead of blocking everyone behind them.
export async function touchPlayerSynced(
  puuid: string,
  setNumber: number,
  at: number = Date.now()
): Promise<void> {
  const meta = await getPlayerSyncMeta(puuid, setNumber);
  await redis.set(facetKey(puuid, setNumber, "sync"), { ...meta, syncedAt: at });
}

// Union new IDs into the exclusion list. The realistic source is the handful of
// games played between our set boundary and Riot's set patch, so the list is
// naturally small; EXCLUDED_CAP is only a runaway guard.
export async function addExcludedMatchIds(
  puuid: string,
  setNumber: number,
  ids: string[]
): Promise<void> {
  if (!ids.length) return;
  const meta = await getPlayerSyncMeta(puuid, setNumber);
  const merged = Array.from(new Set([...meta.excludedMatchIds, ...ids]));
  await redis.set(facetKey(puuid, setNumber, "sync"), {
    ...meta,
    excludedMatchIds: merged.slice(-EXCLUDED_CAP),
  });
}

// --- Migration ---
// Copies a player's legacy un-namespaced facet keys into the LEGACY_SET_NUMBER
// namespace. Idempotent: skips a facet whose namespaced key already exists.
// Returns which facets were copied.
export async function migratePlayerToNamespacedKeys(puuid: string): Promise<Facet[]> {
  const facets: Facet[] = ["current", "history", "matches"];
  const copied: Facet[] = [];
  for (const facet of facets) {
    const alreadyNamespaced = await redis.get(facetKey(puuid, LEGACY_SET_NUMBER, facet));
    if (alreadyNamespaced != null) continue;
    const legacy = await redis.get(legacyFacetKey(puuid, facet));
    if (legacy != null) {
      await redis.set(facetKey(puuid, LEGACY_SET_NUMBER, facet), legacy);
      copied.push(facet);
    }
  }
  return copied;
}
