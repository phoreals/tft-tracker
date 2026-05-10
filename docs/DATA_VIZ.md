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
Height:       360px mobile / 480px desktop (ChartContainer styled div)
Y-axis:       ticks at 100 LP intervals within data range; tier emblems at 400 LP boundaries
              (IV/III/II/I labels at sub-division marks; Master/GM/Chal emblem only, no divisions)
              width=36px; domain snapped to data range tier boundaries
X-axis:       dataKey="ts" (epoch ms), scale="time", formatted M/D, ~6 ticks max
Grid:         CartesianGrid horizontal only (vertical=false)
Reference:    ReferenceArea x1/x2 = selected week start/end (gold tint)
Line:         type="monotone", strokeWidth=2, connectNulls=true, isAnimationActive=false
              dot: r=2.5 solid; activeDot: r=4
Margin:       top: 16, right: 16, bottom: 0, left: 4
```

### Y-Axis Tick Rendering (`RankTick`)

Custom SVG tick component handles two cases:
- **Tier boundary** (`lp % 400 === 0`): renders a 14px tier emblem (Community Dragon mini crest) on the left + "IV" text on the right (omitted for Master/GM/Chal which have no divisions)
- **Sub-division** (`lp % 400 === 100/200/300`): renders "III", "II", or "I" text right-aligned; skipped for Master+ tiers

Each tick wraps its SVG content in a `<g>` with a transparent 34×20px hit rect so small labels are easy to hover. On hover, a portal tooltip renders to `document.body` showing the full division name (e.g. "Emerald II"). The tooltip follows the cursor via `onMouseEnter` position capture.

### Player Identification & Legend

No in-chart labels or dots on data points. Player identity is conveyed by a **legend row** below the chart:
- One `LegendChip` button per player with a colored line swatch (16×8px SVG showing the actual stroke + dash pattern) + `gameName`
- Click a chip to **solo** that player (hides all others); click again to show all
- First click on a chip when all are visible enters solo mode (hides all others), not just a toggle
- Hidden chips render at 35% opacity; a "Show all" button appears when any players are hidden

### Hover Highlight

Hovering a `<Line>` sets that player as `hoveredPlayer`:
- Hovered line: `strokeWidth=2.5`, `strokeOpacity=1`
- Other lines: `strokeWidth=1`, `strokeOpacity=0.2`
- State is tracked in both React state (`hoveredPlayer`) and a ref (`hoveredPlayerRef`) for use inside the tooltip render closure

### Color and Pattern Assignment

Each player gets a unique combination of **color** (from `LINE_COLORS`) and **stroke pattern** (from `LINE_DASH_PATTERNS`), both indexed by their position in the player list.

**Color palette** — 10 visually distinct hues spread across the wheel, avoiding rank-tier badge colors (iron through challenger):

```ts
// Colors ordered so perceptually similar hues alternate solid (indices 0–4, 10)
// vs dashed (indices 5–9). Critical close pairs are always on opposite sides.
const LINE_COLORS = [
  "#f87171", // rose      — solid   (0)
  "#fbbf24", // amber     — solid   (1)  close to orange
  "#a3e635", // lime      — solid   (2)
  "#2dd4bf", // teal      — solid   (3)  close to sky, mint
  "#60a5fa", // blue      — solid   (4)  close to sky, indigo
  "#fb923c", // orange    — dashed  (5)  close to rose, amber
  "#4ade80", // mint      — dashed  (6)  close to teal
  "#38bdf8", // sky       — dashed  (7)  close to blue, teal
  "#818cf8", // indigo    — dashed  (8)  close to blue
  "#f472b6", // pink      — dashed  (9)  close to rose, fuchsia
  "#e879f9", // fuchsia   — solid  (10)  close to pink
];
```

**Stroke patterns** — players 6–10 (indices 5–9) each get a unique dash pattern as a secondary differentiator, so each player has a unique color+pattern combination on crowded charts:

```ts
const LINE_DASH_PATTERNS = [
  "",          // players 1–5: solid
  "", "", "", "",
  "8 4",       // 6: long dash     ── ── ──
  "3 3",       // 7: short dash    – – – –
  "1 4",       // 8: dotted        ·  ·  ·
  "8 3 2 3",   // 9: dash-dot      ──·──·
  "12 3",      // 10: extra long   ────────
];
```

The legend swatch renders as a short SVG line segment (16×8px) so it shows the actual stroke pattern, not just a color dot.

Color and pattern are index-stable — if the player list order changes, assignments will shift.

### Data Transforms

1. Collect all unique `date` timestamps from all players' `history` snapshots
2. Sort chronologically, build one data point per date
3. For each point: `{ ts, [gameName]: rankToLP(...), [gameName__label]: formatRankAbbr(...), [gameName__tier]: tier }`
4. Players missing data for a given date have no key in that point (`connectNulls` bridges gaps)
5. Y-axis ticks generated at 100 LP intervals within `[minBase, maxBase]`; division marks skipped for Master+

### Tooltip

Rendered via `makePortalTooltip` — a factory that returns a Recharts `content`-compatible component using `createPortal` to `document.body`. This escapes the `GlassCard`'s `backdrop-filter` stacking context so the tooltip blur renders correctly.

```
Positioning:  fixed, follows mouse/touch via mousePos ref + touch handlers on ChartContainer
              Flips to left of cursor when within 200px of right viewport edge
