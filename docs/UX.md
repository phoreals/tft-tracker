# UX Interactions

## Pages & Navigation

The app has two pages, accessed via a persistent sidebar (desktop) or bottom nav (mobile):

| Page | Route | Role |
|------|-------|------|
| **Weekly Stats** | `/` | Main view. At-a-glance squad performance for the current week. |
| **Manage Players** | `/players` | Add/remove tracked players, trigger manual syncs, seed original squad. |

Navigation is always visible. The active page is highlighted with a gold accent bar (sidebar) or gold icon tint (bottom nav).

## Weekly Stats (`/`)

### Summary Cards
Three `GlassCard` components at the top show aggregate weekly metrics:
- **Games This Week** — count of matches since Monday 00:00
- **Squad Playtime** — sum of all match durations this week (formatted as `Xd Xh Xm`)
- **Avg Top 4 Rate** — percentage of placements 1-4 across all weekly matches

### Player Performance Table
A full-width table inside a `GlassCard`. Each row shows one tracked player:

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Gold star icon prefix |
| Rank | `tier rank LP` | Dot indicator: gold if ranked, gray if unranked |
| Total Games | all-time match count | From stored matches |
| This Week | matches since Monday | Cyan highlight for emphasis |
| Top 4% | `(placements <= 4) / total * 100` | Includes a mini progress bar underneath |
| 1st% | `(placements == 1) / total * 100` | Cyan text |
| Time Played | weekly duration / total duration | Two lines — weekly primary, total as subtitle |

Empty state: centered message "No players tracked yet. Add players to get started."

### Rank Over Time Chart
A Recharts `LineChart` inside a `GlassCard` with a toggle:
- **Weekly** (default) — last 7 days of history snapshots
- **All Time** — full history

Each tracked player gets a colored line. Colors cycle through a 10-color palette. The Y-axis converts rank tiers to numeric values (Iron=0 through Challenger=3600+LP) and labels them by tier name.

Empty state: "No history data yet. Sync to start tracking."

### Sync Button
Top-right of the page header. Calls `POST /api/sync`, shows a spinning icon while active, then refreshes all data.

## Manage Players (`/players`)

### Layout
Two-column grid on desktop (4/8 split), stacked on mobile.

### Left Column

**Add Summoner** — a `GlassCard` form with:
- Riot ID text input (e.g. "Hide on bush")
- Tagline text input (e.g. "NA1")
- "ADD PLAYER" gold submit button
- Error message display (red text below inputs)

On submit: calls `POST /api/players` → validates against Riot API → fetches initial rank + last 20 matches → adds to Redis. Button shows "ADDING..." while in flight.

**Tracking Capacity** — shows `X / 10` with a gold progress bar. Max 10 players.

**Seed Squad** (conditional) — only visible when player list is empty. One-click button that calls `POST /api/seed` to add the 7 original players. Shows "SEEDING... (this takes ~30s)" during the operation.

### Right Column

**Tracked Players** — a `GlassCard` with a scrollable list of player cards. Each card:
- Diamond-shaped rotating icon (rotates on hover, gold border if elite tier)
- Player name + `#tagLine`
- Current rank + W/L record
- Delete button (appears on hover, red on hover)

Elite tiers (Diamond+) get gold borders; others get dim borders with cyan hover.

**Sync Now** badge in the card header triggers `POST /api/sync`.

## Interaction States

| State | Behavior |
|-------|----------|
| Loading | Stat values show "..." |
| Syncing | RefreshCw icon spins, button disabled |
| Adding player | Button shows "ADDING...", inputs disabled |
| Seeding | Button shows "SEEDING...", pulsing icon |
| Error | Red text appears below form inputs |
| Empty list | Centered empty state message |
| Hover on player card | Card slides 4px right, delete button fades in, diamond border rotates |
| Hover on table row | Row gets subtle gold background |

## Data Refresh Flow

1. **Automatic**: Vercel Cron hits `GET /api/cron` daily at midnight UTC
2. **Manual**: User clicks "Sync Now" on either page → `POST /api/sync`
3. **On add**: Adding a player immediately fetches their rank + last 20 matches
4. Page data is fetched via `GET /api/players` on mount (client-side `useEffect`)
