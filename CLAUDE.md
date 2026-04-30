@AGENTS.md

# TFT Squad Tracker

A private TFT leaderboard for a friend group ("The Asylum"). Tracks ranked stats, match history, and superlatives for a fixed set of players.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router (client components, API routes as serverless functions) |
| Styling | styled-components + ThemeProvider (three-layer design token system) |
| Charts | Recharts |
| Icons | lucide-react |
| Database | Upstash Redis (REST via `@upstash/redis`) |
| External API | Riot Games TFT API (personal key) |
| Hosting | Vercel hobby plan |

## Documentation

All detailed specs live in `docs/`:

| File | Contents |
|------|----------|
| `docs/UX.md` | Pages, interactions, component behaviour |
| `docs/BACKEND.md` | API routes, Riot client, Redis schema |
| `docs/FRONTEND.md` | File structure, component architecture, styling conventions |
| `docs/VISUAL_DESIGN.md` | Design token system, theme, glassmorphism pattern |
| `docs/INFORMATION_ARCHITECTURE.md` | Data model, navigation structure |
| `docs/DATA_VIZ.md` | Chart specs |
| `docs/ACCESSIBILITY.md` | Contrast ratios, reduced motion, touch targets |

**Read the relevant doc before modifying a feature.** The docs are the source of truth for design intent.

## Key Conventions

### Styling
- All visual values come from the theme — `${({ theme }) => theme.semantic.color.accent}`. No hardcoded colors or sizes in components.
- Three-layer token system: **primitive → semantic → component**. Components reference semantic or component tokens only, never primitive directly.
- Styled components are defined above the React component in the same file, under a `// ── Styled ──` comment.
- Transient props use `$prefix` (e.g. `$active`, `$spinning`) to prevent DOM forwarding.
- Recharts props can't use theme functions — import `theme` from `@/styles/theme` directly and collect values into a `CHART` constants block at the top of the file.

### Data & State
- `lib/utils.ts` — shared formatters, rank utilities, set schedule constants, and superlative computation (`computePlayerStats`, `SUPERLATIVE_CATEGORIES`, `findLeader`).
- `SET_START`, `SET_END`, `SET_NUMBER`, `SET_LABEL` are defined in `lib/utils.ts`. Always use these constants — never hardcode dates or set numbers.
- All pages are client components that fetch from `/api/players` on mount. No server-side rendering of player data.
- Tab state (`selectedTab: "set" | number`) is the single source of truth for the active time window — all cards, tables, and charts derive from it.

### Mock Mode
- `lib/mock.ts` — when `KV_REST_API_URL` is absent AND `NODE_ENV !== "production"`, `isMockMode()` returns `true`. API routes return fake data instead of hitting Redis. Do not disable this guard.

## Build & Run

```bash
npm run dev        # local dev (mock data if no .env.local)
npx next build     # production build — run before committing
```

## Important Constraints

- **Vercel hobby plan**: serverless functions default to 10s timeout. `api/sync` and `api/cron` set `export const maxDuration = 60` to allow longer runs.
- **Match backfill**: sync fetches all Set 17 match IDs (paginated via `getAllMatchIds`) but processes only 30 new matches per player per run to stay within the timeout. Players with large history gaps need multiple sync runs.
- **Cron**: runs once daily at midnight UTC (`"0 0 * * *"`). Vercel hobby allows only 1 cron job.
- **Match storage**: `setPlayerMatches` in `lib/kv.ts` stores the full array with no trim. Match counts grow unbounded — monitor Redis storage usage as the set progresses.

## Docs Update Policy

Update the relevant `docs/` file on every commit that changes UX behaviour, API contracts, or visual design. The docs are read by future Claude sessions — keep them current.
