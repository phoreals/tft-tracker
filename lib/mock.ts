// Local dev mock data — used when KV_REST_API_URL is not configured.

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function daysAgo(n: number) {
  return now - n * DAY;
}

// ── Mock players ─────────────────────────────────────────────────

export const MOCK_PLAYERS = [
  {
    puuid: "mock-puuid-banh",
    gameName: "Banh",
    tagLine: "boi",
    summonerId: "",
    region: "na1",
    current: {
      tier: "DIAMOND",
      rank: "II",
      lp: 47,
      wins: 82,
      losses: 68,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-banh", [
      { daysAgo: 1, h: 2, placement: 1, duration: 2640 },
      { daysAgo: 1, h: 5, placement: 3, duration: 2200 },
      { daysAgo: 2, h: 3, placement: 2, duration: 2450 },
      { daysAgo: 3, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 4, h: 4, placement: 1, duration: 2700 },
      { daysAgo: 5, h: 2, placement: 4, duration: 2300 },
      { daysAgo: 6, h: 6, placement: 2, duration: 2550 },
      { daysAgo: 7, h: 1, placement: 6, duration: 1800 },
      { daysAgo: 8, h: 3, placement: 3, duration: 2400 },
      { daysAgo: 9, h: 5, placement: 1, duration: 2800 },
      { daysAgo: 10, h: 2, placement: 7, duration: 1650 },
      { daysAgo: 11, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 12, h: 1, placement: 4, duration: 2350 },
      { daysAgo: 13, h: 3, placement: 1, duration: 2900 },
    ]),
    history: buildHistory([
      { daysAgo: 14, tier: "PLATINUM", rank: "I", lp: 80 },
      { daysAgo: 12, tier: "DIAMOND", rank: "IV", lp: 12 },
      { daysAgo: 10, tier: "DIAMOND", rank: "IV", lp: 55 },
      { daysAgo: 8, tier: "DIAMOND", rank: "III", lp: 10 },
      { daysAgo: 6, tier: "DIAMOND", rank: "III", lp: 72 },
      { daysAgo: 4, tier: "DIAMOND", rank: "II", lp: 20 },
      { daysAgo: 2, tier: "DIAMOND", rank: "II", lp: 38 },
      { daysAgo: 1, tier: "DIAMOND", rank: "II", lp: 47 },
    ]),
  },
  {
    puuid: "mock-puuid-demure",
    gameName: "Demure",
    tagLine: "GGEZ",
    summonerId: "",
    region: "na1",
    current: {
      tier: "PLATINUM",
      rank: "I",
      lp: 75,
      wins: 55,
      losses: 62,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-demure", [
      { daysAgo: 1, h: 1, placement: 4, duration: 2100 },
      { daysAgo: 1, h: 4, placement: 2, duration: 2350 },
      { daysAgo: 2, h: 2, placement: 5, duration: 1950 },
      { daysAgo: 3, h: 3, placement: 3, duration: 2200 },
      { daysAgo: 4, h: 1, placement: 1, duration: 2750 },
      { daysAgo: 5, h: 5, placement: 6, duration: 1700 },
      { daysAgo: 6, h: 2, placement: 3, duration: 2400 },
      { daysAgo: 7, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 8, h: 1, placement: 4, duration: 2050 },
      { daysAgo: 9, h: 3, placement: 7, duration: 1600 },
      { daysAgo: 10, h: 2, placement: 1, duration: 2850 },
    ]),
    history: buildHistory([
      { daysAgo: 12, tier: "GOLD", rank: "I", lp: 60 },
      { daysAgo: 10, tier: "PLATINUM", rank: "IV", lp: 20 },
      { daysAgo: 8, tier: "PLATINUM", rank: "IV", lp: 75 },
      { daysAgo: 6, tier: "PLATINUM", rank: "III", lp: 30 },
      { daysAgo: 4, tier: "PLATINUM", rank: "II", lp: 10 },
      { daysAgo: 2, tier: "PLATINUM", rank: "I", lp: 55 },
      { daysAgo: 1, tier: "PLATINUM", rank: "I", lp: 75 },
    ]),
  },
  {
    puuid: "mock-puuid-lionnel",
    gameName: "Lionnel",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    current: {
      tier: "GOLD",
      rank: "II",
      lp: 30,
      wins: 40,
      losses: 48,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-lionnel", [
      { daysAgo: 1, h: 3, placement: 6, duration: 1800 },
      { daysAgo: 2, h: 1, placement: 3, duration: 2200 },
      { daysAgo: 3, h: 4, placement: 4, duration: 2100 },
      { daysAgo: 4, h: 2, placement: 2, duration: 2400 },
      { daysAgo: 5, h: 1, placement: 8, duration: 1400 },
      { daysAgo: 6, h: 3, placement: 5, duration: 1950 },
      { daysAgo: 7, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 9, h: 1, placement: 3, duration: 2300 },
    ]),
    history: buildHistory([
      { daysAgo: 10, tier: "SILVER", rank: "I", lp: 90 },
      { daysAgo: 8, tier: "GOLD", rank: "IV", lp: 25 },
      { daysAgo: 6, tier: "GOLD", rank: "IV", lp: 70 },
      { daysAgo: 4, tier: "GOLD", rank: "III", lp: 15 },
      { daysAgo: 2, tier: "GOLD", rank: "II", lp: 10 },
      { daysAgo: 1, tier: "GOLD", rank: "II", lp: 30 },
    ]),
  },
];

// ── Helpers ──────────────────────────────────────────────────────

function buildMatches(
  puuid: string,
  entries: { daysAgo: number; h: number; placement: number; duration: number }[]
) {
  return entries.map((e, i) => ({
    matchId: `mock-match-${puuid}-${i}`,
    placement: e.placement,
    duration: e.duration,
    timestamp: daysAgo(e.daysAgo) + e.h * HOUR,
  }));
}

function buildHistory(
  entries: { daysAgo: number; tier: string; rank: string; lp: number }[]
) {
  return entries.map((e) => {
    const d = new Date(daysAgo(e.daysAgo));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      date,
      tier: e.tier,
      rank: e.rank,
      lp: e.lp,
      wins: 0,
      losses: 0,
    };
  });
}

export function isMockMode() {
  return !process.env.KV_REST_API_URL;
}

export function getMockPlayer(puuid: string) {
  return MOCK_PLAYERS.find((p) => p.puuid === puuid) ?? null;
}
