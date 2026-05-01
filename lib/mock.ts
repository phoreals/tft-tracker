// ⚠️  DEV-ONLY MOCK DATA — NEVER REACHES PRODUCTION.
// isMockMode() returns false when NODE_ENV === "production" (Vercel).
// Do NOT remove the NODE_ENV guard in isMockMode().
//
// Data is scoped to Set 17 weeks 1-3 (April 15 – April 30, 2026).
// All players are Platinum–Emerald range, lines cross each other.
//
// Rank LP encoding reference:
//   PLATINUM IV → 1600, III → 1700, II → 1800, I → 1900  (+lp)
//   EMERALD  IV → 2000, III → 2100, II → 2200, I → 2300  (+lp)
//
// buildHistoryFromLP takes a 15-element array where index 0 = daysAgo 14
// (April 16) and index 14 = daysAgo 0 (today, April 30). One entry per day.

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function daysAgo(n: number) {
  return now - n * DAY;
}

// ── Helpers ──────────────────────────────────────────────────────

function lpToRank(totalLp: number): { tier: string; rank: string; lp: number } {
  if (totalLp >= 2300) return { tier: "EMERALD",  rank: "I",   lp: totalLp - 2300 };
  if (totalLp >= 2200) return { tier: "EMERALD",  rank: "II",  lp: totalLp - 2200 };
  if (totalLp >= 2100) return { tier: "EMERALD",  rank: "III", lp: totalLp - 2100 };
  if (totalLp >= 2000) return { tier: "EMERALD",  rank: "IV",  lp: totalLp - 2000 };
  if (totalLp >= 1900) return { tier: "PLATINUM", rank: "I",   lp: totalLp - 1900 };
  if (totalLp >= 1800) return { tier: "PLATINUM", rank: "II",  lp: totalLp - 1800 };
  if (totalLp >= 1700) return { tier: "PLATINUM", rank: "III", lp: totalLp - 1700 };
  return               { tier: "PLATINUM", rank: "IV",  lp: totalLp - 1600 };
}

// lpByDay: index 0 = daysAgo 14, index 14 = daysAgo 0 (15 entries)
function buildHistoryFromLP(lpByDay: number[]) {
  return lpByDay.map((totalLp, i) => {
    const ago = 14 - i;
    const { tier, rank, lp } = lpToRank(totalLp);
    const d = new Date(daysAgo(ago));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date, tier, rank, lp, wins: 0, losses: 0 };
  });
}

// Approximate last_round from placement + duration: top placements survive longer.
function estimateLastRound(placement: number, duration: number): number {
  // Stage boundaries (cumulative rounds): S1=4, S2=11, S3=17, S4=23, S5=29
  const mins = duration / 60;
  if (mins < 15) return Math.round(8 + (placement / 8) * 3);
  if (mins < 22) return Math.round(14 + ((8 - placement) / 7) * 4);
  return Math.round(20 + ((8 - placement) / 7) * 6);
}

function buildMatches(
  puuid: string,
  entries: { daysAgo: number; h: number; placement: number; duration: number }[]
) {
  return entries.map((e, i) => ({
    matchId: `mock-match-${puuid}-${i}`,
    placement: e.placement,
    duration: e.duration,
    timestamp: daysAgo(e.daysAgo) + e.h * HOUR,
    ranked: true,
    lastRound: estimateLastRound(e.placement, e.duration),
    gameType: "standard",
  }));
}

// ── Mock players ─────────────────────────────────────────────────
// LP trajectories (index 0 = Apr 16, index 14 = Apr 30):
//
//  Player           D14   D13   D12   D11   D10   D9    D8    D7    D6    D5    D4    D3    D2    D1    D0
//  Richardpression  1720  1780  1840  1910  1970  2000  2020  2040  2120  2200  2250  2290  2330  2330  2210  ↗↗↘
//  FireLordAppa     2360  2320  2300  2290  2290  2310  2320  2320  2200  2120  1990  1920  1880  1850  1970  ↘↘↗
//  Caramel Papi     2230  2210  2190  2170  2160  2140  2110  2080  2050  2010  1980  1990  2000  2000  2060  ↘↗
//  Banh             1940  1950  1960  1960  1960  1970  1980  1990  2040  2080  2130  2160  2180  2120  2260  ↗↗
//  V for Taehyung   2080  2060  2040  2020  2010  1980  1960  1930  1960  2000  2050  2110  2180  2180  2240  ↘↗↗
//  Demure           1850  1870  1900  1920  1920  1960  2000  2030  2060  2080  2100  2090  2070  2060  2010  ↗↘
//  Lionnel          2180  2160  2130  2110  2100  2090  2070  2050  2030  2010  1960  1970  1990  2000  2070  ↘↗
//  Nisca            1780  1790  1820  1840  1850  1870  1900  1920  1940  1960  1990  2020  2050  2080  2150  ↗↗
//  Goldeen          2050  2030  2010  1990  1990  1940  1900  1850  1870  1890  1920  1970  2030  2030  2110  ↘↗
//  MrBonChen        2300  2280  2260  2230  2200  2170  2140  2100  2070  2040  2000  2050  2100  2150  2200  ↘↗

