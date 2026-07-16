# Backend Design

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Next.js API Routes | Deployed as Vercel serverless functions |
| Database | Upstash Redis | REST-based, free tier (256MB, 10K commands/day) |
| External API | Riot Games TFT API | Development key (expires every 24h): 20 req/s, 100 req/2min |
| Scheduling | Vercel Cron | Daily at midnight UTC |

## File Structure

```
app/api/
├── players/
│   ├── route.ts              GET (list all, ?set=), POST (add player)
│   └── [puuid]/
│       └── route.ts          GET (single, ?set=), DELETE (remove player)
├── sync/
│   ├── route.ts              POST (sync all players with Riot API)
│   └── [puuid]/route.ts      POST (sync one player)
├── seed/
│   └── route.ts              POST (add original players)
├── migrate/
│   └── route.ts              POST (one-time: legacy keys → Set 17 namespace)
└── cron/
    └── route.ts              GET (Vercel Cron trigger, auth required)

lib/
├── riot.ts                   Riot API client
└── kv.ts                     Upstash Redis data access layer (per-set namespaced)
```

## Sets & Per-Set Namespacing

The app tracks multiple TFT sets (see `SETS` in `lib/utils.ts`). Set identity is
derived from today's date: `getActiveSet()` returns the latest set whose start has
passed. Per-set player data (current/history/matches) is stored under
**set-namespaced Redis keys** (`player:{puuid}:s{n}:{facet}`). Consequences:

- **Server routes resolve the set per-request** — sync/seed/POST write to
  `getActiveSet().number`'s namespace; GET endpoints read the set from the `?set=`
  param via `resolveSet(...)`. Never rely on the module-level `SET_*` aliases in a
  route (they freeze at module load and can go stale on a warm instance).
- **Archiving is automatic**: once the active set advances, the previous set's keys
  are never written again → frozen archive. No manual step at rollover.
- Match writes carry `setNumber` and are guarded (`match.info.tft_set_number ===
  activeSet.number`) so a boundary match can't leak into the wrong archive.

## API Routes

### `GET /api/players?set=N`
Returns all tracked players with their current stats, match history, and rank
history **for set N**. `?set=` is resolved via `resolveSet` (unknown/not-yet-started
values fall back to the active set); omitting it serves the active set. This is the
endpoint the global set switcher calls.

**Response**: `PlayerData[]` where each entry has:
```typescript
{
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  region: string;
  current: PlayerCurrentStats | null;  // from player:{puuid}:s{N}:current
  matches: MatchRecord[];              // from player:{puuid}:s{N}:matches
  history: HistorySnapshot[];          // from player:{puuid}:s{N}:history
}
```

### `GET /api/players/[puuid]?set=N`
Single-player variant of the above (parity; the player page fetches the list and
filters client-side). Reads the requested set's namespace.

### `POST /api/players`
Add a new player to tracking.

**Request body**: `{ gameName: string, tagLine: string }`

**Flow**:
1. Validate input
2. Call Riot API: account lookup → get puuid
3. Call Riot API: summoner lookup → get summonerId
4. Save player identity to Redis
5. Fetch initial rank data → save to the active set's namespace
6. Fetch all active-set match IDs (paginated, scoped by `activeSet.start`) → fetch first 30 (guarded by `tft_set_number`, full `MatchRecord` fields) → save. Subsequent syncs backfill the rest.
7. Return player data

**Error responses**: 400 if gameName/tagLine missing or Riot API rejects

### `DELETE /api/players/[puuid]`
Remove a player and all their data (current, history, matches) from Redis.

### `POST /api/sync`
Refresh data for ALL tracked players. `maxDuration = 60` (Vercel hobby limit).

