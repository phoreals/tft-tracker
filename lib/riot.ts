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

// --- Summoner ---

interface SummonerDTO {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate: number;
}

export async function getSummonerByPuuid(puuid: string): Promise<SummonerDTO> {
  return riotFetch<SummonerDTO>(
    `${PLATFORM_HOST}/tft/summoner/v1/summoners/by-puuid/${puuid}`
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
  count = 100,
  startTime?: number,
): Promise<string[]> {
  const params = new URLSearchParams({ start: "0", count: String(count) });
  if (startTime != null) params.set("start_time", String(startTime));
  return riotFetch<string[]>(
    `${REGIONAL_HOST}/tft/match/v1/matches/by-puuid/${puuid}/ids?${params}`
  );
}

// Fetch all match IDs by paginating through the API.
// Pass startTime (Unix seconds) to scope to a specific time window.
export async function getAllMatchIds(puuid: string, startTime?: number): Promise<string[]> {
  const all: string[] = [];
  let start = 0;
  const pageSize = 100;
  while (true) {
    const params = new URLSearchParams({ start: String(start), count: String(pageSize) });
    if (startTime != null) params.set("start_time", String(startTime));
    const batch = await riotFetch<string[]>(
      `${REGIONAL_HOST}/tft/match/v1/matches/by-puuid/${puuid}/ids?${params}`
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
