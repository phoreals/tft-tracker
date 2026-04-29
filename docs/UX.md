# UX Interactions

## Pages & Navigation

The app has two pages, accessed via a persistent sidebar (desktop) or bottom nav (mobile):

| Page | Route | Role |
|------|-------|------|
| **Weekly Stats** | `/` | Main view. At-a-glance squad performance for the current week. |
| **Manage Players** | `/players` | Add/remove tracked players, trigger manual syncs, seed original squad. |

Navigation is always visible. The active page is highlighted with a gold accent bar (sidebar) or gold icon tint (bottom nav).

## Weekly Stats (`/`)

### Page-Level Tab Navigation

A scrollable tab bar sits between the page header and the summary cards. It controls the entire page — summary cards, player table, and placement chart all update together.

**Tabs**: "This Set" (first) | "Week 1" | "Week 2" | … | "Week N" (current week)

- Calculated from the TFT set start date (April 15, 2026) in 7-day increments. Future weeks are hidden.
- Default on load: the current week (not "This Set").
- Each week tab shows "Week N" on the first line and the date range (e.g. "4/15–4/22") below.
- The bar overflows horizontally with a 3px gold scrollbar thumb for week 10+ scenarios.

### Summary Cards

Three `GlassCard` components show aggregate metrics for the **currently selected tab**:

| Card | "This Set" | Week tab |
|------|-----------|---------|
| **GAMES {label}** | Total games for the full set | Games for the selected week |
| **SQUAD PLAYTIME** | Total playtime for the full set | Playtime for the selected week |
| **AVG TOP 4 RATE** | Top-4 rate for the full set | Top-4 rate for the selected week |

### Player Performance Table

A full-width table inside a `GlassCard`. Columns and stats adapt to the selected tab.

**"This Set" view — 6 columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Riot profile icon (Community Dragon CDN); falls back to `User` icon |
| Rank | `tier rank LP` | Tier-colored. Sub-line: "Peak: {rank}" — highest rank reached this set from daily snapshots |
| Total Games | All-time match count | |
| Top 4% | Set-scoped `(placements ≤ 4) / total * 100` | Includes progress bar |
| 1st% | Set-scoped `(placements == 1) / total * 100` | Cyan text |
| Time Played | All-time total playtime | |

**Week tab view — 7 columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Same as above |
| Rank | `tier rank LP` | Tier-colored. "Peak: {rank}" and "Low: {rank}" sub-lines from daily snapshots within the week (omitted if no history data for that week) |
| Total Games | All-time match count | |
| {Week Label} | Games played in the selected week | Cyan highlight |
| Top 4% | Week-scoped top-4 rate | Includes progress bar |
| 1st% | Week-scoped 1st-place rate | Cyan text |
| Time Played | Week time (primary) / total time (sub-line) | |

**Peak and Low rank** are derived from `player.history` (daily rank snapshots stored by the cron job). If no snapshots exist for the selected window, sub-lines are omitted — the cell degrades gracefully to just the current rank string.

Empty state: centered message "No players tracked yet. Add players to get started."

### Placement Over Time Chart

A Recharts `LineChart` inside a `GlassCard`. Mode is driven entirely by the page-level tab — no internal controls on the chart.

- **"This Set" tab** — average placement per set-week (Wk 1 through present), one point per week per player. Empty weeks omitted.
- **Week tabs** — individual game placements for the selected week on a merged chronological timeline. Each X-axis point is a real game timestamp (formatted M/D).

Both modes: Y-axis placement 1–8 reversed (1st at top), reference line at y=4.5 (top-4 boundary), 10-color line palette, legend hidden on mobile (shown at 768px+).

Empty states:
- Week tabs: "No games played this week yet."
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