**Flow per player** (all writes target the active set's namespace, resolved once per request via `getActiveSet()`):
1. Fetch league entries → update `player:{puuid}:s{active}:current`
2. Append daily snapshot to `player:{puuid}:s{active}:history` (deduped by date)
3. `getAllMatchIds(puuid, activeSet.start / 1000)` — paginate active-set match IDs
4. Diff against stored matches → collect all new match IDs
5. Process in batches of 30 until all new matches are fetched or 50s elapsed; each stored match is guarded by `tft_set_number === activeSet.number` and carries the full `MatchRecord` (`setNumber`, `ranked`, `lastRound`, `gameType`)
6. Update `player:{puuid}:s{active}:matches` with merged + sorted list

**Backfill behavior**: A single sync run will process as many batches of 30 as the time budget allows. Players are sorted by stored match count descending before the loop — those who are already caught up (cheap to process) go first, preserving the remaining time budget for players who are behind. Players with very large gaps (100+ missing matches) may need a second sync run. `matchesRemaining > 0` in the response indicates another run is needed.

**Rate limiting**: 100ms delay between API calls, 200ms delay between players. If a 429 response is received and the `Retry-After` wait would fit within the remaining budget, `riotFetch` waits and retries automatically. If the wait would exceed the deadline, a `RateLimitError` is thrown (exported from `lib/riot.ts`).

**Rate limit queuing**: If a `RateLimitError` is caught at the player level (i.e., the 429 happened during league entry or match ID fetching), the player is recorded as `success: true, matchesRemaining: 1, rateLimitMs: <ms>` rather than failing. The response includes `maxRateLimitMs` (the longest wait across all rate-limited players). The frontend uses this to pause before triggering the next sync pass.

**Console logging**: Each sync emits `[sync] PlayerName:` prefixed logs covering rank updates, per-batch progress, per-match errors, and a final summary.

**Response**: `{ synced: number, totalAdded: number, totalRemaining: number, maxRateLimitMs: number, results: [{ puuid, name, success, matchesAdded, matchesRemaining, batches, matchErrors, rateLimitMs?, error? }] }`

### `POST /api/sync/[puuid]`
Sync a single player by PUUID. The entire 50s budget is dedicated to that one player — useful for targeted backfill when a player's match count looks wrong. `maxDuration = 60`.

**Flow**: Same as the per-player block in `POST /api/sync` (rank update → match ID fetch → batch match fetch), but with no competition from other players for the time budget.

**Response**: `{ totalAdded: number, matchesRemaining: number, maxRateLimitMs: number, batches: number, matchErrors: number }`

**Error responses**: 404 if puuid not in tracked players. 500 with `{ error }` for other failures. Rate limit that exceeds the budget returns 200 with `matchesRemaining: 1, maxRateLimitMs: <ms>` (same retryable pattern as the bulk sync).

### `POST /api/seed`
Add the original hardcoded players (same flow as POST /api/players, repeated).

**Hardcoded players**:
- Banh#boi, Richardpression#SAD, Lionnel#NA1, FireLordAppa#1335
- V for Taehyung#NA1, Caramel Papi#PAPI1, Demure#GGEZ
- Nisca#CREAM, Goldeen#NA1, MrBonChen#NA1, KoN Aries#Liar

Skips players that are already tracked.

### `GET /api/cron`
Vercel Cron endpoint. Requires `Authorization: Bearer {CRON_SECRET}` header.

Internally calls `POST /api/sync` on the same origin.

Configured in `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }] }
```

### `POST /api/migrate`
One-time, **idempotent** migration that copies each tracked player's legacy
un-namespaced facet keys (`player:{puuid}:{facet}`) into the Set 17 namespace
(`player:{puuid}:s17:{facet}`). Safe to run repeatedly and while Set 17 is still
active — it never overwrites an already-namespaced key. Getters also self-migrate
lazily on read, so this route is a belt-and-suspenders way to eliminate any
split-brain window before the Set 18 rollover. No-op (400) in mock mode.

**Response**: `{ players: number, migrated: number, results: [{ puuid, name, copied }] }`

## Riot API Client (`lib/riot.ts`)

All calls go through `riotFetch<T>(url)` which adds the `X-Riot-Token` header.

| Function | Endpoint | Routing | Returns |
|----------|----------|---------|---------|
| `getAccountByRiotId(name, tag)` | `/riot/account/v1/accounts/by-riot-id/{name}/{tag}` | americas | `{ puuid, gameName, tagLine }` |
| `getLeagueEntries(puuid)` | `/tft/league/v1/by-puuid/{puuid}` | na1 | `LeagueEntry[]` |
| `getMatchIds(puuid, count, startTime?)` | `/tft/match/v1/matches/by-puuid/{puuid}/ids` | americas | `string[]` (single page) |
| `getAllMatchIds(puuid, startTime?)` | same endpoint, paginated | americas | `string[]` (full history) |
| `getMatch(matchId)` | `/tft/match/v1/matches/{matchId}` | americas | `MatchDetail` |

**Routing**: Account and Match endpoints use regional routing (`americas.api.riotgames.com`). Summoner and League use platform routing (`na1.api.riotgames.com`).

**Note**: The summoner endpoint is no longer needed. The TFT league endpoint now accepts PUUID directly via `/tft/league/v1/by-puuid/{puuid}`, eliminating the need for the encrypted summoner ID.

**Rate limiting**: The `delay(ms)` helper is used between sequential calls. Current delays:
- 100ms between API calls within a player
- 200ms between players during sync

## Data Access Layer (`lib/kv.ts`)

Uses `@upstash/redis` REST client. All data is JSON-serialized.

### Redis Key Schema

Identity keys are cross-set; the three data facets are namespaced per set (`s{n}`).

| Key | Type | Value |
|-----|------|-------|
| `players` | Set | Set of puuid strings (cross-set) |
| `player:{puuid}` | String (JSON) | `TrackedPlayer` — identity fields (cross-set) |
| `player:{puuid}:s{n}:current` | String (JSON) | `PlayerCurrentStats` — latest rank for set n |
| `player:{puuid}:s{n}:history` | String (JSON) | `HistorySnapshot[]` — daily rank snapshots for set n (max 365) |
| `player:{puuid}:s{n}:matches` | String (JSON) | `MatchRecord[]` — match results for set n |
| `player:{puuid}:{facet}` | String (JSON) | **Legacy** un-namespaced keys (pre-namespacing). Read as a Set 17 fallback and self-migrated on read; also handled by `POST /api/migrate`. |

### Functions

Per-set accessors take a `setNumber`. Getters read `player:{puuid}:s{n}:{facet}` and,
for `setNumber === 17`, fall back to the legacy key and copy it up on first read.

| Function | Operation |
|----------|-----------|
| `getTrackedPlayers()` | SMEMBERS `players` → GET each `player:{puuid}` |
| `addPlayer(player)` | SADD `players` + SET `player:{puuid}` |
| `removePlayer(puuid)` | SREM `players` + DEL identity, legacy keys, and every set's facet keys |
| `getPlayerCurrent(puuid, setNumber)` | GET `player:{puuid}:s{n}:current` (legacy fallback for s17) |
| `setPlayerCurrent(puuid, setNumber, stats)` | SET `player:{puuid}:s{n}:current` |
| `getPlayerHistory(puuid, setNumber)` | GET `player:{puuid}:s{n}:history` (legacy fallback for s17) |
| `appendPlayerHistory(puuid, setNumber, snap)` | Read-modify-write: dedup by date, trim to 365 |
| `getPlayerMatches(puuid, setNumber)` | GET `player:{puuid}:s{n}:matches` (legacy fallback for s17) |
| `setPlayerMatches(puuid, setNumber, matches)` | SET (no trim — stores full array) |
| `migratePlayerToNamespacedKeys(puuid)` | Idempotently copy legacy facet keys → s17 namespace |

### Data Types

```typescript
interface TrackedPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  region: string;  // currently always "na1"
}

interface PlayerCurrentStats {
  tier: string;     // e.g. "EMERALD"
  rank: string;     // e.g. "III"
  lp: number;       // league points
  wins: number;
  losses: number;
  lastUpdated: string;  // ISO datetime
}

interface HistorySnapshot {
  date: string;     // "YYYY-MM-DD"
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
}

interface MatchRecord {
  matchId: string;
  placement: number;   // 1-8
  duration: number;    // seconds
  timestamp: number;   // epoch milliseconds
  ranked?: boolean;    // true = Ranked TFT (queue_id 1100); false = other queue; undefined = pre-migration
  lastRound?: number;  // round number when player was eliminated / game ended
  gameType?: string;   // "standard" | "turbo" (Hyper Roll) | "pairs" (Double Up) | "choncc"
  setNumber?: number;  // TFT set the match belongs to (undefined = pre-migration)
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RIOT_API_KEY` | Yes | Development API key from developer.riotgames.com (regenerates every 24h) |
| `KV_REST_API_URL` | Yes | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis auth token |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint auth |

## Error Handling

- Riot API errors propagate as `Error` with status code + response body (e.g. `Riot API 403: {"status":{"message":"Forbidden",...}}`)
- Riot 429 rate limit errors are `RateLimitError` (subclass of `Error`) with a `retryAfterMs` field. The sync route catches these at the player level and returns them as retryable rather than failures, with `maxRateLimitMs` in the response so the frontend knows how long to wait.
- Redis connection failures are caught early in seed/sync and return a descriptive `500` (e.g. `Redis connection failed: ...`)
- Individual match fetch failures are logged via `console.error` and counted in `matchErrors` in the sync response
- Sync reports per-player success/failure in the response
- Client-side errors surface the actual server error message in the UI (red text below form inputs)

## Extending

### Adding a new region
Currently hardcoded to `na1` platform / `americas` regional routing. To support other regions:
1. Add `region` parameter to `getAccountByRiotId` and routing functions in `riot.ts`
2. Map regions to platform hosts (e.g. `euw1`, `kr`) and regional hosts (`europe`, `asia`)
3. Store the region in `TrackedPlayer` (field exists but is always "na1")

### Adding a new data field
1. Add the field to the relevant interface in `kv.ts`
2. Populate it in the sync logic (`api/sync/route.ts`)
3. Store it in the appropriate Redis key
4. Consume it in the frontend component

### Adding a new TFT set
1. Append a `{ number, label, start, end }` entry to the `SETS` registry in `lib/utils.ts` (update the previous set's `end` if it changed).
2. That's it — at the new set's `start` date it becomes active automatically: sync writes to its namespace, the previous set freezes as an archive, and the global switcher begins showing both. Run `POST /api/migrate` once (optional; getters also self-migrate) if legacy un-namespaced keys still exist.
