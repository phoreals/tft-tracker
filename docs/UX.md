# UX Interactions

## Pages & Navigation

The app has two pages, accessed via a persistent sidebar (desktop) or bottom nav (mobile):

| Page | Route | Nav icon | Role |
|------|-------|----------|------|
| **Home** | `/` | `Home` | Main view. Squad stats, superlatives, player table, and rank chart — across the current set or any individual week. |
| **Manage Players** | `/players` | `Users` | Add/remove tracked players, trigger manual syncs, seed original squad. |

Navigation is always visible. The active page is highlighted with a gold accent bar (sidebar) or gold icon tint (bottom nav).

## Home (`/`)

### Page-Level Tab Navigation

A scrollable tab bar sits between the page header and the summary cards. It controls the entire page — summary cards, player table, and placement chart all update together.

**Tabs**: "Set 17" (first) | "Week 1" | "Week 2" | … | "Week N" (current week)

- Calculated from the TFT set start date in 7-day increments. Future weeks are hidden.
- Default on load: the current week (not "Set 17").
- Tab labels are the period name only ("Set 17", "Week 1", etc.) — no date ranges in the tab buttons or select options.
- The bar overflows horizontally; `mask-image` gradients fade the left and/or right edges (48px) to signal scrollability. Gradients are conditional on scroll position. Driven by a `useScrollFade` hook.
- Horizontal scrollbar thumb is invisible by default and appears on hover.
- On load and on tab change, the active tab scrolls into view via `data-active="true"` + `scrollIntoView`.
- **Sticky**: the tab wrap sticks to `top: 0`. An `IntersectionObserver` on a zero-height sentinel element before the tab wrap drives a `$isSticky` prop — `backdrop-filter: blur(16px)` and a subtle gold glow activate only when stuck. On wide viewports (>1440px), `--bleed-extra` is computed via `ResizeObserver` so the sticky strip always bleeds edge-to-edge.
- A mobile dropdown (`CustomSelect`) mirrors the same tab options; the desktop tab bar is hidden on small screens. The period name (e.g. "Set 17", "Week 1") is bold and gold-colored, followed by a muted date range in `· date – date` format matching the page subheader.
- **The same tab system and sticky behavior applies to the Superlative Drilldown and Player Drilldown pages.**

### Superlatives

Six `GlassCard` components in a 3-column grid (2 columns on mobile) highlighting the player who leads each stat category for the selected tab's time window. Each card shows a label + duration pill header and a large stat value, plus a clickable player chip (24px profile icon + name) linking to the player's drilldown page. The chip has a hover affordance (gold tinted background).

| Card | Metric |
|------|--------|
| **Most Games Played** | Highest scoped game count |
| **Best Top 4 Rate** | Highest top-4 rate (min 1 game) |
| **Best Win Rate** | Highest % of 1st-place finishes |
| **Most Playtime** | Highest scoped playtime |
| **Most LP Gained** | LP delta: current rank minus earliest history snapshot in window (requires ≥ 1 snapshot) |
| **Avg LP Per Game** | Highest LP gain per game played |

Each card has a **duration pill** in the top-right of its header showing the active time window — "Set 17" (gold accent pill) or "Week N". The card label is the category name only (e.g. "Most Games"); the period is communicated by the pill alone.

`cat.label(isSet, weekNumber?)` on `SuperlativeCategory` is still used for column headers in the drilldown table — it returns e.g. "Most Games Week 2" or "Most Games Set 17" depending on context.

If no players qualify for a category (e.g. no games in a week), the card shows "—" as the stat value and "Awaiting data" in place of the player chip (muted text, same height as a chip to keep cards uniform). Ties go to the first alphabetically by gameName.

Each card is clickable and links to the **Stat Drilldown** page (`/stats/[category]`) showing a ranked leaderboard table for that stat. The card has a hover lift effect (`translateY(-2px)`). The player chip within each card is a separate link to the player's drilldown page — it sits above the card link (`z-index: 1`, `stopPropagation`) so clicking the chip navigates to the player, while clicking elsewhere on the card navigates to the superlative drilldown. The chip uses `align-self: flex-start` so its hover highlight hugs the icon + name rather than stretching to the card's full width. The chip has `margin-bottom: -xs` to offset its padding and keep the card's bottom spacing visually balanced. On touch devices (`hover: none`), the chip is `pointer-events: none` — no tap interaction, no border affordance.

When loading or no players are fetched, all 6 cards render with "..." as placeholder values. Cards stretch to equal height in the grid regardless of whether a player chip is present.

On the **Player Drilldown** page, any superlatives the viewed player currently holds appear as pill badges below the stat cards, linking to the corresponding stat drilldown page.

### Summary Cards

