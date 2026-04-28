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
├── page.tsx                Weekly Stats page (client component).
├── players/
│   └── page.tsx            Manage Players page (client component).
└── api/                    (see BACKEND.md)

components/
├── GlassCard.tsx           Glassmorphic card with motion animation. Accepts title, icon, headerAction.
├── Sidebar.tsx             Desktop sidebar with nav links. Uses Next.js Link + usePathname.
├── BottomNav.tsx           Mobile bottom nav. Same logic as Sidebar.
├── NavigationShell.tsx     Layout shell: Sidebar + main content area + BottomNav.
├── PlayerTable.tsx         Stats table. Computes derived metrics from match data.
└── RankChart.tsx           Recharts LineChart with weekly/all-time toggle.

styles/
├── tokens.ts              Three-layer design token system (primitive → semantic → component).
├── theme.ts               Exports `theme` object combining all token layers.
├── styled.d.ts            TypeScript augmentation for DefaultTheme.
└── StyledComponentsRegistry.tsx  SSR-compatible styled-components setup for App Router.

lib/
├── utils.ts               Formatters: formatPlaytime, formatRank, getStartOfWeek, percentOf.
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
- `style?` — CSSProperties for overrides (e.g. `padding: 0` for tables)

Wraps content in a `motion.div` with fade-in + slide-up animation on mount.

### PlayerTable
Receives an array of `{ gameName, tagLine, current, matches }`. Internally:
1. Computes derived metrics for each player (total games, weekly games, top4%, 1st%, durations)
2. Renders a `<table>` inside a `GlassCard`
3. Uses styled components for all cells and states

### RankChart
Receives an array of `{ gameName, history }`. Internally:
1. Collects all unique dates across all players
2. Filters by view mode (weekly = last 7 days, alltime = no filter)
3. Converts each history snapshot to a numeric rank value
4. Renders a Recharts `LineChart` with one `Line` per player

Rank conversion: `RANK_VALUES[tier] + DIVISION_VALUES[division] + LP`
- Iron=0, Bronze=400, Silver=800, ..., Challenger=3600
- IV=0, III=100, II=200, I=300

## State Management

No global state library. Each page manages its own state:

### Weekly Stats
```
players: PlayerData[]     — fetched from /api/players on mount
loading: boolean          — true until first fetch completes
syncing: boolean          — true while /api/sync is in flight
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
5. **Responsive**: desktop-first is NOT used. Base styles target mobile; `@media (min-width: md)` adds desktop layout.

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
