"use client";

import React, { useMemo } from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ICON_SIZE } from "@/styles/theme";
import {
  formatPlaytime,
  formatRank,
  formatRankShort,
  formatRankAbbr,
  percentOf,
  getRankColor,
  rankToLP,
  SET_START,
  SET_END,
} from "@/lib/utils";
import type { PlayerCurrentStats, MatchRecord, HistorySnapshot } from "@/lib/kv";

// ── Styled ───────────────────────────────────────────────────────

const TableWrap = styled.div`
  overflow-x: auto;
  /* bleed to card edges, then add symmetric padding inside the scroll area */
  margin-left: -${({ theme }) => theme.primitive.spacing.md};
  margin-right: -${({ theme }) => theme.primitive.spacing.md};
  padding-left: ${({ theme }) => theme.primitive.spacing.md};
  padding-right: ${({ theme }) => theme.primitive.spacing.md};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: -${({ theme }) => theme.primitive.spacing.lg};
    margin-right: -${({ theme }) => theme.primitive.spacing.lg};
    padding-left: ${({ theme }) => theme.primitive.spacing.lg};
    padding-right: ${({ theme }) => theme.primitive.spacing.lg};
  }
`;

const Table = styled.table`
  width: 100%;
  text-align: left;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  letter-spacing: 0.02em;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
    background: ${({ theme }) => theme.component.table.headerBg};
  }
  th {
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
    font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
    font-size: ${({ theme }) => theme.primitive.fontSize.xs};
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.semantic.color.textDisabled};

    @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
      padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
    }
  }
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
    transition: background 0.2s;
    &:hover {
      background: ${({ theme }) => theme.component.table.rowHoverBg};
    }
  }
  td {
    padding: 12px ${({ theme }) => theme.primitive.spacing.md};

    @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
      padding: 20px ${({ theme }) => theme.primitive.spacing.lg};
    }
  }
`;

const SummonerCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const SummonerIcon = styled.div`
  width: ${ICON_SIZE.avatar}px;
  height: ${ICON_SIZE.avatar}px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerName = styled(Link)`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.accent};
  }
`;

const RankCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
`;

const RankSub = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: 9px;
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  letter-spacing: 0.03em;
  margin-top: 2px;
`;

const RankFull = styled.span`
  display: none;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: inline;
  }