Four `GlassCard` components show aggregate metrics for the **currently selected tab**. These appear at the **bottom** of the page (below the chart). Each card has a label + duration pill on the same line (flex row, space-between) and a fluid-sized stat value (`clamp` between `lg` and `3xl`). Each card is a link — clicking it navigates to a **Stat Drilldown** page (`/stats/[category]`) showing a per-player breakdown with a donut chart or gauge. The cards have the same hover lift effect as superlative cards.

| Card | "Set 17" | Week tab | Drilldown |
|------|-----------|---------|-----------|
| **Squad Games** | Total games for the full set | Games for the selected week | `/stats/games` |
| **Squad Playtime** | Total playtime for the full set | Playtime for the selected week | `/stats/playtime` |
| **Squad Top 4 Rate** | Top-4 rate for the full set | Top-4 rate for the selected week | `/stats/top4-rate` |
| **Squad Win Rate** | 1st-place rate for the full set | 1st-place rate for the selected week | `/stats/win-rate` |

## Stat Drilldown (`/stats/[category]`)

Accessed by clicking a summary stat card or a superlative card on the home page. Six categories: `games`, `playtime`, `top4-rate`, `win-rate`, `highest-lp`, `best-lp-per-game`. Categories may specify a `navLabel` for the pill bar when a shorter label is needed (e.g. "LP / Game" instead of "Avg LP Per Game").

### Layout
- Back link to Home (preserves `?tab=` parameter)
- Page title = category label
- Same sticky tab bar (Set 17 / Week 1–N)

### Category Navigation
A horizontal pill bar above the content shows all 6 categories. The active category is highlighted (gold border + accent background). Clicking a pill navigates to that category's drilldown, preserving the current `?tab=` parameter. On mobile, pills scroll horizontally (no wrap) with a hidden scrollbar; on desktop they wrap normally.

### Content
Single-column stacked layout. Chart section (when present) sits above the sortable ranked table.

- **Games / Playtime** (`chartMode: "donut"`): donut chart showing per-player share. Center label = total. Recharts tooltip shows individual value + percentage. Donut segments use `LINE_COLORS` (same palette as the rank chart) for visual consistency across views.
- **Top 4 Rate / Win Rate** (`chartMode: "gauge"`): gauge section — large squad-average value, "Squad Avg" label, and a 4px progress bar with a 50% reference mark.
- **LP Gain / Avg LP Per Game** (`chartMode: "none"`): no chart, table only.

**Donut interaction**: hovering a donut segment expands it outward by 6px with a dark gap stroke. Tooltip snaps instantly between segments (no animation).

