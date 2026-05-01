# Frontend Design

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | styled-components + ThemeProvider | latest |
| Charts | Recharts | 3.8.1 |
| Icons | lucide-react | 1.11.0 |
| Animation | motion (Framer Motion) | 12.x |

## File Structure

```
app/
├── layout.tsx              Root layout (SSR). Wraps children in StyledComponentsRegistry + NavigationShell.
├── globals.css             Minimal CSS: resets, font imports, body background, scrollbar, keyframes.
├── page.tsx                Home page (client component).
├── players/
│   └── page.tsx            Manage Players page (client component).
├── stats/
│   └── [category]/
│       └── page.tsx        Stat drilldown: per-player donut (games/playtime) or gauge (rates) + ranked table.
│                           Categories: games | playtime | top4-rate | win-rate
└── api/                    (see BACKEND.md)

components/
├── GlassCard.tsx           Glassmorphic card with motion animation. Accepts title, icon, headerAction.
├── Sidebar.tsx             Desktop sidebar with nav links. Uses Next.js Link + usePathname.
├── BottomNav.tsx           Mobile bottom nav. Same logic as Sidebar.
├── NavigationShell.tsx     Layout shell: Sidebar + main content area + BottomNav.
├── ViewToggle.tsx          Generic icon-button toggle for switching between named views (table/card/…).
├── PlayerTable.tsx         Thin shell: calls usePlayerRows, manages view state, renders ViewToggle + active view.
├── PlayerTableView.tsx     Table view for player stats — <table> with sortable headers.
├── PlayerCardView.tsx      Card view for player stats — CSS Grid, auto-fill columns, each player a card.
├── PlaytimeDisplay.tsx     Reusable playtime formatter with portal tooltip. Three variants: full, hours, short.
└── RankChart.tsx           Recharts LineChart. Y-axis tick tooltips via portal. Props: hideLegend, lineColors.

hooks/
└── usePlayerRows.ts        Data + sort logic for player stats. Returns sortedRows, sortKey, sortDir, toggleSort.

styles/
├── tokens.ts              Three-layer design token system (primitive → semantic → component).
├── theme.ts               Exports `theme` object combining all token layers.
├── styled.d.ts            TypeScript augmentation for DefaultTheme.
└── StyledComponentsRegistry.tsx  SSR-compatible styled-components setup for App Router.

lib/
├── utils.ts               Formatters: formatPlaytime/Hours/Short/Full, formatRank, getSetWeeks, percentOf.
├── mock.ts                Mock data for local dev (activated when KV_REST_API_URL is absent).
├── riot.ts                (see BACKEND.md)
└── kv.ts                  (see BACKEND.md)
```

## Rendering Strategy

- `layout.tsx` is a **server component** (default). It renders the HTML shell, imports global CSS, and wraps children in `StyledComponentsRegistry`.
- `page.tsx` and `players/page.tsx` are **client components** (`"use client"`). They fetch data client-side via `useEffect` and manage state with `useState`.
- API routes are server-only (Vercel serverless functions).

## Component Architecture

### NavigationShell
Persistent layout wrapper. Renders:
- `Sidebar` (hidden below 768px)
- `<main>` content area (margin-left on desktop to clear sidebar)
- `BottomNav` (hidden above 768px)

### GlassCard
The primary UI container. Props:
- `children` — card content
- `title?` — uppercase label in the header
- `icon?` — Lucide icon component, rendered gold in the header
- `headerAction?` — ReactNode for the right side of the header (e.g. sync badge, toggle)
- `style?` — CSSProperties for overrides

Card padding is 16px on mobile, switching to the `glassCard.padding` token (24px) at the `md` breakpoint. The header uses `flex-wrap: wrap` so long titles and `headerAction` elements reflow naturally on narrow screens.

Wraps content in a `motion.div` with fade-in + slide-up (16px) animation on mount.

### PlayerTable (shell)
Receives `{ players, selectedTab, weeks }` — fully controlled by page.tsx. Internally:
1. Calls `usePlayerRows(players, selectedTab, weeks)` to get sorted rows and sort state
2. Manages `view: "table" | "card"` state
3. Renders a `ViewToggle` as the `GlassCard` `headerAction`
4. Delegates rendering to `PlayerTableView` (table) or `PlayerCardView` (card)
5. No internal tab state or tab bar

### usePlayerRows
The data layer behind PlayerTable. Computes `PlayerRowData[]` from raw player input, manages `sortKey`/`sortDir` state, and returns `sortedRows`. Default sort: `rankLP` descending (highest rank first). All row derivation (LP conversion, scoped match filtering, rate calculations) lives here — not in the view components.

Time fields are exposed as raw seconds (`totalDurationSec`, `scopedDurationSec`) — **not** pre-formatted strings. View components pass these to `<PlaytimeDisplay>` and choose the appropriate variant. `timeNum` (used for sorting) is the same value as the active duration field.

### PlaytimeDisplay
Reusable component for rendering playtime with a portal tooltip showing the most precise format on hover. Suppresses the tooltip on touch-only devices (`window.matchMedia('(hover: none)')`).

```tsx
<PlaytimeDisplay seconds={row.scopedDurationSec} variant="hours" />
```

**Variants and where each is used**:

| Variant | Format | Used in |
|---------|--------|---------|
| `"full"` | `1d 23h 24m` | Player page stat card, squad playtime (main page) |
| `"hours"` | `72h 24m` | Table view TIME column, card view TIME stat |
| `"short"` | `72h` | (available; not currently used in production) |