Background:   rgba(12, 20, 30, 0.6) + backdrop-filter: blur(16px)
Border:       1px solid borderDefault
Radius:       radius.lg
Shadow:       glassInset
Font:         Space Grotesk
Date label:   StatLabel style (12px, bold, 0.05em tracking, textMuted), 10px gap below
Entries:      colored dot · gameName (flex:1) · [tier emblem] · abbreviated rank (tier color, bold)
              Emblem + rank are right-aligned with paddingLeft: 16 gap from name
Content:      When a player is hovered, shows only that player; otherwise shows all players sorted by LP desc
```

### Empty State

"No rank history yet. Sync to start tracking."

---

## Placement Breakdown (`app/player/[puuid]/page.tsx`)

Shown on the individual player drilldown page. Displays placement distribution across **all stored matches** for one player (not filtered by selected tab). Two views toggled via `ViewToggle`: **Bar** (default) and **Donut**.

### Bar View

```
Component:    BarChart (layout="vertical") > Bar
Container:    ResponsiveContainer width="100%" height="100%"
Height:       280px fixed (PlacementChartWrap)
X-axis:       count of games per placement; no tick marks
Y-axis:       category axis, labels "1st"…"8th" (ordinals), width 36px
Grid:         CartesianGrid vertical lines only (horizontal={false})
Reference:    ReferenceLine x={0} after 4th (dotted, top-4 boundary separator)
Margin:       top: 0, right: 36, bottom: 4, left: 0
```

Each bar is colored per placement using `PLACEMENT_COLORS`:
- **1st–4th** (top 4): gold hue ramp (`#e5c587` → `#917a48`)
- **5th–8th** (bottom 4): slate blue ramp (`#8a9bb0` → `#4a5c6a`)

Custom tooltip (Recharts `content` prop) shows ordinal + count + percentage, styled via `CHART.tooltip` constants.

### Donut View

```
Component:    PieChart > Pie (innerRadius="55%" outerRadius="72%")
startAngle:   90 (12 o'clock), endAngle: -270
Labels:       always-visible connector lines, showing ordinal + percentage
```

Uses the same `PLACEMENT_COLORS` array. Placements with 0 games are filtered from the data. A centered `DonutTotal` label shows total game count.

### Data Transform

Aggregate match array into placement counts:
```ts
const counts = Array(8).fill(0);
matches.forEach(m => counts[m.placement - 1]++);
// → [{ placement: 1, label: "1st", count, pct }, …]
```

---

## Squad Donut (`app/stats/[category]/page.tsx` — games & playtime)

Shown on the stat drilldown page for categories with `chartMode: "donut"` (games, playtime). Displays a single donut chart showing each player's share of the squad total.

### Chart Configuration