### Ranked Table
Columns: Rank (#), Summoner chip (profile icon + gameName#tagLine, links to player drilldown), Value (formatted stat + inline bar). Share categories (games, playtime) also show a % share column. The leader's row has a subtle gold background highlight. Rank badge numbers and colors always reflect natural rank (by value), not display order — reverse-sorting the table reorders rows but each player keeps their true rank number and color.

**Summoner chip**: the entire summoner cell (icon + colour dot + name) is wrapped in a link with chip-style hover highlight (gold tinted background, 8px horizontal padding). Width is `fit-content` so the highlight hugs the content.

**Table padding**: first and last columns have 8px horizontal padding. The table uses `min-width: 100%` so it overflows on narrow screens, triggering horizontal scroll with `mask-image` fade indicators. The row hover background fills the full row width, giving 8px of breathing room from the content on each side.

**Sorting**: the Summoner and Value column headers are clickable. Clicking a header sorts by that column (descending first). Clicking again toggles asc/desc. Default: value descending.

**Inline bar behavior**: For categories where values are always non-negative (games, playtime, top4-rate, win-rate), the bar fills left-to-right proportional to the leader. For categories that can produce negative values (highest-lp, best-lp-per-game), a **centered bar** is used: positive values extend gold to the right, negative values extend red to the left.

### Extra Charts

Two categories render a separate `GlassCard` below the main card:

**Playtime — "% of Time in TFT"** (`extraChart.type: "donuts"`): A responsive grid of mini donut charts, one per player. Each donut has three segments: TFT playtime (player's `LINE_COLORS` color), free time (medium slate), and sleep (dark slate, 8 hours/day). Center shows the TFT percentage with an "IN TFT" label. Each donut has an active hover state (segment expands with dark gap stroke) and a glassmorphic tooltip showing segment name, formatted hours+minutes, and percentage. Below each donut is a player chip (profile icon + name#tag, links to player drilldown). A legend row at the bottom labels the three segment colors.

**Games — "Games Per Day"** (`extraChart.type: "bar"`): A horizontal bar chart showing each player's daily game rate. Bars are colored using the leaderboard gradient (gold→slate via `getLeaderboardColor`). Labels on the right show the rate (e.g. "1.4/day").

### Player Performance Table

A `GlassCard` with a **duration pill** (period tag) after the title text and a **view toggle** (table / card) in the header action area. Data and sort state live in `usePlayerRows`; the active view is managed by `PlayerTable`.

**View toggle**: two icon buttons (`LayoutList` / `LayoutGrid`) in the card header. Selecting a view persists for the session but is not stored in the URL. Default: table view.

**Column sorting** (table view only): All column headers are clickable. Clicking a header sorts by that column (descending first). Clicking again toggles asc/desc. The active sort column is highlighted in gold. Sort indicators use custom SVG arrows (9px tall, strokeWidth 1.2, uniform across all directions) sized to the x-height of the header text. **Default sort on load: Rank descending (highest rank first).** Sortable columns: Summoner (alphabetical), Rank (numeric via `rankToLP`), Games (count), Top 4% (rate), 1st% (rate), Time Played (duration). Sorting state carries across view switches.

**Sort icon placement**: the chevron appears to the right of the label for left-aligned columns (Summoner, Rank). For right-aligned columns (Games, Top 4%, Win%, Playtime), the chevron appears to the left of the label so the label text stays flush against the right cell edge. Header labels use `white-space: nowrap` to prevent wrapping at any viewport width.

**Horizontal scroll affordance** (table view): The table wrapper scrolls horizontally on narrow viewports. The scrollbar is invisible by default and appears (3px, gold thumb) on hover. Conditional `mask-image` gradients fade the left and/or right edges (48px) to signal remaining content, driven by the same `useScrollFade` hook used by tab bars. Gradients respond to scroll position — no left fade when fully scrolled left, no right fade when fully scrolled right.

**Table view — 6 columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Summoner | `gameName#tagLine` | Riot profile icon (Community Dragon CDN); falls back to `User` icon |
| Rank | `tier rank LP` | Tier-colored rank emblem + abbreviated rank on mobile, full string on desktop |
| Games | Set total or week count depending on tab | |
| Top 4% | Scoped `(placements ≤ 4) / total * 100` | |
| 1st% | Scoped `(placements == 1) / total * 100` | Cyan text |
| Time Played | Scoped playtime | |

**Card view**: `auto-fill` CSS grid (`minmax(240px, 1fr)`). Each player card links to their drilldown page and shows: profile avatar (40px) + gameName (`base`/16px) + abbreviated rank, then a 4-stat row (Games, Top 4%, 1st%, Time as hours-only short format). Cards respect the current tab — scoped values shown for week tabs, set totals for the Set tab. Cards have a `borderDim` background, `xs` padding mobile / `md` desktop, and a gold glow (`glowGold`) on hover.

Empty state: centered message "No players tracked yet. Add players to get started." in both views.

### Rank Over Time Chart

A Recharts `LineChart` inside a `GlassCard` with a **duration pill** (period tag) after the title text. Mode is driven entirely by the page-level tab — no internal controls on the chart. Plots **daily LP** (converted from tier + rank + lp) for all tracked players on a shared timeline.

- Y-axis: tier emblems at 400 LP boundaries + division labels (IV/III/II/I) at 100 LP intervals within each tier; domain auto-snapped to data range
- X-axis: date (M/D), up to ~6 ticks, epoch timestamp scale
- Selected week is shaded as a `ReferenceArea` (gold tint)
- **Legend** below the chart — one chip per player with colored circle swatch; click to solo/toggle; "Show all" button when any hidden
- Hovering a line dims all others; tooltip follows cursor and portals to `document.body` for correct blur
- Line colors avoid rank-tier hues; 10-color palette (pink, blue, orange, lime, teal, sky, amber, mint, rose, indigo)

Empty state: "No rank history yet. Sync to start tracking."

See `docs/DATA_VIZ.md` for full chart spec.

### Sync Button
Top-right of the page header. Runs a multi-pass loop: calls `POST /api/sync` repeatedly until `matchesRemaining === 0` across all players. Shows a spinning icon while in flight. On completion, a `SyncOverlay` toast appears in the bottom-right (bottom-center on mobile) showing the result:
- **Success**: "Synced 11 players — 5 matches added (Banh +2, Demure +3)". Auto-dismisses after 5s.
- **No changes**: "All 11 players up to date". Auto-dismisses after 5s.
- **Error**: Red-bordered card with monospace error text. Persists until dismissed. Copy button copies the raw error for debugging.
- **Warn**: Gold-bordered card for match fetch errors. Auto-dismisses after 5s.

If a pass returns `maxRateLimitMs > 0`, counts down the rate-limit wait second-by-second before the next pass (no overlay during sync — only the spinning button icon).

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

All player rows use uniform `borderDim` borders with gold `borderHover` on hover — no elite/non-elite distinction.

**Rank abbreviation on mobile**: Rank strings are abbreviated to save horizontal space — e.g. `Gold II 47 LP → G2 47LP`, `Master 185 LP → M 185LP`. The "Peak:" and "Low:" sub-line labels in the player performance table are always written in full regardless of viewport.



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

- **Profile picture** — 64px (mobile) / 80px (desktop) rounded square. Source: Community Dragon CDN using `player.profileIconId`. Uniform `borderHover` color (not rank-colored). Falls back to a generic avatar silhouette if the icon is unavailable.
- **Player name + #tagline**
- **Rank badge** — tier-colored pill showing rank text + W/L record. Includes a 20px rank emblem image (Community Dragon ranked mini crest) before the rank string. The emblem image self-hides via `onError` if unavailable.

### Tab Scope

The page-level tab (Set / Week N) scopes the **stat cards only**. The rank chart, placement chart, and match history always show the full set history regardless of selected tab.

### Stat Cards (2-column grid, 3 columns on sm and desktop)
Games, Top 4 Rate, Win Rate, Time Played, LP Gain, LP / Game — all scoped to the selected tab window. LP Gain shows the delta between earliest history snapshot and current rank (e.g. "+45 LP" or "-20 LP"). LP / Game shows per-game LP efficiency (e.g. "+4.3 LP/g"). Both show "—" when insufficient history data. Each card header shows the label and duration pill on the same line (flex row, space-between). Any superlatives the player currently leads appear as pill badges in a `BadgeRow` below the stats grid, linking to the corresponding stat drilldown.

### Placement Breakdown Chart
Scoped to the selected tab period. Uses a `DurationPill` period tag. A **view toggle** (bar chart / pie chart icons) in the card header switches between two views. Empty state: "No games in this period."

**Bar view** (default): A Recharts horizontal `BarChart` with vertical layout. Each placement (1st–8th) has a unique color from `PLACEMENT_COLORS` — top 4 use gold hue with decreasing saturation, bottom 4 use cool slate tones. A dotted reference line separates 4th from 5th (win vs loss). X-axis shows count scale with grid lines. Count labels appear to the right of each bar. Glassmorphic tooltip on hover shows ordinal, game count, and percentage.

**Donut view**: A Recharts `PieChart` donut starting at 12 o'clock (clockwise). Same per-placement colors. Always-visible labels point to each segment via connector lines, showing ordinal (colored, bold) and percentage (muted) on two lines. Center shows total games count and "GAMES" label. Segment expands 4px on hover with dark gap stroke. Glassmorphic tooltip on hover.

### Rank Over Time Chart
Uses the shared `<RankChart>` component with `hideLegend`, `lineColors={[gold300]}`, and a `periodTag` duration pill matching the selected tab. Single gold line, no legend. Same Y-axis tick tooltips and week highlight as the main page chart.


### Match History List
Scrollable list of **all stored matches** (newest first, not week-scoped). Initially shows the **20 most recent** games. A "SHOW ALL (N GAMES)" button at the bottom expands to the full list. Each row shows:
- **Ordinal placement** (gold=1st, cyan=top 4, muted=bottom 4) with gold left border for top 4
- **Queue badge**: RANKED / NORMAL / HYPER ROLL / DOUBLE UP / CHONCC (dimmed if non-ranked, absent for pre-migration records)
- **Last round** in stage-round format: `R3-2` (absent for pre-migration records)
- **Duration** in `m:ss` format
- **Relative time** (`2h ago`, `3d ago`) — hovering shows a portal tooltip with the full date/time. On touch-only devices, the tooltip is suppressed and a short date (M/D) is shown inline instead.

## Player Drilldown (`/player/[puuid]`)

### Sync Button
Below the player identity on mobile, right-aligned on desktop. Visually identical to the homepage sync button. Calls `POST /api/sync/[puuid]` — a targeted sync that dedicates the full 50s budget to a single player. Same multi-pass loop, rate-limit countdown, and `SyncOverlay` result toast as the homepage. Success message includes the player name: "Richardpression synced — 3 matches added".

## Data Refresh Flow

1. **Automatic**: Vercel Cron hits `GET /api/cron` daily at midnight UTC
2. **Manual (all players)**: User clicks "Sync Now" on the home page → multi-pass `POST /api/sync`
3. **Manual (one player)**: User clicks "SYNC NOW" on the player drilldown page → multi-pass `POST /api/sync/[puuid]`
4. **On add**: Adding a player fetches their rank + first 30 Set 17 matches. Subsequent syncs backfill any remaining history (30 per run).
5. Page data is fetched via `GET /api/players` on mount (client-side `useEffect`)
