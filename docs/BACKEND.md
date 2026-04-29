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
6. Fetch last 20 matches → save to Redis
7. Return player data

**Error responses**: 400 if gameName/tagLine missing or Riot API rejects

### `DELETE /api/players/[puuid]`
Remove a player and all their data (current, history, matches) from Redis.

### `POST /api/sync`
Refresh data for ALL tracked players.

**Flow per player**:
1. Fetch league entries → update `player:{puuid}:current`
2. Append daily snapshot to `player:{puuid}:history` (deduped by date)
3. Fetch match IDs → compare with stored matches → fetch only new ones
4. Update `player:{puuid}:matches` with merged + sorted list

**Rate limiting**: 100ms delay between API calls, 200ms delay between players.

**Response**: `{ synced: number, results: [{ puuid, success, error? }] }`

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
| `getSummonerByPuuid(puuid)` | `/tft/summoner/v1/summoners/by-puuid/{puuid}` | na1 | `{ id, puuid, profileIconId, ... }` |
| `getLeagueEntries(puuid)` | `/tft/league/v1/entries/by-puuid/{puuid}` | na1 | `LeagueEntry[]` |
| `getMatchIds(puuid, count)` | `/tft/match/v1/matches/by-puuid/{puuid}/ids` | americas | `string[]` |
| `getMatch(matchId)` | `/tft/match/v1/matches/{matchId}` | americas | `MatchDetail` |

**Routing**: Account and Match endpoints use regional routing (`americas.api.riotgames.com`). Summoner and League use platform routing (`na1.api.riotgames.com`).

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
| `player:{puuid}:matches` | String (JSON) | `MatchRecord[]` — match results (max 100) |

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
| `setPlayerMatches(puuid, matches)` | SET, trimmed to last 100 |

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

- Riot API errors propagate as `Error` with status code + response body
- Individual match fetch failures are silently skipped (catch blocks in loops)
- Sync reports per-player success/failure in the response
- Client-side errors are shown as red text in the UI

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
