# Data Visualization

All charts use [Recharts](https://recharts.org/) 3.x with `ResponsiveContainer` for layout. Axis labels, tooltips, and legends are styled to match the Hextech theme (Space Grotesk font, dark backgrounds, gold/cyan accents). Chart colors are hardcoded hex strings in each component — Recharts props don't accept theme functions.

---

## Rank Over Time (`components/RankChart.tsx`)

Shown on the Weekly Stats page (`/`). Plots **daily LP** (converted from tier + rank + lp via `rankToLP`) for all tracked players on a shared timeline.

### Modes

Mode is controlled by the **page-level tab** (`selectedTab` prop from `app/page.tsx`) — RankChart has no internal tab bar. The selected week is shaded as a `ReferenceArea` in all modes.

### Chart Configuration

```
Component:    LineChart > Line (one per player)
Container:    ResponsiveContainer width="100%" height="100%"
Height:       220px mobile / 288px desktop (ChartContainer styled div)
Y-axis:       domain snapped to tier boundaries (400 LP increments), ticks = tier names
              e.g. "Iron", "Bronze", … "Diamond", "Master"
X-axis:       dataKey="ts" (epoch ms), scale="time", formatted M/D, ~6 ticks max
Grid:         CartesianGrid horizontal only (vertical=false)
Reference:    ReferenceArea x1/x2 = selected week start/end (gold tint)
Line:         type="monotone", strokeWidth=2, connectNulls=true, isAnimationActive=false
Margin:       top: 16, right: 8, bottom: 0, left: 0
```

### Player Identification

Each player's line uses a **profile picture dot** at their last valid data point, with their `gameName` (no `#tagLine`) rendered as a small label to the right. All other data points use a small solid dot (r=2.5). No legend is rendered.

- Profile icons fetched from `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/{profileIconId}.jpg`
- Clipped to a circle (r=12) with a colored border ring matching the line color
- Falls back to a translucent circle if `profileIconId` is undefined
- The SVG is rendered with `overflow: visible` by Recharts, so labels at the right edge extend outside the chart area without clipping

### Color Assignment

Lines cycle through `LINE_COLORS` (10 values) by player index. Colors are chosen to avoid rank-tier hues (no gold/green/teal/purple) to prevent visual confusion between line color and rank tier:

```ts
const LINE_COLORS = [
  "#f472b6", // pink
  "#60a5fa", // blue
  "#fb923c", // orange
  "#a3e635", // lime
  "#e879f9", // fuchsia
  "#38bdf8", // sky
  "#fbbf24", // amber
  "#4ade80", // mint
  "#f87171", // rose
  "#818cf8", // indigo
];
```

Color is index-stable — if the player list order changes, line colors will shift.

### Data Transforms

1. Collect all unique `date` timestamps from all players' `history` snapshots
2. Sort chronologically, build one data point per date
3. For each point: `{ ts, [gameName]: rankToLP(tier, rank, lp), [gameName__label]: formatRank(...) }`
4. Players missing data for a given date have no key in that point (`connectNulls` bridges gaps)
5. Y-axis domain computed from all LP values, snapped to nearest 400 LP tier boundaries ± one tier

### Tooltip

```
Background:  theme.primitive.color.neutral850
Border:      1px solid theme.semantic.color.borderDefault
Font:        Space Grotesk
Label:       date string (M/D)
Value:       human-readable rank string, e.g. "Diamond II 47 LP"
```

### Empty State

"No rank history yet. Sync to start tracking."

---

## Placement Per Game (`app/player/[puuid]/page.tsx`)

Shown on the individual player drilldown page. Plots every stored match for one player.

### Chart Configuration

```
Component:    LineChart > two Lines (actual + running average)
Container:    ResponsiveContainer width="100%" height="100%"
Height:       220px (fixed styled div)
Y-axis:       reversed, domain [1, 8], ticks [1..8], width 24px
X-axis:       dataKey="game" (integer index, 1-based), label "Game #"
Grid:         CartesianGrid horizontal only, stroke #e5c58711
Reference:    ReferenceLine y=4.5 — top-4 boundary
```

### Lines

| Line | Color | Style | Description |
|------|-------|-------|-------------|
| Placement | `#e5c587` (gold) | solid, strokeWidth 2, dot r=3 | Actual placement per game |
| Avg | `#00fbfb` (cyan) | dashed (strokeDasharray "5 5"), strokeWidth 1.5, no dot | Running average up to each game |

### Data Transform

Matches are sorted oldest-first. For each match at index `i`:
```ts
{ game: i + 1, placement: match.placement, avg: average of placements[0..i] }
```
Running average is computed inline (cumulative sum / count).

### Tooltip

Same style as RankChart tooltip. Shows:
- Label: `Game {n}`
- Placement: exact integer (e.g. `3`)
- Avg: running average to 2dp (e.g. `2.33`)

---

## Design Conventions Across All Charts

1. **No axis lines or tick lines** — use `axisLine={false} tickLine={false}` on both axes. The grid provides visual reference instead.
2. **Tick font**: always `{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }`. These are hardcoded — Recharts tick props don't access theme.
3. **Horizontal-only grid**: `<CartesianGrid vertical={false}>` keeps charts uncluttered.
4. **`connectNulls`**: enabled on all lines so gaps (days with no data) don't break the line.
5. **`isAnimationActive={false}`**: disabled on RankChart to prevent re-animation when dot functions recreate on render.
6. **Responsive height**: `ChartContainer` is a styled div with a fixed height, not a `%` on `ResponsiveContainer` — this avoids the Recharts "height 0" bug when the parent doesn't have an explicit height.
7. **No Legend in RankChart**: player identity is conveyed by profile picture endpoint labels. No `showLegend` state or `Legend` component.
