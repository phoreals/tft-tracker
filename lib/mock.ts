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
      // Week 10 (current)
      { daysAgo: 1, h: 1, placement: 1, duration: 2900 },
      { daysAgo: 1, h: 4, placement: 2, duration: 2600 },
      { daysAgo: 2, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 3, h: 3, placement: 3, duration: 2400 },
      { daysAgo: 4, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 5, h: 5, placement: 2, duration: 2650 },
      // Week 9
      { daysAgo: 8, h: 2, placement: 1, duration: 2950 },
      { daysAgo: 9, h: 1, placement: 2, duration: 2700 },
      { daysAgo: 10, h: 4, placement: 1, duration: 2850 },
      { daysAgo: 12, h: 3, placement: 3, duration: 2400 },
      // Week 8
      { daysAgo: 16, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 18, h: 1, placement: 1, duration: 2900 },
      { daysAgo: 19, h: 3, placement: 4, duration: 2200 },
      // Week 7
      { daysAgo: 22, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 24, h: 4, placement: 2, duration: 2550 },
      // Week 6
      { daysAgo: 30, h: 2, placement: 3, duration: 2350 },
      { daysAgo: 32, h: 1, placement: 1, duration: 2750 },
      // Week 4
      { daysAgo: 44, h: 3, placement: 2, duration: 2500 },
      { daysAgo: 45, h: 1, placement: 1, duration: 2850 },
      // Week 2
      { daysAgo: 58, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 60, h: 4, placement: 3, duration: 2400 },
    ]),
    history: buildHistory([
      { daysAgo: 65, tier: "MASTER",      rank: "I", lp: 400 },
      { daysAgo: 58, tier: "MASTER",      rank: "I", lp: 550 },
      { daysAgo: 51, tier: "GRANDMASTER", rank: "I", lp: 600 },
      { daysAgo: 44, tier: "GRANDMASTER", rank: "I", lp: 700 },
      { daysAgo: 37, tier: "GRANDMASTER", rank: "I", lp: 750 },
      { daysAgo: 30, tier: "GRANDMASTER", rank: "I", lp: 800 },
      { daysAgo: 23, tier: "GRANDMASTER", rank: "I", lp: 910 },
      { daysAgo: 16, tier: "CHALLENGER",  rank: "I", lp: 1020 },
      { daysAgo: 10, tier: "CHALLENGER",  rank: "I", lp: 1060 },
      { daysAgo: 7,  tier: "CHALLENGER",  rank: "I", lp: 1100 },
      { daysAgo: 5,  tier: "CHALLENGER",  rank: "I", lp: 1180 },
      { daysAgo: 3,  tier: "CHALLENGER",  rank: "I", lp: 1220 },
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
      // Week 10
      { daysAgo: 1, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 2, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 3, h: 3, placement: 3, duration: 2350 },
      { daysAgo: 5, h: 4, placement: 1, duration: 2900 },
      // Week 9
      { daysAgo: 8, h: 1, placement: 2, duration: 2550 },
      { daysAgo: 9, h: 3, placement: 5, duration: 1950 },
      { daysAgo: 11, h: 2, placement: 1, duration: 2750 },
      // Week 8
      { daysAgo: 15, h: 1, placement: 4, duration: 2100 },
      { daysAgo: 17, h: 3, placement: 2, duration: 2500 },
      // Week 7
      { daysAgo: 23, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 25, h: 1, placement: 3, duration: 2300 },
      // Week 5
      { daysAgo: 36, h: 4, placement: 2, duration: 2600 },
      { daysAgo: 38, h: 2, placement: 4, duration: 2100 },
      // Week 3
      { daysAgo: 50, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 52, h: 3, placement: 3, duration: 2350 },
    ]),
    history: buildHistory([
      { daysAgo: 65, tier: "DIAMOND",     rank: "I",  lp: 80 },
      { daysAgo: 58, tier: "MASTER",      rank: "I", lp: 200 },
      { daysAgo: 51, tier: "MASTER",      rank: "I", lp: 380 },
      { daysAgo: 44, tier: "MASTER",      rank: "I", lp: 500 },
      { daysAgo: 37, tier: "MASTER",      rank: "I", lp: 620 },
      { daysAgo: 30, tier: "MASTER",      rank: "I", lp: 750 },
      { daysAgo: 23, tier: "GRANDMASTER", rank: "I", lp: 350 },
      { daysAgo: 16, tier: "GRANDMASTER", rank: "I", lp: 400 },
      { daysAgo: 10, tier: "GRANDMASTER", rank: "I", lp: 450 },
      { daysAgo: 7,  tier: "GRANDMASTER", rank: "I", lp: 472 },
      { daysAgo: 3,  tier: "GRANDMASTER", rank: "I", lp: 498 },
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
      // Week 10
      { daysAgo: 1, h: 3, placement: 3, duration: 2400 },
      { daysAgo: 2, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 3, h: 1, placement: 4, duration: 2200 },
      { daysAgo: 4, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 5, h: 2, placement: 6, duration: 1850 },
      { daysAgo: 6, h: 1, placement: 1, duration: 2800 },
      // Week 9
      { daysAgo: 8, h: 3, placement: 3, duration: 2350 },
      { daysAgo: 9, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 10, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 12, h: 4, placement: 1, duration: 2750 },
      // Week 8
      { daysAgo: 16, h: 1, placement: 2, duration: 2500 },
      { daysAgo: 18, h: 3, placement: 4, duration: 2200 },
      // Week 6
      { daysAgo: 29, h: 2, placement: 1, duration: 2800 },
      { daysAgo: 31, h: 1, placement: 3, duration: 2350 },
      // Week 4
      { daysAgo: 43, h: 4, placement: 2, duration: 2600 },
      // Week 2
      { daysAgo: 57, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 59, h: 3, placement: 1, duration: 2700 },
    ]),
    history: buildHistory([
      { daysAgo: 65, tier: "EMERALD",  rank: "I",  lp: 70 },
      { daysAgo: 58, tier: "DIAMOND",  rank: "IV", lp: 30 },
      { daysAgo: 51, tier: "DIAMOND",  rank: "III",lp: 50 },
      { daysAgo: 44, tier: "DIAMOND",  rank: "II", lp: 20 },
      { daysAgo: 37, tier: "DIAMOND",  rank: "I",  lp: 60 },
      { daysAgo: 30, tier: "DIAMOND",  rank: "I",  lp: 80 },
      { daysAgo: 23, tier: "MASTER",   rank: "I",  lp: 30 },
      { daysAgo: 16, tier: "MASTER",   rank: "I",  lp: 90 },
      { daysAgo: 10, tier: "MASTER",   rank: "I",  lp: 130 },
      { daysAgo: 7,  tier: "MASTER",   rank: "I",  lp: 145 },
      { daysAgo: 3,  tier: "MASTER",   rank: "I",  lp: 168 },
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
      // Week 10 — most active player
      { daysAgo: 1,  h: 2, placement: 1, duration: 2640 },
      { daysAgo: 1,  h: 5, placement: 3, duration: 2200 },
      { daysAgo: 2,  h: 3, placement: 2, duration: 2450 },
      { daysAgo: 3,  h: 1, placement: 5, duration: 1900 },
      { daysAgo: 4,  h: 4, placement: 1, duration: 2700 },
      { daysAgo: 5,  h: 2, placement: 4, duration: 2300 },
      { daysAgo: 6,  h: 6, placement: 2, duration: 2550 },
      { daysAgo: 6,  h: 1, placement: 6, duration: 1800 },
      // Week 9
      { daysAgo: 8,  h: 3, placement: 3, duration: 2400 },
      { daysAgo: 9,  h: 5, placement: 1, duration: 2800 },
      { daysAgo: 10, h: 2, placement: 7, duration: 1650 },
      { daysAgo: 11, h: 4, placement: 2, duration: 2500 },
      { daysAgo: 12, h: 1, placement: 4, duration: 2350 },
      { daysAgo: 13, h: 3, placement: 1, duration: 2900 },
      // Week 7
      { daysAgo: 22, h: 2, placement: 3, duration: 2300 },
      { daysAgo: 24, h: 1, placement: 1, duration: 2700 },
      { daysAgo: 25, h: 4, placement: 2, duration: 2500 },
      // Week 5
      { daysAgo: 35, h: 3, placement: 4, duration: 2100 },
      { daysAgo: 37, h: 1, placement: 1, duration: 2800 },
      // Week 3
      { daysAgo: 50, h: 2, placement: 2, duration: 2450 },
      { daysAgo: 51, h: 4, placement: 5, duration: 1900 },
      // Week 1
      { daysAgo: 64, h: 1, placement: 3, duration: 2300 },
      { daysAgo: 66, h: 3, placement: 1, duration: 2700 },
    ]),
    history: buildHistory([
      { daysAgo: 67, tier: "GOLD",     rank: "I",   lp: 80 },
      { daysAgo: 60, tier: "PLATINUM", rank: "IV",  lp: 30 },
      { daysAgo: 53, tier: "PLATINUM", rank: "III", lp: 50 },
      { daysAgo: 46, tier: "PLATINUM", rank: "II",  lp: 20 },
      { daysAgo: 39, tier: "PLATINUM", rank: "I",   lp: 80 },
      { daysAgo: 32, tier: "DIAMOND",  rank: "IV",  lp: 12 },
      { daysAgo: 25, tier: "DIAMOND",  rank: "IV",  lp: 55 },
      { daysAgo: 18, tier: "DIAMOND",  rank: "III", lp: 38 },
      { daysAgo: 11, tier: "DIAMOND",  rank: "III", lp: 72 },
      { daysAgo: 7,  tier: "DIAMOND",  rank: "III", lp: 90 },
      { daysAgo: 4,  tier: "DIAMOND",  rank: "II",  lp: 20 },
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
      // Week 10
      { daysAgo: 1, h: 2, placement: 4, duration: 2100 },
      { daysAgo: 2, h: 3, placement: 2, duration: 2400 },
      { daysAgo: 3, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 5, h: 2, placement: 1, duration: 2750 },
      // Week 9
      { daysAgo: 8, h: 3, placement: 4, duration: 2050 },
      { daysAgo: 9, h: 2, placement: 2, duration: 2500 },
      { daysAgo: 11, h: 1, placement: 7, duration: 1600 },
      // Week 8
      { daysAgo: 16, h: 4, placement: 3, duration: 2250 },
      { daysAgo: 18, h: 1, placement: 6, duration: 1700 },
      // Week 6
      { daysAgo: 30, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 32, h: 3, placement: 4, duration: 2100 },
      // Week 4
      { daysAgo: 43, h: 1, placement: 2, duration: 2400 },
      // Week 2
      { daysAgo: 57, h: 4, placement: 5, duration: 1850 },
      { daysAgo: 59, h: 2, placement: 3, duration: 2200 },
    ]),
    history: buildHistory([
      { daysAgo: 65, tier: "GOLD",    rank: "I",   lp: 60 },
      { daysAgo: 58, tier: "PLATINUM",rank: "IV",  lp: 20 },
      { daysAgo: 51, tier: "PLATINUM",rank: "III", lp: 40 },
      { daysAgo: 44, tier: "PLATINUM",rank: "II",  lp: 70 },
      { daysAgo: 37, tier: "PLATINUM",rank: "I",   lp: 50 },
      { daysAgo: 30, tier: "EMERALD", rank: "IV",  lp: 30 },
      { daysAgo: 23, tier: "EMERALD", rank: "IV",  lp: 85 },
      { daysAgo: 16, tier: "EMERALD", rank: "III", lp: 20 },
      { daysAgo: 10, tier: "EMERALD", rank: "III", lp: 70 },
      { daysAgo: 7,  tier: "EMERALD", rank: "III", lp: 88 },
      { daysAgo: 3,  tier: "EMERALD", rank: "II",  lp: 40 },
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
      // Week 10
      { daysAgo: 1,  h: 1, placement: 4, duration: 2100 },
      { daysAgo: 1,  h: 4, placement: 2, duration: 2350 },
      { daysAgo: 2,  h: 2, placement: 5, duration: 1950 },
      { daysAgo: 3,  h: 3, placement: 3, duration: 2200 },
      { daysAgo: 4,  h: 1, placement: 1, duration: 2750 },
      // Week 9
      { daysAgo: 8,  h: 1, placement: 4, duration: 2050 },
      { daysAgo: 9,  h: 3, placement: 7, duration: 1600 },
      { daysAgo: 11, h: 2, placement: 1, duration: 2850 },
      // Week 8
      { daysAgo: 15, h: 5, placement: 6, duration: 1700 },
      { daysAgo: 17, h: 2, placement: 3, duration: 2400 },
      { daysAgo: 19, h: 4, placement: 2, duration: 2500 },
      // Week 6
      { daysAgo: 29, h: 1, placement: 1, duration: 2750 },
      { daysAgo: 31, h: 3, placement: 4, duration: 2100 },
      // Week 3
      { daysAgo: 50, h: 2, placement: 2, duration: 2400 },
      { daysAgo: 52, h: 1, placement: 3, duration: 2200 },
    ]),
    history: buildHistory([
      { daysAgo: 65, tier: "SILVER",   rank: "I",   lp: 80 },
      { daysAgo: 58, tier: "GOLD",     rank: "IV",  lp: 30 },
      { daysAgo: 51, tier: "GOLD",     rank: "III", lp: 50 },
      { daysAgo: 44, tier: "GOLD",     rank: "II",  lp: 20 },
      { daysAgo: 37, tier: "GOLD",     rank: "I",   lp: 60 },
      { daysAgo: 30, tier: "GOLD",     rank: "I",   lp: 88 },
      { daysAgo: 23, tier: "PLATINUM", rank: "IV",  lp: 20 },
      { daysAgo: 16, tier: "PLATINUM", rank: "IV",  lp: 75 },
      { daysAgo: 10, tier: "PLATINUM", rank: "III", lp: 30 },
      { daysAgo: 7,  tier: "PLATINUM", rank: "II",  lp: 10 },
      { daysAgo: 3,  tier: "PLATINUM", rank: "I",   lp: 55 },
      { daysAgo: 1,  tier: "PLATINUM", rank: "I",   lp: 75 },
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
      // Week 10
      { daysAgo: 1, h: 3, placement: 6, duration: 1800 },
      { daysAgo: 2, h: 1, placement: 3, duration: 2200 },
      { daysAgo: 4, h: 2, placement: 2, duration: 2400 },
      // Week 9
      { daysAgo: 8, h: 1, placement: 8, duration: 1400 },
      { daysAgo: 10, h: 3, placement: 5, duration: 1950 },
      { daysAgo: 12, h: 2, placement: 1, duration: 2700 },
      // Week 7
      { daysAgo: 23, h: 1, placement: 3, duration: 2300 },
      { daysAgo: 25, h: 4, placement: 4, duration: 2100 },
      // Week 5
      { daysAgo: 36, h: 2, placement: 2, duration: 2400 },
      { daysAgo: 38, h: 1, placement: 6, duration: 1800 },
      // Week 3
      { daysAgo: 50, h: 3, placement: 1, duration: 2700 },
      // Week 1
      { daysAgo: 64, h: 2, placement: 4, duration: 2100 },
      { daysAgo: 66, h: 1, placement: 5, duration: 1900 },
    ]),
    history: buildHistory([
      { daysAgo: 67, tier: "BRONZE",  rank: "I",   lp: 80 },
      { daysAgo: 60, tier: "SILVER",  rank: "IV",  lp: 30 },
      { daysAgo: 53, tier: "SILVER",  rank: "III", lp: 50 },
      { daysAgo: 46, tier: "SILVER",  rank: "II",  lp: 70 },
      { daysAgo: 39, tier: "SILVER",  rank: "I",   lp: 90 },
      { daysAgo: 32, tier: "GOLD",    rank: "IV",  lp: 25 },
      { daysAgo: 25, tier: "GOLD",    rank: "IV",  lp: 70 },
      { daysAgo: 18, tier: "GOLD",    rank: "IV",  lp: 88 },
      { daysAgo: 11, tier: "GOLD",    rank: "III", lp: 15 },
      { daysAgo: 7,  tier: "GOLD",    rank: "III", lp: 55 },
      { daysAgo: 3,  tier: "GOLD",    rank: "II",  lp: 10 },
      { daysAgo: 1,  tier: "GOLD",    rank: "II",  lp: 30 },
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
      // Week 10
      { daysAgo: 1, h: 1, placement: 5, duration: 1800 },
      { daysAgo: 2, h: 2, placement: 3, duration: 2200 },
      { daysAgo: 4, h: 3, placement: 4, duration: 2000 },
      // Week 9
      { daysAgo: 8, h: 2, placement: 2, duration: 2350 },
      { daysAgo: 10, h: 1, placement: 6, duration: 1650 },
      { daysAgo: 12, h: 2, placement: 1, duration: 2600 },
      // Week 7
      { daysAgo: 22, h: 1, placement: 7, duration: 1550 },
      { daysAgo: 24, h: 3, placement: 3, duration: 2200 },
      // Week 5
      { daysAgo: 36, h: 2, placement: 4, duration: 2000 },
      // Week 3
      { daysAgo: 50, h: 1, placement: 2, duration: 2350 },
      { daysAgo: 52, h: 4, placement: 5, duration: 1800 },
    ]),
    history: buildHistory([
      { daysAgo: 60, tier: "BRONZE",  rank: "II",  lp: 50 },
      { daysAgo: 53, tier: "BRONZE",  rank: "I",   lp: 30 },
      { daysAgo: 46, tier: "SILVER",  rank: "IV",  lp: 20 },
      { daysAgo: 39, tier: "SILVER",  rank: "IV",  lp: 50 },
      { daysAgo: 32, tier: "SILVER",  rank: "IV",  lp: 72 },
      { daysAgo: 25, tier: "SILVER",  rank: "IV",  lp: 90 },
      { daysAgo: 18, tier: "SILVER",  rank: "IV",  lp: 98 },
      { daysAgo: 11, tier: "SILVER",  rank: "III", lp: 10 },
      { daysAgo: 7,  tier: "SILVER",  rank: "III", lp: 18 },
      { daysAgo: 3,  tier: "SILVER",  rank: "III", lp: 25 },
      { daysAgo: 1,  tier: "SILVER",  rank: "III", lp: 40 },
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
      // Week 10
      { daysAgo: 1, h: 2, placement: 6, duration: 1700 },
      { daysAgo: 2, h: 1, placement: 4, duration: 2000 },
      { daysAgo: 4, h: 1, placement: 3, duration: 2150 },
      // Week 9
      { daysAgo: 9, h: 2, placement: 7, duration: 1500 },
      { daysAgo: 11, h: 1, placement: 2, duration: 2300 },
      // Week 8
      { daysAgo: 16, h: 3, placement: 5, duration: 1850 },
      // Week 6
      { daysAgo: 30, h: 2, placement: 4, duration: 2000 },
      { daysAgo: 32, h: 1, placement: 6, duration: 1700 },
      // Week 4
      { daysAgo: 43, h: 3, placement: 3, duration: 2150 },
      // Week 2
      { daysAgo: 57, h: 1, placement: 5, duration: 1850 },
    ]),
    history: buildHistory([
      { daysAgo: 60, tier: "IRON",   rank: "I",   lp: 80 },
      { daysAgo: 53, tier: "BRONZE", rank: "IV",  lp: 20 },
      { daysAgo: 46, tier: "BRONZE", rank: "IV",  lp: 60 },
      { daysAgo: 39, tier: "BRONZE", rank: "III", lp: 20 },
      { daysAgo: 32, tier: "BRONZE", rank: "III", lp: 40 },
      { daysAgo: 25, tier: "BRONZE", rank: "II",  lp: 55 },
      { daysAgo: 18, tier: "BRONZE", rank: "II",  lp: 72 },
      { daysAgo: 11, tier: "BRONZE", rank: "II",  lp: 90 },
      { daysAgo: 7,  tier: "BRONZE", rank: "II",  lp: 98 },
      { daysAgo: 3,  tier: "BRONZE", rank: "I",   lp: 55 },
      { daysAgo: 1,  tier: "BRONZE", rank: "I",   lp: 80 },
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
      // Week 10
      { daysAgo: 1, h: 1, placement: 7, duration: 1500 },
      { daysAgo: 2, h: 2, placement: 5, duration: 1750 },
      { daysAgo: 3, h: 1, placement: 8, duration: 1300 },
      // Week 9
      { daysAgo: 9, h: 3, placement: 4, duration: 1950 },
      { daysAgo: 11, h: 1, placement: 6, duration: 1650 },
      // Week 7
      { daysAgo: 23, h: 2, placement: 7, duration: 1500 },
      { daysAgo: 25, h: 1, placement: 5, duration: 1750 },
      // Week 5
      { daysAgo: 36, h: 3, placement: 8, duration: 1300 },
      // Week 3
      { daysAgo: 50, h: 1, placement: 6, duration: 1650 },
    ]),
    history: buildHistory([
      { daysAgo: 60, tier: "IRON", rank: "IV",  lp: 30 },
      { daysAgo: 53, tier: "IRON", rank: "IV",  lp: 50 },
      { daysAgo: 46, tier: "IRON", rank: "IV",  lp: 70 },
      { daysAgo: 39, tier: "IRON", rank: "III", lp: 20 },
      { daysAgo: 32, tier: "IRON", rank: "III", lp: 50 },
      { daysAgo: 25, tier: "IRON", rank: "III", lp: 70 },
      { daysAgo: 18, tier: "IRON", rank: "III", lp: 50 },
      { daysAgo: 11, tier: "IRON", rank: "III", lp: 30 },
      { daysAgo: 7,  tier: "IRON", rank: "III", lp: 10 },
      { daysAgo: 3,  tier: "IRON", rank: "II",  lp: 20 },
      { daysAgo: 1,  tier: "IRON", rank: "II",  lp: 55 },
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
  return !process.env.KV_REST_API_URL && process.env.NODE_ENV !== "production";
}

export function getMockPlayer(puuid: string) {
  return MOCK_PLAYERS.find((p) => p.puuid === puuid) ?? null;
}