```
Component:    PieChart > Pie (single donut)
Container:    ResponsiveContainer width="100%" height="100%"
Height:       inherits from DonutWrap (square, centered)
Pie:          innerRadius="55%", outerRadius="80%", startAngle=90, endAngle=-270
Segments:     one per player with value > 0, solid fill
Active shape: outerRadius + 6px, dark gap stroke (rgba(12, 20, 30, 0.7))
Tooltip:      glassmorphic, shows color dot + gameName + formatted value + percentage
Center:       aggregate total value + "SQUAD TOTAL" label
```

### Color Assignment

Segments use `LINE_COLORS` (same palette as the rank chart), indexed by the player's position in the original player list. This makes a player's color consistent across all charts in the app. No patterns — all segments are solid fills.

### Tooltip

Uses `payload[0].payload` (the original `RankedRow` object) directly rather than searching by value equality — this avoids incorrect lookups when two players share the same stat value.

---

## Mini Donut Grid (`app/stats/[category]/page.tsx` — playtime only)

A responsive CSS grid of per-player donut charts showing how TFT playtime fits into the total period. Only rendered for the `playtime` category via `extraChart.type: "donuts"`.

### Chart Configuration

```
Component:    PieChart > Pie (one per player, in a CSS grid)
Size:         200×200px fixed (MiniDonutWrap)
Grid:         auto-fill, minmax(220px, 1fr), centered
Pie:          innerRadius="55%", outerRadius="85%", startAngle=90, endAngle=-270
Segments:     3 per donut — TFT (player's LINE_COLORS color), Free time (neutral600), Sleep (neutral700)
Active shape: outerRadius + 4px, dark gap stroke, per-donut hover state
Tooltip:      glassmorphic, shows segment name + formatted hours + percentage
Center:       percentage value + "IN TFT" label
Below donut:  player chip (20px profile icon + gameName#tagLine, links to player page)
Legend:       row below the grid — gold dot "TFT", neutral dot "Free time", dark dot "Sleep (8h/day)"
```

### Data Transform

```ts
sleepSec = periodSec / 3          // 8 hours/day
freeSec  = periodSec - tftSec - sleepSec
// → [{ name: "TFT", value }, { name: "Free", value }, { name: "Sleep", value }]
```

---

## Games Per Day Bar Chart (`app/stats/[category]/page.tsx` — games only)

Horizontal bar chart showing each player's daily game rate. Only rendered for the `games` category via `extraChart.type: "bar"`.

```
Component:    BarChart layout="vertical" > Bar
Height:       dynamic (rows × 44 + 24, min 120px)
Bar color:    per-player, using getLeaderboardColor gradient (gold 1st → slate last)
Labels:       LabelList position="right", formatted as "X.X/day"
Grid:         CartesianGrid vertical only
X domain:     [0, ceil(max / 1) * 1] rounded to nearest integer
```

---

## Design Conventions Across All Charts

1. **No axis lines or tick lines** — use `axisLine={false} tickLine={false}` on both axes. The grid provides visual reference instead.
2. **Tick font**: always `{ fill: neutral200, fontSize: parseInt(fontSize.xs), fontFamily: "Space Grotesk" }` via the `CHART` constants block — uses theme tokens, not hardcoded values.
3. **Horizontal-only grid**: `<CartesianGrid vertical={false}>` keeps charts uncluttered.
4. **`connectNulls`**: enabled on all lines so gaps (days with no data) don't break the line.
5. **`isAnimationActive={false}`**: disabled on RankChart to prevent re-animation when dot functions recreate on render.
6. **Responsive height**: `ChartContainer` is a styled div with a fixed height, not a `%` on `ResponsiveContainer` — this avoids the Recharts "height 0" bug when the parent doesn't have an explicit height.
7. **No Recharts `Legend` component**: player identity in RankChart is conveyed by a custom `LegendChip` row rendered below the chart (outside Recharts). This is necessary because Recharts `Legend` doesn't support CSS media queries or container queries.
8. **Gold accent for focus/hover**: bar chart fills and interactive focus highlights use the gold accent color (`CHART.accent` / `theme.semantic.color.accent`). Donut `activeShape` strokes use a dark gap (`rgba(12, 20, 30, 0.7)`) to separate the expanded segment from its neighbors — not gold.