`;

const RankAbbr = styled.span`
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const CenterCell = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const WeeklyCell = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.info};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
`;

const Top4Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ProgressTrack = styled.div`
  width: 64px;
  height: ${({ theme }) => theme.component.progressBar.height};
  background: ${({ theme }) => theme.component.progressBar.trackBg};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  overflow: hidden;
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const ProgressFill = styled.div<{ $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  box-shadow: ${({ theme }) => theme.semantic.shadow.glowGold};
`;

const FirstCell = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.info};
`;

const TimeCell = styled.td`
  text-align: right;
  font-size: 12px;
  color: ${({ theme }) => theme.semantic.color.textSecondary};
`;

const TimeSub = styled.span`
  display: block;
  font-size: 9px;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;

const EmptyRow = styled.td`
  padding: ${({ theme }) => theme.primitive.spacing["2xl"]} ${({ theme }) => theme.primitive.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

// ── Types ────────────────────────────────────────────────────────

interface PlayerRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  current: PlayerCurrentStats | null;
  matches: MatchRecord[];
  history: HistorySnapshot[];
}

interface PlayerTableProps {
  players: PlayerRow[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number; weekNumber: number }[];
}

// ── Helpers ──────────────────────────────────────────────────────

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getPeakAndLow(
  history: HistorySnapshot[],
  window: { start: number; end: number }
): { peak: HistorySnapshot | null; low: HistorySnapshot | null } {
  const snaps = history.filter((h) => {
    const t = new Date(h.date).getTime();
    return t >= window.start && t < window.end;
  });
  if (snaps.length === 0) return { peak: null, low: null };
  const sorted = [...snaps].sort(
    (a, b) => rankToLP(a.tier, a.rank, a.lp) - rankToLP(b.tier, b.rank, b.lp)
  );
  const peak = sorted[sorted.length - 1];
  const low = sorted[0];
  return { peak, low: rankToLP(peak.tier, peak.rank, peak.lp) === rankToLP(low.tier, low.rank, low.lp) ? null : low };
}

// ── RankEmblem ───────────────────────────────────────────────────
// Renders the CDN mini crest image; falls back to a tier-colored square so
// any missing emblems (e.g. Emerald on older CDN paths) still show tier color.

function RankEmblem({ tier, size, color }: { tier: string; size: number; color: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 2,
          background: color,
          opacity: 0.85,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.png`}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Component ────────────────────────────────────────────────────

export function PlayerTable({ players, selectedTab, weeks }: PlayerTableProps) {
  const isSet = selectedTab === "set";
  const win = isSet
    ? { start: SET_START, end: SET_END }
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
  const week = isSet ? null : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);

  const rows = useMemo(() => players.map((p) => {
    const totalGames = p.matches.length;
    const totalDuration = p.matches.reduce((s, m) => s + m.duration, 0);

    const scopedMatches = p.matches.filter(
      (m) => m.timestamp >= win.start && m.timestamp < win.end
    );
    const scopedGames = scopedMatches.length;
    const scopedTop4 = scopedMatches.filter((m) => m.placement <= 4).length;
    const scopedFirsts = scopedMatches.filter((m) => m.placement === 1).length;
    const scopedDuration = scopedMatches.reduce((s, m) => s + m.duration, 0);

    const { peak, low } = getPeakAndLow(p.history, win);

    return {
      puuid: p.puuid,
      name: `${p.gameName}#${p.tagLine}`,
      profileIconId: p.profileIconId,
      rank: formatRank(p.current?.tier, p.current?.rank, p.current?.lp),
      rankAbbr: p.current ? formatRankAbbr(p.current.tier, p.current.rank, p.current.lp) : "Unranked",
      tier: p.current?.tier ?? "",
      totalGames,
      totalTime: formatPlaytime(totalDuration),
      scopedGames,
      top4Rate: percentOf(scopedTop4, scopedGames),
      firstRate: percentOf(scopedFirsts, scopedGames),
      scopedTime: formatPlaytime(scopedDuration),
      peakRank: peak,
      lowRank: low,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [players, selectedTab, weeks]);

  const colSpan = isSet ? 6 : 7;

  return (
    <GlassCard title="Player Performance">
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <th>Summoner</th>
              <th>Rank</th>
              <th style={{ textAlign: "center" }}>Total Games</th>
              {!isSet && (
                <th style={{ textAlign: "center" }}>
                  {week ? `${week.label} (${formatShortDate(week.start)}–${formatShortDate(week.end)})` : ""}
                </th>
              )}
              <th style={{ textAlign: "center" }}>Top 4%</th>
              <th style={{ textAlign: "center" }}>1st%</th>
              <th style={{ textAlign: "right" }}>Time Played</th>
            </tr>
          </Thead>
          <Tbody>
            {rows.length === 0 ? (
              <tr>
                <EmptyRow colSpan={colSpan}>
                  No players tracked yet. Add players to get started.
                </EmptyRow>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <SummonerCell>
                      <SummonerIcon>
                        {row.profileIconId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${row.profileIconId}.jpg`}
                            alt=""
                            width={32}
                            height={32}
                            style={{ display: "block" }}
                          />
                        ) : (
                          <User size={ICON_SIZE.md} />
                        )}
                      </SummonerIcon>
                      <SummonerName href={`/player/${row.puuid}`}>{row.name}</SummonerName>
                    </SummonerCell>
                  </td>
                  <td>
                    <RankCell>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {row.tier && (
                          <RankEmblem tier={row.tier} size={ICON_SIZE.md} color={getRankColor(row.tier)} />
                        )}
                        <span style={{ fontSize: 12, color: getRankColor(row.tier) }}>
                          <RankFull>{row.rank}</RankFull>
                          <RankAbbr>{row.rankAbbr}</RankAbbr>
                        </span>
                      </div>
                      {row.peakRank && (
                        <RankSub>
                          <RankFull>Peak: {formatRankShort(row.peakRank.tier, row.peakRank.rank, row.peakRank.lp)}</RankFull>
                          <RankAbbr>Peak: {formatRankAbbr(row.peakRank.tier, row.peakRank.rank, row.peakRank.lp)}</RankAbbr>
                        </RankSub>
                      )}
                      {!isSet && row.lowRank && (
                        <RankSub>
                          <RankFull>Low: {formatRankShort(row.lowRank.tier, row.lowRank.rank, row.lowRank.lp)}</RankFull>
                          <RankAbbr>Low: {formatRankAbbr(row.lowRank.tier, row.lowRank.rank, row.lowRank.lp)}</RankAbbr>
                        </RankSub>
                      )}
                    </RankCell>
                  </td>
                  <CenterCell>{row.totalGames}</CenterCell>
                  {!isSet && <WeeklyCell>{row.scopedGames}</WeeklyCell>}
                  <CenterCell>
                    <Top4Wrap>
                      <span>{row.top4Rate}%</span>
                      <ProgressTrack>
                        <ProgressFill $width={parseFloat(row.top4Rate)} />
                      </ProgressTrack>
                    </Top4Wrap>
                  </CenterCell>
                  <FirstCell>{row.firstRate}%</FirstCell>
                  <TimeCell>
                    {isSet ? row.totalTime : row.scopedTime}
                    {!isSet && <TimeSub>{row.totalTime} total</TimeSub>}
                  </TimeCell>
                </tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableWrap>
    </GlassCard>
  );
}
