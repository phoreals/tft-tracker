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
A full-width table inside a `GlassCard` with a **week tab bar** at the top.

**Week tabs**: Calculated from the TFT set start date (April 15, 2026) through set end (July 29, 2026) in 7-day increments. Each tab shows "Week N" with the date range (e.g. "4/15-4/22"). Future weeks are hidden. The current week is selected by default. The column header dynamically shows the selected week label. The tab bar uses a negative-margin bleed + symmetric padding technique so it scrolls horizontally to the card edges — no clipping or dead-scroll at either end regardless of how many week tabs exist.

**Stats scope**: Top 4%, 1st%, and time played are scoped to the selected week's matches. Total Games always shows all-time count.

Each row shows one tracked player:

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Riot profile icon (from Community Dragon CDN); falls back to `User` icon if not yet stored |
| Rank | `tier rank LP` | Text color matches the player's tier (10 distinct per-tier colors) |
| Total Games | all-time match count | From stored matches |
| This Week | matches since Monday | Cyan highlight for emphasis |
| Top 4% | `(placements <= 4) / total * 100` | Includes a mini progress bar underneath |
| 1st% | `(placements == 1) / total * 100` | Cyan text |
| Time Played | weekly duration / total duration | Two lines — weekly primary, total as subtitle |

Empty state: centered message "No players tracked yet. Add players to get started."

### Placement Over Time Chart
A Recharts `LineChart` inside a `GlassCard` with a **time-window tab bar** (same bleed-scroll design as the Player Performance tabs):

- **This Week** (default) — individual game placements for the current set-week, shown as a merged chronological timeline. Each point on the X-axis is a real game timestamp (formatted M/D). Multiple players can share a timestamp slot.
- **This Set** — average placement per set-week (Wk 1 through present), one data point per week per player. Empty weeks are omitted.

Both modes share the same Y-axis: placement 1–8, reversed so 1st is at the top. A reference line at y=4.5 marks the top-4 boundary. Each tracked player gets a colored line from a 10-color palette. The legend is hidden on mobile (shown at 768px+).

Empty states:
- This Week: "No games played this week yet."
- This Set: "No match data yet. Sync to start tracking."

### Sync Button
Top-right of the page header. Calls `POST /api/sync`, shows a spinning icon while active, then refreshes all data.

## Manage Players (`/players`)

### Password Gate
The entire page is behind a password prompt. Visitors see a centered GlassCard with a password input and "UNLOCK" button. The password is checked client-side against a hardcoded value. On success, `sessionStorage` is set so the user doesn't need to re-enter it during the same browser session.


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
| Error | Red text appears below form inputs showing the actual server error (e.g. "Riot API 403: ...", "Redis connection failed: ...") |
| Empty list | Centered empty state message |
| Hover on player card (pointer only) | Card slides 4px right, delete button fades in, diamond border rotates. On touch devices, delete button is always visible at 50% opacity. |
| Hover on table row (pointer only) | Row gets subtle gold background |

## Player Drilldown (`/player/[puuid]`)

Accessed by clicking a player name in the Weekly Stats performance table.

### Header
- Back link ("BACK TO WEEKLY STATS") with arrow icon
- Player name + #tagline
- Current rank badge with W/L record

### Stat Cards (2x2 grid, 4 columns on desktop)
- Total Games, Top 4 Rate %, 1st Place Rate %, Time Played

### Placement Per Game Chart
A LineChart plotting every match chronologically:
- **Gold line**: actual placement per game (Y-axis reversed, 1st at top)
- **Cyan dashed line**: running average placement
- **Reference line** at 4.5 (top 4 boundary)
- Tooltip shows game number + date

### Match History List
Scrollable list of all matches (newest first). Each row:
- Placement number (gold=1st, cyan=top 4, muted=bottom 4)
- Gold left border for top 4 finishes
- Duration + date/time

## Data Refresh Flow

1. **Automatic**: Vercel Cron hits `GET /api/cron` daily at midnight UTC
2. **Manual**: User clicks "Sync Now" on either page → `POST /api/sync`
3. **On add**: Adding a player immediately fetches their rank + last 20 matches
4. Page data is fetched via `GET /api/players` on mount (client-side `useEffect`)
