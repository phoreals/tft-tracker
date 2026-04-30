// ── Set Schedule ─────────────────────────────────────────────────

// SET_START is 2026-02-18 (10 weeks before Apr 29) so week tabs reach Wk 10 in local dev.
// Change back to 2026-04-15 when the actual set launches.
export const SET_START = new Date("2026-02-18T00:00:00").getTime();
export const SET_END = new Date("2026-07-29T23:59:59").getTime();
export const SET_NUMBER = 17;
export const SET_LABEL = `Set ${SET_NUMBER}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getCurrentSetWeek(): { label: string; start: number; end: number; weekNumber: number } {
  const now = Date.now();
  let start = SET_START;
  let i = 1;
  while (start + WEEK_MS <= now && start + WEEK_MS < SET_END) {
    start += WEEK_MS;
    i++;
  }
  return {
    label: `Week ${i}`,
    start,
    end: Math.min(start + WEEK_MS, SET_END),
    weekNumber: i,
  };
}

// Returns all past/current set-weeks (no future weeks).
export function getSetWeeks(): { label: string; start: number; end: number; weekNumber: number }[] {
  const weeks: { label: string; start: number; end: number; weekNumber: number }[] = [];
  let start = SET_START;
  let i = 1;
  const now = Date.now();
  while (start < SET_END && start <= now) {
    const end = Math.min(start + WEEK_MS, SET_END);
    weeks.push({ label: `Week ${i}`, start, end, weekNumber: i });
    start += WEEK_MS;
    i++;
  }
  return weeks;
}

// ── Rank Utilities ───────────────────────────────────────────────

const RANK_TIER_BASE: Record<string, number> = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200,
  PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400,
  MASTER: 2800, GRANDMASTER: 3200, CHALLENGER: 3600,
};

const RANK_DIV_OFFSET: Record<string, number> = {
  IV: 0, III: 100, II: 200, I: 300,
};

// Convert a tier+rank+LP combination into a single numeric value for comparisons.
export function rankToLP(tier: string, rank: string, lp: number): number {
  return (RANK_TIER_BASE[tier.toUpperCase()] ?? 0) + (RANK_DIV_OFFSET[rank.toUpperCase()] ?? 0) + lp;
}

const MASTER_PLUS = ["MASTER", "GRANDMASTER", "CHALLENGER"];

// Short display string for rank sub-lines, e.g. "Diamond II 47 LP" or "Master 185 LP".
export function formatRankShort(tier: string, rank: string, lp: number): string {
  const t = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  if (MASTER_PLUS.includes(tier.toUpperCase())) {
    return `${t} ${lp} LP`;
  }
  return `${t} ${rank} ${lp} LP`;
}

const TIER_ABBR: Record<string, string> = {
  IRON: "I", BRONZE: "B", SILVER: "S", GOLD: "G",
  PLATINUM: "P", EMERALD: "E", DIAMOND: "D",
  MASTER: "M", GRANDMASTER: "GM", CHALLENGER: "C",
};

const DIV_NUM: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };

// Compact rank abbreviation for tight spaces, e.g. "I4 30LP", "D2 47LP", "M 185LP".
export function formatRankAbbr(tier: string, rank: string, lp: number): string {
  const t = TIER_ABBR[tier.toUpperCase()] ?? tier[0];
  if (MASTER_PLUS.includes(tier.toUpperCase())) {
    return `${t} ${lp}LP`;
  }
  const d = DIV_NUM[rank.toUpperCase()] ?? rank;
  return `${t}${d} ${lp}LP`;
}

// ── Formatters ───────────────────────────────────────────────────

export function formatPlaytime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatRank(tier?: string, rank?: string, lp?: number): string {
  if (!tier) return "Unranked";
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  return `${t} ${rank ?? ""} ${lp != null ? `${lp} LP` : ""}`.trim();
}

export function percentOf(count: number, total: number): string {
  if (total === 0) return "0.0";
  return ((count / total) * 100).toFixed(1);
}

// ── Rank Colors ──────────────────────────────────────────────────
// Inspired by Riot's official rank imagery, tuned for readability on #0c141e.

export const RANK_COLORS: Record<string, string> = {
  IRON: "#9badb8",
  BRONZE: "#c8865a",
  SILVER: "#aabacb",
  GOLD: "#e5c587",
  PLATINUM: "#38d5c5",
  EMERALD: "#3dd490",
  DIAMOND: "#7ab5f5",
  MASTER: "#c084fc",
  GRANDMASTER: "#f07878",
  CHALLENGER: "#88e8f0",
};

export function getRankColor(tier?: string): string {
  if (!tier) return "rgba(208, 197, 181, 0.4)";
  return RANK_COLORS[tier.toUpperCase()] ?? "rgba(208, 197, 181, 0.4)";
}

// ── Superlative Stats ───────────────────────────────────────────

export interface PlayerStatInput {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  matches: { placement: number; duration: number; timestamp: number }[];
  history: { date: string; tier: string; rank: string; lp: number }[];
}

export interface PlayerStat {
  player: PlayerStatInput;
  games: number;
  firsts: number;
  top4Rate: number;
  time: number;
  lpDiff: number | null;
  lpPerGame: number | null;
}

export function computePlayerStats(
  players: PlayerStatInput[],
  window: { start: number; end: number },
): PlayerStat[] {
  return players.map((p) => {
    const scoped = p.matches.filter((m) => m.timestamp >= window.start && m.timestamp < window.end);
    const games = scoped.length;
    const firsts = scoped.filter((m) => m.placement === 1).length;
    const top4 = scoped.filter((m) => m.placement <= 4).length;
    const time = scoped.reduce((s, m) => s + m.duration, 0);
    const top4Rate = games > 0 ? (top4 / games) * 100 : 0;

    const snaps = p.history
      .filter((h) => {
        const t = new Date(h.date).getTime();
        return t >= window.start && t < window.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lpDiff =
      snaps.length >= 2
        ? rankToLP(snaps[snaps.length - 1].tier, snaps[snaps.length - 1].rank, snaps[snaps.length - 1].lp) -
          rankToLP(snaps[0].tier, snaps[0].rank, snaps[0].lp)
        : null;
    const lpPerGame = lpDiff !== null && games > 0 ? lpDiff / games : null;

    return { player: p, games, firsts, top4Rate, time, lpDiff, lpPerGame };
  });
}

export type SuperlativeCategory = {
  slug: string;
  label: string;
  key: keyof Pick<PlayerStat, "games" | "firsts" | "top4Rate" | "time" | "lpDiff" | "lpPerGame">;
  format: (v: number) => string;
  filter: (s: PlayerStat) => boolean;
};

export const SUPERLATIVE_CATEGORIES: SuperlativeCategory[] = [
  { slug: "most-games",       label: "Most Games",       key: "games",     format: (v) => String(v),                                      filter: (s) => s.games > 0 },
  { slug: "best-top4",        label: "Best Top 4%",      key: "top4Rate",  format: (v) => `${v.toFixed(1)}%`,                             filter: (s) => s.games > 0 },
  { slug: "most-wins",        label: "Most Wins",        key: "firsts",    format: (v) => String(v),                                      filter: (s) => s.firsts > 0 },
  { slug: "most-time",        label: "Most Time Played", key: "time",      format: (v) => formatPlaytime(v),                              filter: (s) => s.time > 0 },
  { slug: "highest-lp",       label: "Highest LP Gain",  key: "lpDiff",    format: (v) => `${v >= 0 ? "+" : ""}${v} LP`,                  filter: (s) => s.lpDiff !== null },
  { slug: "best-lp-per-game", label: "Best LP/Game",     key: "lpPerGame", format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} LP/game`,  filter: (s) => s.lpPerGame !== null },
];

export function findLeader(stats: PlayerStat[], cat: SuperlativeCategory): PlayerStat | null {
  const eligible = stats.filter(cat.filter);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cur) => {
    const bv = best[cat.key], cv = cur[cat.key];
    if (bv === null) return cur;
    if (cv === null) return best;
    if ((cv as number) > (bv as number)) return cur;
    if ((cv as number) === (bv as number) && cur.player.gameName < best.player.gameName) return cur;
    return best;
  });
}
