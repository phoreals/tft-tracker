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
Height:       260px mobile / 360px desktop (ChartContainer styled div)
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

No in-chart labels or profile picture dots. Player identity is conveyed by a **legend row** below the chart:
- One `LegendChip` button per player with an 8px colored circle swatch + `gameName`
- Click a chip to **solo** that player (hides all others); click again to show all; "Show all" chip appears when any are hidden
- First click on a chip when all are visible hides every other player (solo mode), not just a toggle
- Hidden chips render at 35% opacity; a "Show all" button appears when any players are hidden

### Hover Highlight

Hovering a `<Line>` sets that player as `hoveredPlayer`:
- Hovered line: `strokeWidth=2.5`, `strokeOpacity=1`
- Other lines: `strokeWidth=1`, `strokeOpacity=0.2`
- State is tracked in both React state (`hoveredPlayer`) and a ref (`hoveredPlayerRef`) for use inside the tooltip render closure

### Color Assignment

Lines cycle through `LINE_COLORS` (10 values) by player index. Colors are chosen to avoid rank-tier hues (no gold/green/teal/purple):

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

## Placement Per Game (`app/player/[puuid]/page.tsx`)

Shown on the individual player drilldown page. Plots **all stored matches** for one player (not filtered by the selected week tab).

### Chart Configuration

```
Component:    ScatterChart > Scatter
Container:    ResponsiveContainer width="100%" height="100%"
Height:       220px mobile / 320px desktop (ChartContainer styled div)
Y-axis:       reversed, domain [0.5, 8.5], ticks [1..8] formatted as ordinals (1st/2nd…), width 36px
X-axis:       dataKey="game" (integer index, 1-based), type="number", label "Game #"
Grid:         CartesianGrid horizontal only
Reference:    ReferenceLine y=4.5 — top-4 boundary
Margin:       top: 16, right: 16, bottom: 0, left: 4
```

### Dots

Each dot is a `<circle r=5>` rendered via a custom `shape` prop:
- **Gold** (`gold300`, opacity 0.9): placement ≤ 4 (top 4)
- **Grid color** (opacity 0.6): placement 5–8

Domain `[0.5, 8.5]` (not `[1, 8]`) prevents Recharts from clipping 1st and 8th place ticks at the axis boundary.

### Data Transform

All matches sorted oldest-first. For each match at index `i`:
```ts
{ game: i + 1, placement: match.placement, date: "M/D" }
```

### Custom Tooltip

Rendered via Recharts `content` prop (not a portal). Shows:
- Label: `Game {n} · M/D`
- Ordinal placement (e.g. `3rd`), colored gold if top 4

---

## Design Conventions Across All Charts

1. **No axis lines or tick lines** — use `axisLine={false} tickLine={false}` on both axes. The grid provides visual reference instead.
2. **Tick font**: always `{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }`. These are hardcoded — Recharts tick props don't access theme.
3. **Horizontal-only grid**: `<CartesianGrid vertical={false}>` keeps charts uncluttered.
4. **`connectNulls`**: enabled on all lines so gaps (days with no data) don't break the line.
5. **`isAnimationActive={false}`**: disabled on RankChart to prevent re-animation when dot functions recreate on render.
6. **Responsive height**: `ChartContainer` is a styled div with a fixed height, not a `%` on `ResponsiveContainer` — this avoids the Recharts "height 0" bug when the parent doesn't have an explicit height.
7. **No Legend in RankChart**: player identity is conveyed by profile picture endpoint labels. No `showLegend` state or `Legend` component.