Tooltip always shows `formatPlaytimeFull` output (`1d 23h 24m 30s` with seconds). Portal renders to `document.body` to escape any clipping context.

### ViewToggle
Generic component. Takes `views: { id, icon, label? }[]`, `value`, and `onChange`. Renders a pill-shaped group of icon buttons inside a dimmed background. Active button gets a glass-card background + accent color. Designed to sit in `GlassCard`'s `headerAction`. Import once and use across any table that needs a view switcher.

### PlayerTableView / PlayerCardView
Presentational only — receive `rows`, sort state, and `isSet`; no data fetching or computation.
- `PlayerTableView`: semantic `<table>` with sortable `<th>` elements, bleed scroll wrapper, rank emblems, profile icons
- `PlayerCardView`: `display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`. Each card links to the player drilldown. Shows avatar, rank, and four stats (games, top4%, 1st%, time).

### RankChart
Receives `{ players, selectedTab, weeks }` — fully controlled by page.tsx. Internally:
1. Derives `isSet = selectedTab === "set"` and `currentWeek = weeks[selectedTab]`
2. **Week tab**: merges all matches for `currentWeek` into a chronological timeline, plots actual placement per game
3. **"This Set" tab**: groups matches by set-week bucket, computes avg placement per player per week
4. Renders a Recharts `LineChart` with one `Line` per player; Y-axis reversed (1st at top), domain [1,8]
5. No internal tab state or tab bar — mode is fully controlled by the parent

**Note**: Recharts `Legend` doesn't support CSS media queries. Use the JS resize-listener pattern (not CSS) to hide the legend on mobile.

See `docs/DATA_VIZ.md` for full chart spec.

## State Management

No global state library. Each page manages its own state:

### Weekly Stats
```
players: PlayerData[]          — fetched from /api/players on mount
loading: boolean               — true until first fetch completes
syncing: boolean               — true while /api/sync is in flight
selectedTab: "set" | number    — controls summary cards, PlayerTable, and RankChart simultaneously
weeks: SetWeek[]               — computed once from getSetWeeks(), passed to both child components
```

### Manage Players
```
players: PlayerData[]     — fetched from /api/players on mount
gameName: string          — controlled input
tagLine: string           — controlled input
adding: boolean           — true while adding a player
syncing: boolean          — true while syncing
seeding: boolean          — true while seeding original squad
error: string             — validation/API error message
```

## Styling Conventions

1. **All visual values come from the theme** — no hardcoded colors or sizes in components except for Recharts props (which don't accept theme functions).
2. **Styled components are defined above the React component** in the same file, grouped under a `// ── Styled ──` comment.
3. **Transient props** use the `$prefix` convention (e.g. `$active`, `$elite`, `$spinning`) to prevent DOM forwarding.
4. **No CSS classes or className** — everything is styled-components except `globals.css` (resets + keyframes).
5. **Responsive**: mobile-first. Base styles target mobile; `@media (min-width: md)` adds desktop layout. Additional breakpoints used: `640px` (stats grid), `540px` (drilldown stat cards).
6. **Horizontal scroll containers**: use the negative-margin bleed technique to extend a scrollable area to card edges while preserving trailing scroll padding:
   ```css
   margin-left: -${spacing.md}; margin-right: -${spacing.md};
   padding-left: ${spacing.md}; padding-right: ${spacing.md};
   ```
7. **Hover-only interactions**: wrap `transform`, `opacity`, and other hover effects in `@media (hover: hover)` so they don't trigger on touch devices. For elements that are hidden until hover (e.g. delete button), provide a fallback visible state under `@media (hover: none)`. For portal tooltips driven by JS, check `window.matchMedia('(hover: none)').matches` in the `onMouseEnter` handler and bail early rather than relying solely on CSS.
8. **Touch tap targets**: interactive elements should be at least 44×44px on interactive controls; tab buttons are compact (no min-height) but the full-width sticky strip provides adequate touch area.

## Local Development / Mock Data

When `KV_REST_API_URL` is not set, `lib/mock.ts` provides fake data so the app is fully interactive without a Redis connection. `isMockMode()` returns `true` in this case. API routes that read player data call `isMockMode()` and return `MOCK_PLAYERS` or `getMockPlayer(puuid)` instead of hitting Redis.

Mock data covers all 10 rank tiers (one player per tier). Mock puuids follow the pattern `mock-puuid-{name}`: `mock-puuid-richardpression` (Challenger), `mock-puuid-firelordappa` (Grandmaster), `mock-puuid-caramelpapi` (Master), `mock-puuid-banh` (Diamond), `mock-puuid-vtaehyung` (Emerald), `mock-puuid-demure` (Platinum), `mock-puuid-lionnel` (Gold), `mock-puuid-nisca` (Silver), `mock-puuid-goldeen` (Bronze), `mock-puuid-mrbonchen` (Iron).

## Adding a New Component

1. Create `components/NewComponent.tsx`
2. Add `"use client"` directive at top
3. Import `styled` from `styled-components`
4. Define styled elements using theme tokens: `${({ theme }) => theme.semantic.color.accent}`
5. Define the React component below the styled definitions
6. For interactive states, use transient props: `<Wrapper $active={isActive}>`

## Adding a New Page

1. Create `app/newpage/page.tsx` with `"use client"` directive
2. Add a nav entry in both `Sidebar.tsx` and `BottomNav.tsx` (add icon + href + label to `navItems`)
3. Page automatically inherits the `NavigationShell` layout from `layout.tsx`
