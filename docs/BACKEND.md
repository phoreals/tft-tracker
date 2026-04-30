# Backend Design

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Next.js API Routes | Deployed as Vercel serverless functions |
| Database | Upstash Redis | REST-based, free tier (256MB, 10K commands/day) |
| External API | Riot Games TFT API | Personal key: 20 req/s, 100 req/2min |
| Scheduling | Vercel Cron | Daily at midnight UTC |

## File Structure

```
app/api/
├── players/
│   ├── route.ts              GET (list all), POST (add player)
│   └── [puuid]/
│       └── route.ts          DELETE (remove player)
├── sync/
│   └── route.ts              POST (sync all players with Riot API)
├── seed/
│   └── route.ts              POST (add 7 original players)
└── cron/
    └── route.ts              GET (Vercel Cron trigger, auth required)

lib/
├── riot.ts                   Riot API client
└── kv.ts                     Upstash Redis data access layer
```

## API Routes

### `GET /api/players`
Returns all tracked players with their current stats, match history, and rank history.

**Response**: `PlayerData[]` where each entry has:
```typescript
{
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  region: string;
  current: PlayerCurrentStats | null;  // from player:{puuid}:current
  matches: MatchRecord[];              // from player:{puuid}:matches
  history: HistorySnapshot[];          // from player:{puuid}:history
}
```

### `POST /api/players`
Add a new player to tracking.

**Request body**: `{ gameName: string, tagLine: string }`

**Flow**:
1. Validate input
2. Call Riot API: account lookup → get puuid
3. Call Riot API: summoner lookup → get summonerId
4. Save player identity to Redis
5. Fetch initial rank data → save to Redis
6. Fetch all Set 17 match IDs (paginated) → fetch first 30 → save to Redis. Subsequent syncs backfill the rest.
7. Return player data

**Error responses**: 400 if gameName/tagLine missing or Riot API rejects

### `DELETE /api/players/[puuid]`
Remove a player and all their data (current, history, matches) from Redis.

### `POST /api/sync`
Refresh data for ALL tracked players. `maxDuration = 60` (Vercel hobby limit).

**Flow per player**:
1. Fetch league entries → update `player:{puuid}:current`
2. Append daily snapshot to `player:{puuid}:history` (deduped by date)
3. `getAllMatchIds(puuid, SET_START_SECONDS)` — paginate all Set 17 match IDs
4. Diff against stored matches → collect all new match IDs
5. Process in batches of 30 until all new matches are fetched or 50s elapsed
6. Update `player:{puuid}:matches` with merged + sorted list

**Backfill behavior**: A single sync run will process as many batches of 30 as the 50s budget allows. Players with very large gaps (100+ missing matches) may need a second sync run. `matchesRemaining > 0` in the response indicates another run is needed.

**Rate limiting**: 100ms delay between API calls, 200ms delay between players.

**Console logging**: Each sync emits `[sync] PlayerName:` prefixed logs covering rank updates, per-batch progress, per-match errors, and a final summary.

**Response**: `{ synced: number, totalAdded: number, totalRemaining: number, results: [{ puuid, name, success, matchesAdded, matchesRemaining, batches, matchErrors, error? }] }`

### `POST /api/seed`
Add the 7 original hardcoded players (same flow as POST /api/players, repeated).

**Hardcoded players**:
- Banh#boi, Richardpression#SAD, Lionnel#NA1, FireLordAppa#1335
- V for Taehyung#NA1, Caramel Papi#PAPI1, demure#ggez

Skips players that are already tracked.

### `GET /api/cron`
Vercel Cron endpoint. Requires `Authorization: Bearer {CRON_SECRET}` header.

Internally calls `POST /api/sync` on the same origin.

Configured in `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }] }
```

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

| Key | Type | Value |
|-----|------|-------|
| `players` | Set | Set of puuid strings |
| `player:{puuid}` | String (JSON) | `TrackedPlayer` — identity fields |
| `player:{puuid}:current` | String (JSON) | `PlayerCurrentStats` — latest rank |
| `player:{puuid}:history` | String (JSON) | `HistorySnapshot[]` — daily rank snapshots (max 365) |
| `player:{puuid}:matches` | String (JSON) | `MatchRecord[]` — match results (max 200) |

### Functions

| Function | Operation |
|----------|-----------|
| `getTrackedPlayers()` | SMEMBERS `players` → GET each `player:{puuid}` |
| `addPlayer(player)` | SADD `players` + SET `player:{puuid}` |
| `removePlayer(puuid)` | SREM `players` + DEL all 4 keys |
| `getPlayerCurrent(puuid)` | GET `player:{puuid}:current` |
| `setPlayerCurrent(puuid, stats)` | SET `player:{puuid}:current` |
| `getPlayerHistory(puuid)` | GET `player:{puuid}:history` |
| `appendPlayerHistory(puuid, snap)` | Read-modify-write: dedup by date, trim to 365 |
| `getPlayerMatches(puuid)` | GET `player:{puuid}:matches` |
| `setPlayerMatches(puuid, matches)` | SET (no trim — stores full array) |

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
  placement: number;  // 1-8
  duration: number;   // seconds
  timestamp: number;  // epoch milliseconds
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RIOT_API_KEY` | Yes | Personal API key from developer.riotgames.com |
| `KV_REST_API_URL` | Yes | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis auth token |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint auth |

## Error Handling

- Riot API errors propagate as `Error` with status code + response body (e.g. `Riot API 403: {"status":{"message":"Forbidden",...}}`)
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
