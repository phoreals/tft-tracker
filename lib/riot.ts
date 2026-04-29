const RIOT_API_KEY = process.env.RIOT_API_KEY ?? "";

const REGIONAL_HOST = "https://americas.api.riotgames.com";
const PLATFORM_HOST = "https://na1.api.riotgames.com";

async function riotFetch<T>(url: string, retries = 3): Promise<T> {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });

  // Handle rate limiting — wait and retry
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    await delay((retryAfter + 1) * 1000);
    return riotFetch<T>(url, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Riot API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Small delay to respect rate limits when making sequential calls
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Account ---

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  return riotFetch<RiotAccount>(
    `${REGIONAL_HOST}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
}

// --- League ---
// Uses /tft/league/v1/by-puuid/{puuid} — no summoner ID needed.

export interface LeagueEntry {
  puuid: string;
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export async function getLeagueEntries(
  puuid: string
): Promise<LeagueEntry[]> {
  return riotFetch<LeagueEntry[]>(
    `${PLATFORM_HOST}/tft/league/v1/by-puuid/${puuid}`
  );
}

// --- Matches ---

export async function getMatchIds(
  puuid: string,
  count = 100
): Promise<string[]> {
  return riotFetch<string[]>(
    `${REGIONAL_HOST}/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=${count}`
  );
}

// Fetch all match IDs by paginating through the API
export async function getAllMatchIds(puuid: string): Promise<string[]> {
  const all: string[] = [];
  let start = 0;
  const pageSize = 100;
  while (true) {
    const batch = await riotFetch<string[]>(
      `${REGIONAL_HOST}/tft/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${pageSize}`
    );
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
    await delay(150);
  }
  return all;
}

interface MatchParticipant {
  puuid: string;
  placement: number;
  time_eliminated: number;
}

interface MatchInfo {
  game_datetime: number;
  game_length: number;
  participants: MatchParticipant[];
  tft_set_number: number;
}

export interface MatchDetail {
  metadata: { match_id: string; participants: string[] };
  info: MatchInfo;
}

export async function getMatch(matchId: string): Promise<MatchDetail> {
  return riotFetch<MatchDetail>(
    `${REGIONAL_HOST}/tft/match/v1/matches/${matchId}`
  );
}
