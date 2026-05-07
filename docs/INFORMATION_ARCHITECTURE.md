# Information Architecture

## Site Map

```
/                          Weekly Stats (main view)
  ├── Tab bar (sticky)     "Set 17" | Week 1 … Week N (controls all below)
  ├── Superlatives         6 cards: leader per stat category (tab-scoped)
  ├── Player table         Per-player stats (tab-scoped columns)
  ├── Rank chart           Line chart (tab-driven mode)
  └── Summary cards        Games, playtime, top 4 rate (tab-scoped)

/players                   Manage Players
  ├── Add summoner form    Riot ID + Tagline input
  ├── Capacity indicator   X/10 progress bar
  ├── Seed squad button    (conditional, only when empty)
  └── Tracked player list  Cards with rank, W/L, delete

/superlative/[category]    Superlative Drilldown
  ├── Tab bar (sticky)     Set 17 | Week 1 … Week N
  ├── Bar chart            Horizontal bars, all players ranked by stat
  └── Rankings table       #, Summoner, Value + progress bar

/player/[puuid]            Player Drilldown
  ├── Tab bar (sticky)     "Set 17" | Week 1 … Week N
  ├── Header               Profile icon, name, rank badge with emblem
  ├── Stat cards (6)       Games, Top 4 Rate, Win Rate, Time Played, LP Gain, LP/Game
  ├── Superlative badges   Pill badges for categories this player leads (links to /)
  ├── Rank over time       Full history line chart, selected week highlighted
  ├── Placement chart      Per-game placement line chart (tab-scoped)
  └── Match history        Scrollable list, newest first
```

## Data Hierarchy

### Primary Entity: Player
A player is identified by their Riot `puuid` and has three data facets:

```
Player (TrackedPlayer)
├── Identity:  gameName, tagLine, puuid, summonerId, region
├── Current:   tier, rank, lp, wins, losses, lastUpdated
├── History:   [{ date, tier, rank, lp, wins, losses }]  (daily snapshots)
└── Matches:   [{ matchId, placement, duration, timestamp }]  (last 200, fetches 100 per sync)
```

### Derived Metrics (computed client-side)
These are NOT stored — they're calculated from matches on render:

| Metric | Derivation |
|--------|------------|
| Total games | `matches.length` |
| Games this week | `matches.filter(m => m.timestamp >= mondayEpoch).length` |
| Top 4 rate | `matches.filter(m => m.placement <= 4).length / total * 100` |
| 1st place rate | `matches.filter(m => m.placement === 1).length / total * 100` |
| Time played (weekly) | `weeklyMatches.reduce(sum, m.duration)` |
| Time played (total) | `allMatches.reduce(sum, m.duration)` |
| Rank numeric value | `RANK_VALUES[tier] + DIVISION_VALUES[rank] + lp` |

### Week Boundary
Weeks are calculated from the TFT set start date (April 15, 2026) in 7-day increments through set end (July 29, 2026). Week 1 = Apr 15-21, Week 2 = Apr 22-28, etc. The current week is determined by `getCurrentSetWeek()` in `lib/utils.ts`. The `SET_START` and `SET_END` constants should be updated when a new TFT set launches.

## Content Priority

### Weekly Stats page — reading order:
1. **Page title + sync button** — orient user, allow refresh
2. **Three stat cards** — quick pulse check (games, time, top 4%)
3. **Player table** — detailed per-player breakdown (the core content)
4. **Rank chart** — trend visualization (secondary, scroll to view)

### Manage Players page — reading order:
1. **Page title + description** — explain the page's purpose
2. **Add form** (left column) — primary action
3. **Capacity bar** — constraint awareness
4. **Seed button** (conditional) — onboarding affordance
5. **Player list** (right column) — current roster with management actions

## Navigation Model

Simple flat structure — no nesting, no breadcrumbs needed.

- **Sidebar** (desktop >=768px): fixed left, collapses between 224px (expanded) and 56px (icon-only). Hovering on a collapsed sidebar expands it as an overlay without reflowing content. Double-clicking locks it open. A collapse button at the bottom toggles the permanent state.
- **Bottom nav** (mobile <768px): fixed bottom, 64px tall, two icons

Active state indicated by:
- Sidebar: gold background tint + right border bar
- Bottom nav: gold icon + label color

## URL Structure

| URL | Page | Data Source |
|-----|------|-------------|
| `/` | Weekly Stats | `GET /api/players` (all player data) |
| `/players` | Manage Players | `GET /api/players` (player list only) |
| `/superlative/[category]` | Superlative Drilldown | `GET /api/players` (all players, ranked by stat) |
| `/player/[puuid]` | Player Drilldown | `GET /api/players` (filtered client-side by puuid) |

The Weekly Stats and Manage Players pages fetch the same endpoint. The Player Drilldown page also fetches all players and filters to the one matching the URL `puuid` parameter — there is no per-player endpoint.

## Empty States

| Context | Message | Action |
|---------|---------|--------|
| No players in table | "No players tracked yet. Add players to get started." | Navigate to /players |
| No players in list | "No players tracked yet. Add a summoner to get started." | Use add form or seed |
| No chart history | "No history data yet. Sync to start tracking." | Click Sync Now |
| Seed card | Shows original squad names | Click "Load Original Squad" |

## Data Freshness

| Source | Frequency | Trigger |
|--------|-----------|---------|
| Riot API → Redis | Daily (cron) | `GET /api/cron` via Vercel Cron |
| Riot API → Redis | On-demand | User clicks "Sync Now" → `POST /api/sync` |
| Riot API → Redis | On add | `POST /api/players` fetches initial data |
| Redis → Client | On page load | `GET /api/players` in `useEffect` |
| Redis → Client | After sync/add | Re-fetch via same endpoint |

There is no real-time push or polling. Data is as fresh as the last sync.
