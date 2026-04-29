# Data Visualization

All charts use [Recharts](https://recharts.org/) 3.x with `ResponsiveContainer` for layout. Axis labels, tooltips, and legends are styled to match the Hextech theme (Space Grotesk font, dark backgrounds, gold/cyan accents). Chart colors are hardcoded hex strings in each component — Recharts props don't accept theme functions.

---

## Placement Over Time (`components/RankChart.tsx`)

Shown on the Weekly Stats page (`/`). Plots placement data for all tracked players on a shared timeline.

### Modes

Mode is controlled by the **page-level tab** (`selectedTab` prop from `app/page.tsx`) — RankChart has no internal tab bar.

| Page tab | Chart behavior | X-axis | Y-axis |
|----------|---------------|--------|--------|
| **Week tabs** | Individual game placements for the selected week | Game timestamps formatted `M/D` | Actual placement (1–8) |
| **"This Set"** | Avg placement per set-week | Set-week labels (`Wk 1`, `Wk 2`, …) | Avg placement per week (1–8) |

### Chart Configuration

```
Component:    LineChart > Line (one per player)
Container:    ResponsiveContainer width="100%" height="100%"
Height:       220px mobile / 288px desktop (ChartContainer styled div)
Y-axis:       reversed, domain [1, 8], ticks [1..8], width 24px
X-axis:       dataKey="week", no axis line, no tick line
Grid:         CartesianGrid horizontal only (vertical=false), stroke #e5c58711
Reference:    ReferenceLine y=4.5 — top-4 / bottom-4 boundary
Line:         type="monotone", strokeWidth=2, dot r=3, connectNulls=true
Legend:       shown at ≥768px via JS resize listener (CSS media queries don't work with Recharts Legend)
```

### Color Assignment

Lines cycle through `LINE_COLORS` (10 values) by player index:
```ts
const LINE_COLORS = [
  "#e5c587", "#00fbfb", "#e4b9ff", "#f87171", "#34d399",
  "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#2dd4bf",
];
```
Color is index-stable — if the player list order changes, line colors will shift.

### Data Transforms

**This Week** — merged chronological timeline:
1. Filter each player's matches to `timestamp >= currentWeek.start && timestamp < currentWeek.end`
2. Flatten into `{ ts, player, placement }` entries and sort by `ts`
3. Build a `Map<ts, point>` where each point is `{ week: "M/D", [playerName]: placement }`
4. Multiple players can share a timestamp slot (same game time); they are merged into one point

**This Set** — weekly averages:
1. Build week buckets from `SET_START` to `SET_END` in 7-day increments
2. For each week × player: average placement of all matches in that window (rounded to 2dp)
3. Weeks with no data for any player are omitted (filtered out)

### Empty States

| Mode | Message |
|------|---------|
| This Week | "No games played this week yet." |
| This Set | "No match data yet. Sync to start tracking." |

### Tooltip

```
Background:  #18202b
Border:      1px solid #e5c58733 (4px radius)
Font:        Space Grotesk 12px
Label:       date string (M/D), color #d0c5b5
Value:       placement formatted to 2dp (e.g. "2.50")
```

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
4. **Y-axis reversed**: placement 1 is always at the top. Use `reversed` prop on `YAxis` (not a data transform).
5. **`connectNulls`**: enabled on all lines so gaps (weeks with no data) don't break the line.
6. **Responsive height**: `ChartContainer` is a styled div with a fixed height, not a `%` on `ResponsiveContainer` — this avoids the Recharts "height 0" bug when the parent doesn't have an explicit height.
7. **Legend**: always guarded by a `showLegend` state driven by a `resize` event listener (set to `true` at ≥768px). Never use CSS to hide the Legend wrapper — Recharts renders it outside the SVG and media queries may not apply reliably.
