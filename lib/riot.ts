const RIOT_API_KEY = process.env.RIOT_API_KEY ?? "";

const REGIONAL_HOST = "https://americas.api.riotgames.com";
const PLATFORM_HOST = "https://na1.api.riotgames.com";

async function riotFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });
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
// The TFT summoner endpoint no longer returns the encrypted summoner ID.
// We use the LoL summoner endpoint instead — the encrypted ID is shared
// across games and works with the TFT league endpoint.

interface SummonerResponse {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export async function getSummonerByPuuid(puuid: string): Promise<{ summonerId: string }> {
  const data = await riotFetch<SummonerResponse>(
    `${PLATFORM_HOST}/lol/summoner/v1/summoners/by-puuid/${puuid}`
  );
  if (!data.id) {
    throw new Error(`Summoner endpoint returned no ID. Response keys: ${Object.keys(data).join(", ")}`);
  }
  return { summonerId: data.id };
}

// --- League ---

export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export async function getLeagueEntries(
  summonerId: string
): Promise<LeagueEntry[]> {
  return riotFetch<LeagueEntry[]>(
    `${PLATFORM_HOST}/tft/league/v1/entries/by-summoner/${summonerId}`
  );
}

// --- Matches ---

export async function getMatchIds(
  puuid: string,
  count = 20
): Promise<string[]> {
  return riotFetch<string[]>(
    `${REGIONAL_HOST}/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${count}`
  );
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
