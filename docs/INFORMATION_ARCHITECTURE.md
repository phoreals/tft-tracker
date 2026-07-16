# Information Architecture

## Site Map

```
/                          Weekly Stats (main view)
  ├── Subtitle set tag     Low-emphasis tag in the subtitle; opens set dropdown (Current / Archived)
  ├── Tab bar (sticky)     "Set N" | Week 1 … Week N (controls all below)
  ├── Superlatives         6 cards: leader per stat category (tab-scoped)
  ├── Player table         Per-player stats (tab-scoped columns)
  ├── Rank chart           Line chart (tab-driven mode)
  └── Summary cards        Games, playtime, top 4 rate (tab-scoped)

/players                   Manage Players
  ├── Add summoner form    Riot ID + Tagline input
  ├── Capacity indicator   X/10 progress bar
  ├── Seed squad button    (conditional, only when empty)
  └── Tracked player list  Cards with rank, W/L, delete

/stats/[category]          Stat Drilldown (6 categories)
  ├── Tab bar (sticky)     Set 17 | Week 1 … Week N
  ├── Category pills       games, playtime, top4-rate, win-rate, highest-lp, best-lp-per-game
  ├── Chart                Donut (share cats), Gauge (rate cats), or none (LP cats)
  ├── Rankings table       Sortable: #, Summoner, Value + inline bar, % share
  └── Period chart         (playtime only) horizontal bar: % of period in TFT

/player/[puuid]            Player Drilldown
  ├── Tab bar (sticky)     "Set 17" | Week 1 … Week N
  ├── Header               Profile icon, name, rank badge with emblem
  ├── Stat cards (6)       Games, Top 4 Rate, Win Rate, Time Played, LP Gain, LP/Game
  ├── Superlative badges   Pill badges for categories this player leads (links to /stats/)
  ├── Rank over time       Full history line chart, selected week highlighted
  ├── Placement chart      Per-game placement line chart (tab-scoped)
  └── Match history        Scrollable list, newest first
```

## Sets (Seasons)

The app tracks multiple TFT sets. The `SETS` registry in `lib/utils.ts` lists each
set as `{ number, label, start, end }`. The **active set** is derived from today's
date (`getActiveSet`) — the latest set whose start has passed. When a new set's
start date arrives, it becomes active automatically with no code change; the
previous set becomes a frozen, browsable **archive**.

- **Identity is cross-set**; the per-set facets (current / history / matches) are
  stored under set-namespaced Redis keys, so an archived set is never overwritten.
- The **global set switcher** (`?set=` URL param, `useSelectedSet`) chooses which
  set is viewed; it persists across all pages. It is rendered as a low-emphasis
  **tag in the page subtitle** (`SetTag`) — a rarely-used control — and becomes an
  interactive dropdown only once more than one set is browsable (`getBrowsableSets`
  — sets whose start has passed); otherwise it's a static pill.
- Selecting an archived set hides live affordances (Sync) and de-emphasizes the
  whole view: the set tag and every period pill (`DurationPill`) dim to muted grey
  (via `data-archived` on the page root).

## Data Hierarchy

### Primary Entity: Player
A player is identified by their Riot `puuid`. Identity is cross-set; the other
three facets are stored and read per set:

```
Player (TrackedPlayer)
├── Identity:  gameName, tagLine, puuid, summonerId, region   (cross-set)
├── Current:   tier, rank, lp, wins, losses, lastUpdated       (per set)
├── History:   [{ date, tier, rank, lp, wins, losses }]        (per set, daily snapshots)
└── Matches:   [{ matchId, placement, duration, timestamp, setNumber, ranked?, lastRound?, gameType? }]  (per set)
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
Weeks are calculated per viewed set from that set's start date in 7-day increments through its end. `getSetWeeks(set)` and `getCurrentSetWeek(set)` in `lib/utils.ts` take a `TftSet` (defaulting to the active set). For the active set the list stops at the current week; for a finished/archived set every week through set end is returned. To add a new set, append an entry to the `SETS` registry in `lib/utils.ts` — do not edit scalar constants.

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
| `/?set=&tab=` | Weekly Stats | `GET /api/players?set=N` (all player data for set N) |
| `/players` | Manage Players | `GET /api/players` (player list only; roster is cross-set) |
| `/stats/[category]?set=&tab=` | Stat Drilldown | `GET /api/players?set=N` (all players, ranked by stat) |
| `/player/[puuid]?set=&tab=` | Player Drilldown | `GET /api/players?set=N` (filtered client-side by puuid) |

Two URL params carry view state and persist across navigation: `?set=` (which set, `useSelectedSet`) and `?tab=` (`"set"` = whole set, or a week index, `useSelectedTab`). Both are omitted/normalized when unset. Unknown or not-yet-started `?set=` values fall back to the active set; out-of-range `?tab=` values fall back to the whole-set overview. Switching sets resets `?tab=` to `"set"`.

The Weekly Stats and Manage Players pages fetch the same endpoint. The Player Drilldown page also fetches all players and filters to the one matching the URL `puuid` parameter — there is no per-player list endpoint (though `GET /api/players/[puuid]?set=N` exists for parity). `GET /api/players` reads the requested set's namespace, so an archived set returns its frozen snapshot.

## Empty States

| Context | Message | Action |
|---------|---------|--------|
| No players in table | "No players tracked yet. Add players to get started." | Navigate to /players |
| No players in list | "No players tracked yet. Add a summoner to get started." | Use add form or seed |
| No chart history | "No history data yet. Sync to start tracking." | Click Sync Now |
| Empty archive / new set day one | Standard empty states ("No data for this time period", etc.) | Sync (active set) or switch set |
| Seed card | Shows original squad names | Click "Load Original Squad" |

## Data Freshness

| Source | Frequency | Trigger |
|--------|-----------|---------|
| Riot API → Redis | Daily (cron) | `GET /api/cron` via Vercel Cron |
| Riot API → Redis | On-demand | User clicks "Sync Now" → `POST /api/sync` |
| Riot API → Redis | On add | `POST /api/players` fetches initial data |
| Redis → Client | On page load | `GET /api/players` in `useEffect` |
| Redis → Client | After sync/add | Re-fetch via same endpoint |

There is no real-time push or polling. Data is as fresh as the last sync. Sync always writes to the **active** set's namespace, so once a set ends its data is frozen — archived sets never change and their views omit freshness/relative-time affordances.
