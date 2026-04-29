# TFT Squad Tracker — Changes & Deploy Guide

## Overview

Rebuilt tft-tracker from a static hardcoded dashboard into a live TFT performance tracker powered by the Riot Games API. Visual design cherry-picked from tft-tracker-alt's Hextech glassmorphism theme.

## Architecture

```
Next.js 16 on Vercel
├── Frontend: React 19 + Tailwind CSS + Hextech theme + Recharts + Motion
├── Backend: Next.js API routes (Vercel serverless functions)
├── Storage: Upstash Redis (free tier — 256MB, 10K commands/day)
├── Data Refresh: Vercel Cron (daily at midnight UTC) + manual sync button
└── Riot API: Proxied through API routes (key stays server-side)
```

## What Changed

### Removed
- `Dashboard.module.css`, `page.module.css` — replaced by Tailwind + Hextech theme
- `app/api/updateStats/route.js` — replaced by new API routes
- Hardcoded player data — replaced by Riot API + Redis persistence
- Geist fonts — replaced by Space Grotesk + Manrope

### Added — Frontend

| File | Purpose |
|------|---------|
| `app/globals.css` | Hextech theme: gold/cyan palette, glassmorphism, custom scrollbar, typography |
| `app/layout.tsx` | Root layout with NavigationShell wrapper |
| `app/page.tsx` | **Weekly Stats** (main view) — summary cards, player table, rank chart |
| `app/players/page.tsx` | **Manage Players** — add/remove players, capacity indicator, sync button |
| `components/GlassCard.tsx` | Reusable glassmorphic card with motion animations |
| `components/Sidebar.tsx` | Desktop sidebar navigation (Weekly Stats, Manage Players) |
| `components/BottomNav.tsx` | Mobile bottom navigation |
| `components/NavigationShell.tsx` | Layout shell combining Sidebar + BottomNav |
| `components/PlayerTable.tsx` | Performance table: name, rank, games, top 4%, 1st%, time played |
| `components/RankChart.tsx` | Rank-over-time line chart (weekly / all-time toggle) |
| `postcss.config.mjs` | Tailwind CSS PostCSS configuration |

### Added — Backend

| File | Purpose |
|------|---------|
| `lib/riot.ts` | Riot TFT API client — account lookup, summoner, league, match history |
| `lib/kv.ts` | Upstash Redis helpers — player CRUD, rank history, match records |
| `lib/utils.ts` | Formatters (playtime, rank display, cn utility) |
| `app/api/players/route.ts` | `GET` list all players with stats; `POST` add player by Riot ID |
| `app/api/players/[puuid]/route.ts` | `DELETE` remove a tracked player |
| `app/api/sync/route.ts` | `POST` fetch fresh data from Riot API for all tracked players |
| `app/api/cron/route.ts` | `GET` Vercel Cron endpoint (daily sync, secured with CRON_SECRET) |

### Added — Config

| File | Purpose |
|------|---------|
| `vercel.json` | Cron job schedule (daily at midnight UTC) |
| `.env.example` | Environment variable template |

### Design System (`styles/`)

| File | Purpose |
|------|---------|
| `styles/tokens.ts` | Three-layer token system: **primitive** (raw values) → **semantic** (UI roles) → **component** (pre-composed patterns) |
| `styles/theme.ts` | Exports unified theme object for styled-components ThemeProvider |
| `styles/styled.d.ts` | TypeScript module augmentation for DefaultTheme |
| `styles/StyledComponentsRegistry.tsx` | SSR-compatible registry for Next.js App Router |

### Dependencies Added

- `styled-components` — CSS-in-JS with ThemeProvider design system
- `motion` — page/card animations
- `@upstash/redis` — Redis client for data persistence

### Dependencies Kept

- `next`, `react`, `react-dom` — framework
- `recharts` — charts
- `lucide-react` — icons

## Riot TFT API Endpoints Used

| Endpoint | Routing | Returns |
|----------|---------|---------|
| `/riot/account/v1/accounts/by-riot-id/{name}/{tag}` | americas | puuid |
| `/lol/summoner/v1/summoners/by-puuid/{puuid}` | na1 | encrypted summoner ID |
| `/tft/league/v1/entries/by-summoner/{summonerId}` | na1 | tier, rank, LP, wins, losses |
| `/tft/match/v1/matches/by-puuid/{puuid}/ids` | americas | match ID list |
| `/tft/match/v1/matches/{matchId}` | americas | placement, duration, timestamp |

Personal API key rate limits: 20 req/s, 100 req/2min.

**Note**: The TFT summoner endpoint (`/tft/summoner/v1/`) no longer returns the encrypted summoner ID. We use the LoL summoner endpoint instead — the ID is shared across games.

## Data Model (Redis)

```
players                  → Set of puuids being tracked
player:{puuid}           → { gameName, tagLine, puuid, summonerId, region }
player:{puuid}:current   → { tier, rank, lp, wins, losses, lastUpdated }
player:{puuid}:history   → [ { date, tier, rank, lp, wins, losses } ]  (daily snapshots, max 365)
player:{puuid}:matches   → [ { matchId, placement, duration, timestamp } ]  (max 100)
```

## Deploy Steps

### 1. Get a Riot API Key

1. Go to https://developer.riotgames.com
2. Register a product and request a **Personal API Key**
3. Copy the key — you'll need it for the `RIOT_API_KEY` env var

### 2. Set Up Upstash Redis

**Option A — Via Vercel Marketplace (easiest):**
1. Go to https://vercel.com/marketplace and search for "Upstash Redis"
2. Install the integration — it auto-creates a Redis database and sets `KV_REST_API_URL` + `KV_REST_API_TOKEN` in your Vercel project

**Option B — Directly on Upstash:**
1. Go to https://console.upstash.com
2. Create a new Redis database (free tier)
3. Copy the **REST URL** and **REST Token** from the database details page

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# From the tft-tracker directory
vercel
```

### 4. Set Environment Variables

In the Vercel dashboard (Settings → Environment Variables), add:

| Variable | Value |
|----------|-------|
| `RIOT_API_KEY` | Your Riot personal API key |
| `KV_REST_API_URL` | Upstash Redis REST URL (auto-set if using Vercel integration) |
| `KV_REST_API_TOKEN` | Upstash Redis REST token (auto-set if using Vercel integration) |
| `CRON_SECRET` | A random secret string (generate with `openssl rand -hex 32`) |

### 5. Redeploy

After setting env vars, trigger a redeploy:

```bash
vercel --prod
```

### 6. Verify

1. Visit your deployment URL — you should see the Weekly Stats page (empty)
2. Navigate to **Manage Players** and add a player by Riot ID + Tagline
3. The player should appear with their current rank and match history
4. Click **Sync Now** to refresh data on demand
5. The Vercel Cron job runs daily at midnight UTC to auto-sync

## Local Development

```bash
# Copy env template
cp .env.example .env.local

# Fill in your keys in .env.local

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000 to view the app.
