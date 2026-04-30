import { useMemo, useState } from "react";
import {
  formatRank,
  formatRankAbbr,
  percentOf,
  rankToLP,
  formatPlaytime,
  SET_START,
  SET_END,
} from "@/lib/utils";
import type { PlayerCurrentStats, MatchRecord } from "@/lib/kv";

// ── Types ────────────────────────────────────────────────────────

export interface PlayerRowInput {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  current: PlayerCurrentStats | null;
  matches: MatchRecord[];
}

export interface PlayerRowData {
  puuid: string;
  gameName: string;
  tagLine: string;
  name: string; // gameName#tagLine
  profileIconId?: number;
  rank: string;
  rankAbbr: string;
  tier: string;
  rankLP: number;
  totalGames: number;
  totalTime: string;
  scopedGames: number;
  top4Rate: string;
  firstRate: string;
  scopedTime: string;
  // Raw numerics for sorting
  gamesNum: number;
  top4RateNum: number;
  firstRateNum: number;
  timeNum: number;
}

export type SortKey = "name" | "rankLP" | "games" | "top4Rate" | "firstRate" | "time";

// ── Hook ─────────────────────────────────────────────────────────

export function usePlayerRows(
  players: PlayerRowInput[],
  selectedTab: "set" | number,
  weeks: { label: string; start: number; end: number }[],
) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const isSet = selectedTab === "set";
  const win = isSet
    ? { start: SET_START, end: SET_END }
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);

  const rows = useMemo(
    () =>
      players.map((p) => {
        const setMatches = p.matches.filter(
          (m) => m.timestamp >= SET_START && m.timestamp < SET_END,
        );
        const totalGames = setMatches.length;
        const totalDuration = setMatches.reduce((s, m) => s + m.duration, 0);

        const scopedMatches = p.matches.filter(
          (m) => m.timestamp >= win.start && m.timestamp < win.end,
        );
        const scopedGames = scopedMatches.length;
        const scopedTop4 = scopedMatches.filter((m) => m.placement <= 4).length;
        const scopedFirsts = scopedMatches.filter((m) => m.placement === 1).length;
        const scopedDuration = scopedMatches.reduce((s, m) => s + m.duration, 0);

        return {
          puuid: p.puuid,
          gameName: p.gameName,
          tagLine: p.tagLine,
          name: `${p.gameName}#${p.tagLine}`,
          profileIconId: p.profileIconId,
          rank: formatRank(p.current?.tier, p.current?.rank, p.current?.lp),
          rankAbbr: p.current
            ? formatRankAbbr(p.current.tier, p.current.rank, p.current.lp)
            : "Unranked",
          tier: p.current?.tier ?? "",
          rankLP: p.current
            ? rankToLP(p.current.tier, p.current.rank, p.current.lp)
            : -1,
          totalGames,
          totalTime: formatPlaytime(totalDuration),
          scopedGames,
          top4Rate: percentOf(scopedTop4, scopedGames),
          firstRate: percentOf(scopedFirsts, scopedGames),
          scopedTime: formatPlaytime(scopedDuration),
          gamesNum: isSet ? totalGames : scopedGames,
          top4RateNum: scopedGames > 0 ? (scopedTop4 / scopedGames) * 100 : 0,
          firstRateNum: scopedGames > 0 ? (scopedFirsts / scopedGames) * 100 : 0,
          timeNum: isSet ? totalDuration : scopedDuration,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, selectedTab, weeks],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case "name":      av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case "rankLP":    av = a.rankLP;              bv = b.rankLP;             break;
        case "games":     av = a.gamesNum;            bv = b.gamesNum;           break;
        case "top4Rate":  av = a.top4RateNum;         bv = b.top4RateNum;        break;
        case "firstRate": av = a.firstRateNum;        bv = b.firstRateNum;       break;
        case "time":      av = a.timeNum;             bv = b.timeNum;            break;
        default: return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  return { sortedRows, sortKey, sortDir, toggleSort, isSet };
}
