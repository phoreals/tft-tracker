// ── Set Schedule ─────────────────────────────────────────────────

export const SET_START = new Date("2026-04-15T00:00:00").getTime();
export const SET_END = new Date("2026-07-29T23:59:59").getTime();
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
