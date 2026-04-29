// Local dev mock data — used when KV_REST_API_URL is not configured.
// One player per rank tier so all rank colors are visible during development.

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function daysAgo(n: number) {
  return now - n * DAY;
}

// ── Mock players ─────────────────────────────────────────────────

export const MOCK_PLAYERS = [
  // ── Challenger ───────────────────────────────────────────────
  {
    puuid: "mock-puuid-richardpression",
    gameName: "Richardpression",
    tagLine: "SAD",
    summonerId: "",
    region: "na1",
    profileIconId: 4892,
    current: {
      tier: "CHALLENGER",
      rank: "I",
      lp: 1240,
      wins: 210,
      losses: 155,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-richardpression", [
      { daysAgo: 1, h: 1, placement: 1, duration: 2900 },
      { daysAgo: 1, h: 4, placement: 2, duration: 2600 },
      { daysAgo: 2, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 3, h: 3, placement: 3, duration: 2400 },
      { daysAgo: 4, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 5, h: 5, placement: 2, duration: 2650 },
      { daysAgo: 6, h: 2, placement: 4, duration: 2300 },
      { daysAgo: 7, h: 3, placement: 1, duration: 2950 },
      { daysAgo: 8, h: 1, placement: 2, duration: 2700 },
      { daysAgo: 9, h: 4, placement: 1, duration: 2850 },
    ]),
    history: buildHistory([
      { daysAgo: 10, tier: "GRANDMASTER", rank: "I", lp: 800 },
      { daysAgo: 8,  tier: "CHALLENGER",  rank: "I", lp: 1020 },
      { daysAgo: 6,  tier: "CHALLENGER",  rank: "I", lp: 1100 },
      { daysAgo: 4,  tier: "CHALLENGER",  rank: "I", lp: 1180 },
      { daysAgo: 2,  tier: "CHALLENGER",  rank: "I", lp: 1220 },
      { daysAgo: 1,  tier: "CHALLENGER",  rank: "I", lp: 1240 },
    ]),
  },

  // ── Grandmaster ──────────────────────────────────────────────
  {
    puuid: "mock-puuid-firelordappa",
    gameName: "FireLordAppa",
    tagLine: "1335",
    summonerId: "",
    region: "na1",
    profileIconId: 5367,
    current: {
      tier: "GRANDMASTER",
      rank: "I",
      lp: 512,
      wins: 145,
      losses: 118,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-firelordappa", [
      { daysAgo: 1, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 2, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 3, h: 3, placement: 3, duration: 2350 },
      { daysAgo: 4, h: 2, placement: 4, duration: 2100 },
      { daysAgo: 5, h: 4, placement: 1, duration: 2900 },
      { daysAgo: 6, h: 1, placement: 2, duration: 2550 },
      { daysAgo: 7, h: 3, placement: 5, duration: 1950 },
      { daysAgo: 8, h: 2, placement: 1, duration: 2750 },
    ]),
    history: buildHistory([
      { daysAgo: 10, tier: "MASTER",      rank: "I", lp: 750 },
      { daysAgo: 8,  tier: "GRANDMASTER", rank: "I", lp: 400 },
      { daysAgo: 6,  tier: "GRANDMASTER", rank: "I", lp: 460 },
      { daysAgo: 4,  tier: "GRANDMASTER", rank: "I", lp: 490 },
      { daysAgo: 2,  tier: "GRANDMASTER", rank: "I", lp: 505 },
      { daysAgo: 1,  tier: "GRANDMASTER", rank: "I", lp: 512 },
    ]),
  },

  // ── Master ───────────────────────────────────────────────────
  {
    puuid: "mock-puuid-caramelpapi",
    gameName: "Caramel Papi",
    tagLine: "PAPI1",
    summonerId: "",
    region: "na1",
    profileIconId: 3942,
    current: {
      tier: "MASTER",
      rank: "I",
      lp: 185,
      wins: 98,
      losses: 90,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-caramelpapi", [
      { daysAgo: 1, h: 3, placement: 3, duration: 2400 },
      { daysAgo: 2, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 3, h: 1, placement: 4, duration: 2200 },
      { daysAgo: 4, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 5, h: 2, placement: 6, duration: 1850 },
      { daysAgo: 6, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 7, h: 3, placement: 3, duration: 2350 },
      { daysAgo: 8, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 9, h: 1, placement: 5, duration: 1900 },
    ]),
    history: buildHistory([
      { daysAgo: 12, tier: "DIAMOND",  rank: "I",  lp: 80 },
      { daysAgo: 10, tier: "MASTER",   rank: "I",  lp: 30 },
      { daysAgo: 8,  tier: "MASTER",   rank: "I",  lp: 90 },
      { daysAgo: 6,  tier: "MASTER",   rank: "I",  lp: 130 },
      { daysAgo: 4,  tier: "MASTER",   rank: "I",  lp: 160 },
      { daysAgo: 2,  tier: "MASTER",   rank: "I",  lp: 175 },
      { daysAgo: 1,  tier: "MASTER",   rank: "I",  lp: 185 },
    ]),
  },

  // ── Diamond ──────────────────────────────────────────────────
  {
    puuid: "mock-puuid-banh",
    gameName: "Banh",
    tagLine: "boi",
    summonerId: "",
    region: "na1",
    profileIconId: 29,
    current: {
      tier: "DIAMOND",
      rank: "II",
      lp: 47,
      wins: 82,
      losses: 68,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-banh", [
      { daysAgo: 1,  h: 2, placement: 1, duration: 2640 },
      { daysAgo: 1,  h: 5, placement: 3, duration: 2200 },
      { daysAgo: 2,  h: 3, placement: 2, duration: 2450 },
      { daysAgo: 3,  h: 1, placement: 5, duration: 1900 },
      { daysAgo: 4,  h: 4, placement: 1, duration: 2700 },
      { daysAgo: 5,  h: 2, placement: 4, duration: 2300 },
      { daysAgo: 6,  h: 6, placement: 2, duration: 2550 },
      { daysAgo: 7,  h: 1, placement: 6, duration: 1800 },
      { daysAgo: 8,  h: 3, placement: 3, duration: 2400 },
      { daysAgo: 9,  h: 5, placement: 1, duration: 2800 },
      { daysAgo: 10, h: 2, placement: 7, duration: 1650 },
      { daysAgo: 11, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 12, h: 1, placement: 4, duration: 2350 },
      { daysAgo: 13, h: 3, placement: 1, duration: 2900 },
    ]),
    history: buildHistory([
      { daysAgo: 14, tier: "PLATINUM", rank: "I",   lp: 80 },
      { daysAgo: 12, tier: "DIAMOND",  rank: "IV",  lp: 12 },
      { daysAgo: 10, tier: "DIAMOND",  rank: "IV",  lp: 55 },
      { daysAgo: 8,  tier: "DIAMOND",  rank: "III", lp: 10 },
      { daysAgo: 6,  tier: "DIAMOND",  rank: "III", lp: 72 },
      { daysAgo: 4,  tier: "DIAMOND",  rank: "II",  lp: 20 },
      { daysAgo: 2,  tier: "DIAMOND",  rank: "II",  lp: 38 },
      { daysAgo: 1,  tier: "DIAMOND",  rank: "II",  lp: 47 },
    ]),
  },

  // ── Emerald ──────────────────────────────────────────────────
  {
    puuid: "mock-puuid-vtaehyung",
    gameName: "V for Taehyung",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 588,
    current: {
      tier: "EMERALD",
      rank: "II",
      lp: 65,
      wins: 70,
      losses: 74,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-vtaehyung", [
      { daysAgo: 1, h: 2, placement: 4, duration: 2100 },
      { daysAgo: 2, h: 3, placement: 2, duration: 2400 },
      { daysAgo: 3, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 4, h: 4, placement: 3, duration: 2250 },
      { daysAgo: 5, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 6, h: 1, placement: 6, duration: 1700 },
      { daysAgo: 7, h: 3, placement: 4, duration: 2050 },
      { daysAgo: 8, h: 2, placement: 2, duration: 2500 },
      { daysAgo: 9, h: 1, placement: 7, duration: 1600 },
    ]),
    history: buildHistory([
      { daysAgo: 10, tier: "EMERALD", rank: "IV", lp: 30 },
      { daysAgo: 8,  tier: "EMERALD", rank: "IV", lp: 85 },
      { daysAgo: 6,  tier: "EMERALD", rank: "III", lp: 20 },
      { daysAgo: 4,  tier: "EMERALD", rank: "III", lp: 70 },
      { daysAgo: 2,  tier: "EMERALD", rank: "II",  lp: 40 },
      { daysAgo: 1,  tier: "EMERALD", rank: "II",  lp: 65 },
    ]),
  },

  // ── Platinum ─────────────────────────────────────────────────
  {
    puuid: "mock-puuid-demure",
    gameName: "Demure",
    tagLine: "GGEZ",
    summonerId: "",
    region: "na1",
    profileIconId: 4474,
    current: {
      tier: "PLATINUM",
      rank: "I",
      lp: 75,
      wins: 55,
      losses: 62,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-demure", [
      { daysAgo: 1,  h: 1, placement: 4, duration: 2100 },
      { daysAgo: 1,  h: 4, placement: 2, duration: 2350 },
      { daysAgo: 2,  h: 2, placement: 5, duration: 1950 },
      { daysAgo: 3,  h: 3, placement: 3, duration: 2200 },
      { daysAgo: 4,  h: 1, placement: 1, duration: 2750 },
      { daysAgo: 5,  h: 5, placement: 6, duration: 1700 },
      { daysAgo: 6,  h: 2, placement: 3, duration: 2400 },
      { daysAgo: 7,  h: 4, placement: 2, duration: 2500 },
      { daysAgo: 8,  h: 1, placement: 4, duration: 2050 },
      { daysAgo: 9,  h: 3, placement: 7, duration: 1600 },
      { daysAgo: 10, h: 2, placement: 1, duration: 2850 },
    ]),
    history: buildHistory([
      { daysAgo: 12, tier: "GOLD",     rank: "I",  lp: 60 },
      { daysAgo: 10, tier: "PLATINUM", rank: "IV", lp: 20 },
      { daysAgo: 8,  tier: "PLATINUM", rank: "IV", lp: 75 },
      { daysAgo: 6,  tier: "PLATINUM", rank: "III", lp: 30 },
      { daysAgo: 4,  tier: "PLATINUM", rank: "II", lp: 10 },
      { daysAgo: 2,  tier: "PLATINUM", rank: "I",  lp: 55 },
      { daysAgo: 1,  tier: "PLATINUM", rank: "I",  lp: 75 },
    ]),
  },

  // ── Gold ─────────────────────────────────────────────────────
  {
    puuid: "mock-puuid-lionnel",
    gameName: "Lionnel",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 1390,
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
      { daysAgo: 10, tier: "SILVER", rank: "I",  lp: 90 },
      { daysAgo: 8,  tier: "GOLD",   rank: "IV", lp: 25 },
      { daysAgo: 6,  tier: "GOLD",   rank: "IV", lp: 70 },
      { daysAgo: 4,  tier: "GOLD",   rank: "III", lp: 15 },
      { daysAgo: 2,  tier: "GOLD",   rank: "II", lp: 10 },
      { daysAgo: 1,  tier: "GOLD",   rank: "II", lp: 30 },
    ]),
  },

  // ── Silver ───────────────────────────────────────────────────
  {
    puuid: "mock-puuid-nisca",
    gameName: "Nisca",
    tagLine: "CREAM",
    summonerId: "",
    region: "na1",
    profileIconId: 2569,
    current: {
      tier: "SILVER",
      rank: "III",
      lp: 40,
      wins: 28,
      losses: 35,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-nisca", [
      { daysAgo: 1, h: 1, placement: 5, duration: 1800 },
      { daysAgo: 2, h: 2, placement: 3, duration: 2200 },
      { daysAgo: 3, h: 1, placement: 7, duration: 1550 },
      { daysAgo: 4, h: 3, placement: 4, duration: 2000 },
      { daysAgo: 5, h: 2, placement: 2, duration: 2350 },
      { daysAgo: 6, h: 1, placement: 6, duration: 1650 },
      { daysAgo: 7, h: 2, placement: 1, duration: 2600 },
    ]),
    history: buildHistory([
      { daysAgo: 8, tier: "SILVER", rank: "IV", lp: 50 },
      { daysAgo: 6, tier: "SILVER", rank: "IV", lp: 90 },
      { daysAgo: 4, tier: "SILVER", rank: "III", lp: 10 },
      { daysAgo: 2, tier: "SILVER", rank: "III", lp: 25 },
      { daysAgo: 1, tier: "SILVER", rank: "III", lp: 40 },
    ]),
  },

  // ── Bronze ───────────────────────────────────────────────────
  {
    puuid: "mock-puuid-goldeen",
    gameName: "Goldeen",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 747,
    current: {
      tier: "BRONZE",
      rank: "I",
      lp: 80,
      wins: 18,
      losses: 26,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-goldeen", [
      { daysAgo: 1, h: 2, placement: 6, duration: 1700 },
      { daysAgo: 2, h: 1, placement: 4, duration: 2000 },
      { daysAgo: 3, h: 3, placement: 5, duration: 1850 },
      { daysAgo: 4, h: 1, placement: 3, duration: 2150 },
      { daysAgo: 5, h: 2, placement: 7, duration: 1500 },
      { daysAgo: 6, h: 1, placement: 2, duration: 2300 },
    ]),
    history: buildHistory([
      { daysAgo: 8, tier: "BRONZE", rank: "III", lp: 20 },
      { daysAgo: 6, tier: "BRONZE", rank: "II",  lp: 55 },
      { daysAgo: 4, tier: "BRONZE", rank: "II",  lp: 90 },
      { daysAgo: 2, tier: "BRONZE", rank: "I",   lp: 55 },
      { daysAgo: 1, tier: "BRONZE", rank: "I",   lp: 80 },
    ]),
  },

  // ── Iron ─────────────────────────────────────────────────────
  {
    puuid: "mock-puuid-mrbonchen",
    gameName: "MrBonChen",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 1,
    current: {
      tier: "IRON",
      rank: "II",
      lp: 55,
      wins: 8,
      losses: 20,
      lastUpdated: new Date().toISOString(),
    },
    matches: buildMatches("mock-puuid-mrbonchen", [
      { daysAgo: 1, h: 1, placement: 7, duration: 1500 },
      { daysAgo: 2, h: 2, placement: 5, duration: 1750 },
      { daysAgo: 3, h: 1, placement: 8, duration: 1300 },
      { daysAgo: 4, h: 3, placement: 4, duration: 1950 },
      { daysAgo: 5, h: 1, placement: 6, duration: 1650 },
    ]),
    history: buildHistory([
      { daysAgo: 6, tier: "IRON", rank: "III", lp: 70 },
      { daysAgo: 4, tier: "IRON", rank: "III", lp: 30 },
      { daysAgo: 2, tier: "IRON", rank: "II",  lp: 20 },
      { daysAgo: 1, tier: "IRON", rank: "II",  lp: 55 },
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
