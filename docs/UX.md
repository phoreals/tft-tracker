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

**Tabs**: "Set 17" (first) | "Week 1" | "Week 2" | … | "Week N" (current week)

- Calculated from the TFT set start date in 7-day increments. Future weeks are hidden.
- Default on load: the current week (not "Set 17").
- Each week tab shows "Week N" on the first line and the date range (e.g. "4/15–4/22") below.
- The bar overflows horizontally; `mask-image` gradients fade the left and/or right edges (48px) to signal scrollability. Gradients are conditional on scroll position — no fade on the left when fully scrolled left, no fade on the right when fully scrolled right. Driven by a `useScrollFade` hook that listens to `scroll` events and `ResizeObserver`.
- Horizontal scrollbar is flush against the bottom of the container — no padding gap. The scrollbar thumb is invisible by default and only appears on hover.
- All tab buttons stretch to equal height via `align-items: stretch` + `display: flex; justify-content: center` on each button, so tabs with and without sub-dates are visually even.
- On load and on tab change, the active tab scrolls into view via `data-active="true"` + `scrollIntoView({ block: 'nearest', inline: 'nearest' })`.
- **Sticky**: the tab wrap sticks to `top: 0` as the user scrolls. It has no background color — uses `backdrop-filter: blur(16px)` and a gold `border-bottom` + subtle glow so content shows through.
- A mobile dropdown (`<select>`) mirrors the same tab options; the desktop tab bar is hidden on small screens.
- The same tab system and sticky behavior applies to the **Player Drilldown** page.

### Superlatives

Six `GlassCard` components in a 3-column grid (2 columns on mobile) highlighting the player who leads each stat category for the selected tab's time window. Each card has the same layout as the summary cards (label + icon header, large stat value) plus a clickable player chip (24px profile icon + name) linking to the player's drilldown page. The chip has a hover affordance (gold tinted background).

| Card | Metric |
|------|--------|
| **Most Games** | Highest scoped game count |
| **Best Top 4%** | Highest top-4 rate (min 1 game) |
| **Most Wins (1st)** | Most 1st-place finishes |
| **Most Time Played** | Highest scoped playtime |
| **Highest LP Gain** | LP delta: current rank minus earliest history snapshot in window (requires ≥ 1 snapshot) |
| **Most Efficient Climb** | Highest LP gain per game played |

Card labels are contextual — they append "Set 17" or "This Week" depending on the selected tab (e.g. "Most Games Set 17" vs "Most Games This Week").

If no players qualify for a category (e.g. no games in a week), the card shows "—" with no player chip. Ties go to the first alphabetically by gameName.

Each card is clickable and links to a **Superlative Drilldown** page (`/superlative/[category]`) showing a ranked leaderboard table for that stat. The card has a hover lift effect (`translateY(-2px)`). The player chip within each card is a separate link to the player's drilldown page — it sits above the card link (`z-index: 1`, `stopPropagation`) so clicking the chip navigates to the player, while clicking elsewhere on the card navigates to the superlative drilldown. The chip uses `align-self: flex-start` so its hover highlight hugs the icon + name rather than stretching to the card's full width.

When loading or no players are fetched, all 6 cards render with "..." as placeholder values. Cards stretch to equal height in the grid regardless of whether a player chip is present.

On the **Player Drilldown** page, any superlatives the viewed player currently holds appear as pill badges below the stat cards, linking to the corresponding superlative drilldown page.

### Summary Cards

Three `GlassCard` components show aggregate metrics for the **currently selected tab**. These appear at the **bottom** of the page (below the chart), not at the top.

| Card | "Set 17" | Week tab |
|------|-----------|---------|
| **GAMES {label}** | Total games for the full set | Games for the selected week |
| **SQUAD PLAYTIME** | Total playtime for the full set | Playtime for the selected week |
| **AVG TOP 4 RATE** | Top-4 rate for the full set | Top-4 rate for the selected week |

### Player Performance Table

A `GlassCard` with a **view toggle** (table / card) in the header. Data and sort state live in `usePlayerRows`; the active view is managed by `PlayerTable`.

**View toggle**: two icon buttons (`LayoutList` / `LayoutGrid`) in the card header. Selecting a view persists for the session but is not stored in the URL. Default: table view.

**Column sorting** (table view only): All column headers are clickable. Clicking a header sorts by that column (descending first). Clicking again toggles asc/desc. The active sort column is highlighted in gold. Sort indicators use Lucide arrow icons: `ArrowDown` / `ArrowUp` in gold when active; `ArrowUpDown` (⇅) at 40% opacity on hover for inactive columns. Sortable columns: Summoner (alphabetical), Rank (numeric via `rankToLP`), Games (count), Top 4% (rate), 1st% (rate), Time Played (duration). Sorting state carries across view switches.

**Table view — 6 columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Riot profile icon (Community Dragon CDN); falls back to `User` icon |
| Rank | `tier rank LP` | Tier-colored rank emblem + abbreviated rank on mobile, full string on desktop |
| Games | Set total or week count depending on tab | |
| Top 4% | Scoped `(placements ≤ 4) / total * 100` | |
| 1st% | Scoped `(placements == 1) / total * 100` | Cyan text |
| Time Played | Scoped playtime | |