export const MOCK_PLAYERS = [
  {
    puuid: "mock-puuid-richardpression",
    gameName: "Richardpression",
    tagLine: "SAD",
    summonerId: "",
    region: "na1",
    profileIconId: 4892,
    current: { tier: "EMERALD", rank: "II", lp: 10, wins: 14, losses: 8, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-richardpression", [
      { daysAgo: 15, h: 1, placement: 2, duration: 2800 },
      { daysAgo: 15, h: 4, placement: 1, duration: 2900 },
      { daysAgo: 14, h: 2, placement: 3, duration: 2600 },
      { daysAgo: 14, h: 5, placement: 1, duration: 2800 },
      { daysAgo: 13, h: 1, placement: 1, duration: 2700 },
      { daysAgo: 13, h: 4, placement: 2, duration: 2700 },
      { daysAgo: 12, h: 1, placement: 1, duration: 2850 },
      { daysAgo: 12, h: 4, placement: 2, duration: 2650 },
      { daysAgo: 11, h: 2, placement: 2, duration: 2500 },
      { daysAgo: 11, h: 5, placement: 3, duration: 2500 },
      { daysAgo: 10, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 10, h: 3, placement: 1, duration: 2800 },
      { daysAgo: 10, h: 6, placement: 2, duration: 2700 },
      { daysAgo: 9,  h: 1, placement: 1, duration: 2850 },
      { daysAgo: 9,  h: 4, placement: 2, duration: 2600 },
      { daysAgo: 8,  h: 2, placement: 1, duration: 2900 },
      { daysAgo: 8,  h: 5, placement: 3, duration: 2550 },
      { daysAgo: 7,  h: 1, placement: 1, duration: 2850 },
      { daysAgo: 7,  h: 4, placement: 2, duration: 2700 },
      { daysAgo: 6,  h: 2, placement: 1, duration: 2700 },
      { daysAgo: 6,  h: 5, placement: 1, duration: 2800 },
      { daysAgo: 5,  h: 1, placement: 2, duration: 2650 },
      { daysAgo: 5,  h: 3, placement: 2, duration: 2600 },
      { daysAgo: 4,  h: 2, placement: 1, duration: 2800 },
      { daysAgo: 4,  h: 5, placement: 2, duration: 2700 },
      { daysAgo: 3,  h: 1, placement: 1, duration: 2900 },
      { daysAgo: 3,  h: 4, placement: 1, duration: 2850 },
      { daysAgo: 2,  h: 1, placement: 2, duration: 2750 },
      { daysAgo: 2,  h: 4, placement: 1, duration: 2800 },
      { daysAgo: 1,  h: 2, placement: 1, duration: 2750 },
      { daysAgo: 1,  h: 5, placement: 2, duration: 2700 },
      { daysAgo: 0,  h: 1, placement: 3, duration: 2400 },
      { daysAgo: 0,  h: 4, placement: 1, duration: 2850 },
    ]),
    history: buildHistoryFromLP(
      [1720, 1780, 1840, 1910, 1970, 2000, 2020, 2040, 2120, 2200, 2250, 2290, 2330, 2330, 2210]
    ),
  },

  {
    puuid: "mock-puuid-firelordappa",
    gameName: "FireLordAppa",
    tagLine: "1335",
    summonerId: "",
    region: "na1",
    profileIconId: 5367,
    current: { tier: "PLATINUM", rank: "I", lp: 70, wins: 10, losses: 14, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-firelordappa", [
      { daysAgo: 14, h: 3, placement: 1, duration: 2900 },
      { daysAgo: 12, h: 1, placement: 2, duration: 2650 },
      { daysAgo: 9,  h: 2, placement: 1, duration: 2800 },
      { daysAgo: 7,  h: 1, placement: 3, duration: 2350 },
      { daysAgo: 5,  h: 2, placement: 6, duration: 1850 },
      { daysAgo: 4,  h: 3, placement: 7, duration: 1600 },
      { daysAgo: 2,  h: 1, placement: 5, duration: 1950 },
      { daysAgo: 1,  h: 1, placement: 6, duration: 1800 },
      { daysAgo: 0,  h: 2, placement: 4, duration: 2100 },
    ]),
    history: buildHistoryFromLP(
      [2360, 2320, 2300, 2290, 2290, 2310, 2320, 2320, 2200, 2120, 1990, 1920, 1880, 1850, 1970]
    ),
  },

  {
    puuid: "mock-puuid-caramelpapi",
    gameName: "Caramel Papi",
    tagLine: "PAPI1",
    summonerId: "",
    region: "na1",
    profileIconId: 3942,
    current: { tier: "EMERALD", rank: "IV", lp: 60, wins: 9, losses: 13, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-caramelpapi", [
      { daysAgo: 13, h: 2, placement: 3, duration: 2300 },
      { daysAgo: 11, h: 3, placement: 4, duration: 2100 },
      { daysAgo: 7,  h: 2, placement: 5, duration: 1900 },
      { daysAgo: 5,  h: 1, placement: 6, duration: 1700 },
      { daysAgo: 4,  h: 2, placement: 5, duration: 1850 },
      { daysAgo: 3,  h: 3, placement: 3, duration: 2250 },
      { daysAgo: 1,  h: 3, placement: 2, duration: 2500 },
      { daysAgo: 0,  h: 2, placement: 2, duration: 2450 },
    ]),
    history: buildHistoryFromLP(
      [2230, 2210, 2190, 2170, 2160, 2140, 2110, 2080, 2050, 2010, 1980, 1990, 2000, 2000, 2060]
    ),
  },

  {
    puuid: "mock-puuid-banh",
    gameName: "Banh",
    tagLine: "boi",
    summonerId: "",
    region: "na1",
    profileIconId: 29,
    current: { tier: "EMERALD", rank: "II", lp: 60, wins: 12, losses: 10, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-banh", [
      { daysAgo: 14, h: 1, placement: 2, duration: 2550 },
      { daysAgo: 12, h: 3, placement: 3, duration: 2300 },
      { daysAgo: 10, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 7,  h: 3, placement: 1, duration: 2900 },
      { daysAgo: 5,  h: 4, placement: 2, duration: 2600 },
      { daysAgo: 3,  h: 2, placement: 2, duration: 2500 },
      { daysAgo: 1,  h: 1, placement: 1, duration: 2800 },
      { daysAgo: 0,  h: 3, placement: 2, duration: 2600 },
    ]),
    history: buildHistoryFromLP(
      [1940, 1950, 1960, 1960, 1960, 1970, 1980, 1990, 2040, 2080, 2130, 2160, 2180, 2120, 2260]
    ),
  },

  {
    puuid: "mock-puuid-vtaehyung",
    gameName: "V for Taehyung",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 588,
    current: { tier: "EMERALD", rank: "II", lp: 40, wins: 11, losses: 11, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-vtaehyung", [
      { daysAgo: 14, h: 2, placement: 4, duration: 2100 },
      { daysAgo: 12, h: 1, placement: 5, duration: 1900 },
      { daysAgo: 9,  h: 3, placement: 7, duration: 1600 },
      { daysAgo: 7,  h: 1, placement: 5, duration: 1950 },
      { daysAgo: 5,  h: 2, placement: 1, duration: 2750 },
      { daysAgo: 4,  h: 3, placement: 2, duration: 2500 },
      { daysAgo: 2,  h: 1, placement: 1, duration: 2700 },
      { daysAgo: 1,  h: 2, placement: 1, duration: 2800 },
      { daysAgo: 0,  h: 1, placement: 2, duration: 2600 },
    ]),
    history: buildHistoryFromLP(
      [2080, 2060, 2040, 2020, 2010, 1980, 1960, 1930, 1960, 2000, 2050, 2110, 2180, 2180, 2240]
    ),
  },

  {
    puuid: "mock-puuid-demure",
    gameName: "Demure",
    tagLine: "GGEZ",
    summonerId: "",
    region: "na1",
    profileIconId: 4474,
    current: { tier: "EMERALD", rank: "IV", lp: 10, wins: 10, losses: 12, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-demure", [
      { daysAgo: 13, h: 1, placement: 2, duration: 2550 },
      { daysAgo: 11, h: 2, placement: 1, duration: 2800 },
      { daysAgo: 9,  h: 3, placement: 1, duration: 2750 },
      { daysAgo: 7,  h: 1, placement: 2, duration: 2600 },
      { daysAgo: 5,  h: 2, placement: 3, duration: 2350 },
      { daysAgo: 4,  h: 3, placement: 4, duration: 2200 },
      { daysAgo: 2,  h: 1, placement: 5, duration: 1950 },
      { daysAgo: 1,  h: 2, placement: 5, duration: 1900 },
      { daysAgo: 0,  h: 1, placement: 6, duration: 1750 },
    ]),
    history: buildHistoryFromLP(
      [1850, 1870, 1900, 1920, 1920, 1960, 2000, 2030, 2060, 2080, 2100, 2090, 2070, 2060, 2010]
    ),
  },

  {
    puuid: "mock-puuid-lionnel",
    gameName: "Lionnel",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 1390,
    current: { tier: "EMERALD", rank: "IV", lp: 70, wins: 9, losses: 13, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-lionnel", [
      { daysAgo: 14, h: 3, placement: 3, duration: 2350 },
      { daysAgo: 12, h: 1, placement: 4, duration: 2200 },
      { daysAgo: 10, h: 2, placement: 5, duration: 1950 },
      { daysAgo: 7,  h: 1, placement: 4, duration: 2150 },
      { daysAgo: 5,  h: 3, placement: 6, duration: 1800 },
      { daysAgo: 3,  h: 2, placement: 3, duration: 2300 },
      { daysAgo: 2,  h: 1, placement: 1, duration: 2750 },
      { daysAgo: 1,  h: 3, placement: 2, duration: 2550 },
      { daysAgo: 0,  h: 2, placement: 2, duration: 2500 },
    ]),
    history: buildHistoryFromLP(
      [2180, 2160, 2130, 2110, 2100, 2090, 2070, 2050, 2030, 2010, 1960, 1970, 1990, 2000, 2070]
    ),
  },

  {
    puuid: "mock-puuid-nisca",
    gameName: "Nisca",
    tagLine: "CREAM",
    summonerId: "",
    region: "na1",
    profileIconId: 2569,
    current: { tier: "EMERALD", rank: "III", lp: 50, wins: 12, losses: 10, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-nisca", [
      { daysAgo: 15, h: 2, placement: 1, duration: 2750 },
      { daysAgo: 15, h: 5, placement: 2, duration: 2600 },
      { daysAgo: 14, h: 1, placement: 1, duration: 2800 },
      { daysAgo: 14, h: 4, placement: 3, duration: 2500 },
      { daysAgo: 13, h: 2, placement: 2, duration: 2500 },
      { daysAgo: 13, h: 5, placement: 1, duration: 2750 },
      { daysAgo: 12, h: 2, placement: 2, duration: 2600 },
      { daysAgo: 12, h: 5, placement: 1, duration: 2800 },
      { daysAgo: 11, h: 1, placement: 1, duration: 2750 },
      { daysAgo: 11, h: 4, placement: 2, duration: 2600 },
      { daysAgo: 10, h: 2, placement: 1, duration: 2700 },
      { daysAgo: 10, h: 5, placement: 2, duration: 2550 },
      { daysAgo: 9,  h: 1, placement: 1, duration: 2800 },
      { daysAgo: 9,  h: 3, placement: 2, duration: 2600 },
      { daysAgo: 8,  h: 2, placement: 1, duration: 2750 },
      { daysAgo: 8,  h: 5, placement: 3, duration: 2500 },
      { daysAgo: 7,  h: 2, placement: 1, duration: 2850 },
      { daysAgo: 7,  h: 5, placement: 2, duration: 2650 },
      { daysAgo: 6,  h: 1, placement: 1, duration: 2800 },
      { daysAgo: 6,  h: 4, placement: 2, duration: 2600 },
      { daysAgo: 5,  h: 1, placement: 3, duration: 2300 },
      { daysAgo: 5,  h: 4, placement: 1, duration: 2750 },
      { daysAgo: 4,  h: 2, placement: 2, duration: 2450 },
      { daysAgo: 4,  h: 5, placement: 1, duration: 2700 },
      { daysAgo: 3,  h: 1, placement: 1, duration: 2800 },
      { daysAgo: 3,  h: 4, placement: 2, duration: 2600 },
      { daysAgo: 2,  h: 3, placement: 1, duration: 2700 },
      { daysAgo: 2,  h: 6, placement: 2, duration: 2550 },
      { daysAgo: 1,  h: 1, placement: 2, duration: 2550 },
      { daysAgo: 1,  h: 4, placement: 1, duration: 2750 },
      { daysAgo: 0,  h: 2, placement: 1, duration: 2800 },
      { daysAgo: 0,  h: 5, placement: 2, duration: 2650 },
    ]),
    history: buildHistoryFromLP(
      [1780, 1790, 1820, 1840, 1850, 1870, 1900, 1920, 1940, 1960, 1990, 2020, 2050, 2080, 2150]
    ),
  },

  {
    puuid: "mock-puuid-goldeen",
    gameName: "Goldeen",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 747,
    current: { tier: "EMERALD", rank: "III", lp: 10, wins: 10, losses: 12, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-goldeen", [
      { daysAgo: 14, h: 1, placement: 4, duration: 2200 },
      { daysAgo: 12, h: 2, placement: 5, duration: 1950 },
      { daysAgo: 10, h: 3, placement: 6, duration: 1800 },
      { daysAgo: 7,  h: 1, placement: 7, duration: 1600 },
      { daysAgo: 5,  h: 2, placement: 5, duration: 1900 },
      { daysAgo: 4,  h: 3, placement: 3, duration: 2250 },
      { daysAgo: 2,  h: 1, placement: 2, duration: 2450 },
      { daysAgo: 1,  h: 2, placement: 1, duration: 2700 },
      { daysAgo: 0,  h: 1, placement: 2, duration: 2500 },
    ]),
    history: buildHistoryFromLP(
      [2050, 2030, 2010, 1990, 1990, 1940, 1900, 1850, 1870, 1890, 1920, 1970, 2030, 2030, 2110]
    ),
  },

  {
    puuid: "mock-puuid-mrbonchen",
    gameName: "MrBonChen",
    tagLine: "NA1",
    summonerId: "",
    region: "na1",
    profileIconId: 1,
    current: { tier: "EMERALD", rank: "II", lp: 0, wins: 13, losses: 9, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-mrbonchen", [
      { daysAgo: 14, h: 2, placement: 1, duration: 2850 },
      { daysAgo: 12, h: 3, placement: 2, duration: 2600 },
      { daysAgo: 9,  h: 1, placement: 1, duration: 2800 },
      { daysAgo: 7,  h: 2, placement: 3, duration: 2350 },
      { daysAgo: 5,  h: 3, placement: 5, duration: 1900 },
      { daysAgo: 4,  h: 1, placement: 6, duration: 1750 },
      { daysAgo: 2,  h: 2, placement: 2, duration: 2500 },
      { daysAgo: 1,  h: 1, placement: 1, duration: 2750 },
      { daysAgo: 0,  h: 2, placement: 2, duration: 2600 },
    ]),
    history: buildHistoryFromLP(
      [2300, 2280, 2260, 2230, 2200, 2170, 2140, 2100, 2070, 2040, 2000, 2050, 2100, 2150, 2200]
    ),
  },

  {
    puuid: "mock-puuid-konaries",
    gameName: "KoN Aries",
    tagLine: "Liar",
    summonerId: "",
    region: "na1",
    profileIconId: 4007,
    current: { tier: "PLATINUM", rank: "II", lp: 55, wins: 8, losses: 14, lastUpdated: new Date().toISOString() },
    matches: buildMatches("mock-puuid-konaries", [
      { daysAgo: 13, h: 2, placement: 6, duration: 1800 },
      { daysAgo: 11, h: 1, placement: 7, duration: 1600 },
      { daysAgo: 9,  h: 3, placement: 5, duration: 1850 },
      { daysAgo: 7,  h: 2, placement: 4, duration: 2100 },
      { daysAgo: 5,  h: 1, placement: 8, duration: 1400 },
      { daysAgo: 4,  h: 2, placement: 3, duration: 2300 },
      { daysAgo: 2,  h: 3, placement: 6, duration: 1750 },
      { daysAgo: 1,  h: 1, placement: 2, duration: 2550 },
      { daysAgo: 0,  h: 2, placement: 5, duration: 1900 },
    ]),
    history: buildHistoryFromLP(
      [1820, 1800, 1780, 1760, 1750, 1730, 1710, 1690, 1720, 1750, 1780, 1800, 1820, 1810, 1855]
    ),
  },
];

// ⚠️  PRODUCTION GUARD — do not remove NODE_ENV check.
export function isMockMode() {
  return !process.env.KV_REST_API_URL && process.env.NODE_ENV !== "production";
}

export function getMockPlayer(puuid: string) {
  return MOCK_PLAYERS.find((p) => p.puuid === puuid) ?? null;
}
