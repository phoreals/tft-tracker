# TFT Squad Tracker

Track your Teamfight Tactics squad's ranked performance, match history, and rank progression over time. Built for a group of 5-10 friends.

## What It Does

- **Weekly Stats** (main view): games played, playtime, top-4 rate, 1st-place rate per player
- **Rank tracking**: current rank + historical rank-over-time line chart (weekly & all-time)
- **Player management**: add/remove players by Riot ID, seed original squad in one click
- **Auto-sync**: Vercel Cron fetches fresh data from the Riot TFT API daily

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) on Vercel |
| Frontend | React 19, styled-components, Recharts, Motion |
| Backend | Next.js API Routes (Vercel serverless functions) |
| Database | Upstash Redis (free tier) |
| External API | Riot Games TFT API (personal key) |

## Quick Start

```bash
cp .env.example .env.local    # fill in your keys
npm install
npm run dev                    # http://localhost:3000
```

See [CHANGES.md](CHANGES.md) for deploy steps (Riot API key, Upstash Redis, Vercel).

## Documentation

Detailed design docs for continuing development:

| Document | Contents |
|----------|----------|
| [docs/UX.md](docs/UX.md) | Page flows, interaction states, data refresh model, empty states |
| [docs/VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md) | Hextech theme, design token architecture (primitive/semantic/component), color usage, typography scale, animation |
| [docs/INFORMATION_ARCHITECTURE.md](docs/INFORMATION_ARCHITECTURE.md) | Site map, data hierarchy, derived metrics, content priority, navigation model |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Component architecture, file structure, rendering strategy, state management, styling conventions, how to add pages/components |
| [docs/BACKEND.md](docs/BACKEND.md) | API routes, Riot API client, Redis key schema, data types, environment variables, error handling, extending |
| [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | Current a11y state, known issues, recommendations |
| [CHANGES.md](CHANGES.md) | Changelog, architecture overview, full deploy guide |

## Project Structure

```
app/
├── layout.tsx                 Root layout (StyledComponentsRegistry + NavigationShell)
├── globals.css                Resets, fonts, body background, keyframes
├── page.tsx                   Weekly Stats page
├── players/page.tsx           Manage Players page
└── api/
    ├── players/route.ts       GET/POST players
    ├── players/[puuid]/route.ts  DELETE player
    ├── sync/route.ts          POST sync all players
    ├── seed/route.ts          POST seed original squad
    └── cron/route.ts          GET Vercel Cron trigger

components/
├── GlassCard.tsx              Glassmorphic card container
├── Sidebar.tsx                Desktop navigation
├── BottomNav.tsx              Mobile navigation
├── NavigationShell.tsx        Layout shell
├── PlayerTable.tsx            Performance stats table
└── RankChart.tsx              Rank-over-time line chart

styles/
├── tokens.ts                  Design tokens (primitive → semantic → component)
├── theme.ts                   Theme object for ThemeProvider
├── styled.d.ts                TypeScript theme augmentation
└── StyledComponentsRegistry.tsx  SSR setup for App Router

lib/
├── riot.ts                    Riot TFT API client
├── kv.ts                      Upstash Redis data access
└── utils.ts                   Formatters (playtime, rank, dates)
```