**Card view**: `auto-fill` CSS grid (`minmax(200px, 1fr)`). Each player card links to their drilldown page and shows: profile avatar (40px) + gameName + abbreviated rank, then a 4-stat row (Games, Top 4%, 1st%, Time). Cards respect the current tab — scoped values shown for week tabs, set totals for the Set tab.

Empty state: centered message "No players tracked yet. Add players to get started." in both views.

### Rank Over Time Chart

A Recharts `LineChart` inside a `GlassCard`. Mode is driven entirely by the page-level tab — no internal controls on the chart. Plots **daily LP** (converted from tier + rank + lp) for all tracked players on a shared timeline.

- Y-axis: tier names (Iron → Challenger) at 400 LP boundaries, domain auto-snapped to data range ± one tier
- X-axis: date (M/D), up to ~6 ticks, epoch timestamp scale
- Selected week is shaded as a `ReferenceArea` (gold tint)
- Each player's last valid data point shows their circular **profile picture** (24px, clipped to circle) with their `gameName` label to the right — no legend
- Line colors avoid rank-tier hues; 10-color palette (pink, blue, orange, lime, fuchsia, sky, amber, mint, rose, indigo)

Empty state: "No rank history yet. Sync to start tracking."

See `docs/DATA_VIZ.md` for full chart spec.

### Sync Button
Top-right of the page header. Runs a multi-pass loop: calls `POST /api/sync` repeatedly until `matchesRemaining === 0` across all players. Shows a spinning icon and live status text ("Syncing…", "Pass 2 — 45 matches remaining, continuing…"). If a pass returns `maxRateLimitMs > 0`, counts down the rate-limit wait second-by-second before the next pass.

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

**Seed Squad** (conditional) — only visible when player list is empty. One-click button that calls `POST /api/seed` to add the 7 original players. Shows "SEEDING... (this takes ~30s)" during the operation.

### Right Column

**Tracked Players** — a `GlassCard` with a scrollable list of player cards. Each card:
- Riot profile icon (Community Dragon CDN, 40px rounded square) with a tier-colored border; falls back to a generic avatar silhouette
- Player name + `#tagLine`
- Current rank (full text on desktop, abbreviated on mobile) + W/L record
- Delete button (appears on hover, red on hover)

Elite tiers (Diamond+) get gold borders; others get dim borders with cyan hover.

**Rank abbreviation on mobile**: Rank strings are abbreviated to save horizontal space — e.g. `Gold II 47 LP → G2 47LP`, `Master 185 LP → M 185LP`. The "Peak:" and "Low:" sub-line labels in the player performance table are always written in full regardless of viewport.

**Sync Now** badge in the card header triggers `POST /api/sync`.

## Superlative Drilldown (`/superlative/[category]`)

Accessed by clicking a superlative card on the Weekly Stats page. Category slugs: `most-games`, `best-top4`, `most-wins`, `most-time`, `highest-lp`, `best-lp-per-game`.

### Layout
- Back link to Weekly Stats
- Page title = category label (e.g. "Most Games")
- Same sticky tab bar as other pages (Set 17 / Week 1–N)

### Rankings Table
Columns: Rank (#), Summoner (profile icon + gameName#tagLine, links to player drilldown), Value (formatted stat + inline progress bar relative to leader). The leader's row has a subtle gold background highlight. All rank numbers are pill badges — gold for the leader, dim/muted for the rest — with a fixed `min-width` so they align vertically.

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
Horizontal layout: profile picture on the left, player info on the right.

- **Profile picture** — 64px (mobile) / 80px (desktop) rounded square. Source: Community Dragon CDN using `player.profileIconId`. Border color matches current tier. Falls back to a generic avatar silhouette if the icon is unavailable.
- **Player name + #tagline**
- **Rank badge** — tier-colored pill showing rank text + W/L record. Includes a 20px rank emblem image (Community Dragon ranked mini crest) before the rank string. The emblem image self-hides via `onError` if unavailable.

### Stat Cards (2x2 grid, 4 columns on desktop)
- Total Games, Top 4 Rate %, 1st Place Rate %, Time Played

### Placement Per Game Chart
A LineChart plotting every match chronologically:
- **Gold line**: actual placement per game (Y-axis reversed, 1st at top)
- **Reference line** at 4.5 (top 4 boundary)
- Tooltip shows game number + date

### Match History List
Scrollable list of all matches (newest first). Each row:
- Placement number (gold=1st, cyan=top 4, muted=bottom 4)
- Gold left border for top 4 finishes
- Duration + date/time

## Player Drilldown (`/player/[puuid]`)

### Sync Button
Top-right of the player header (alongside the avatar and rank badge). Calls `POST /api/sync/[puuid]` — a targeted sync that dedicates the full 50s budget to a single player. Same multi-pass loop and rate-limit countdown as the main page sync. Intended for manual backfill when a player's match count looks wrong. Refreshes player data after each pass.

## Data Refresh Flow

1. **Automatic**: Vercel Cron hits `GET /api/cron` daily at midnight UTC
2. **Manual (all players)**: User clicks "Sync Now" on the home or players page → multi-pass `POST /api/sync`
3. **Manual (one player)**: User clicks "SYNC" on the player drilldown page → multi-pass `POST /api/sync/[puuid]`
4. **On add**: Adding a player fetches their rank + first 30 Set 17 matches. Subsequent syncs backfill any remaining history (30 per run).
5. Page data is fetched via `GET /api/players` on mount (client-side `useEffect`)
