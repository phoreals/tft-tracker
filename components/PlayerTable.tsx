"use client";

import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { formatPlaytime, formatRank, percentOf, getRankColor, SET_START, SET_END } from "@/lib/utils";
import type { PlayerCurrentStats, MatchRecord } from "@/lib/kv";

// ── Set Schedule ─────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getWeeks(): { label: string; start: number; end: number }[] {
  const weeks: { label: string; start: number; end: number }[] = [];
  let start = SET_START;
  let i = 1;
  while (start < SET_END) {
    const end = Math.min(start + WEEK_MS, SET_END);
    weeks.push({ label: `Week ${i}`, start, end });
    start += WEEK_MS;
    i++;
  }
  return weeks;
}

function getCurrentWeekIndex(weeks: { start: number; end: number }[]): number {
  const now = Date.now();
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (now >= weeks[i].start) return i;
  }
  return 0;
}

// ── Styled ───────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.primitive.spacing.sm};
  margin-bottom: ${({ theme }) => theme.primitive.spacing.md};

  /* bleed to card edges so the last tab scrolls fully into view */
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

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(229, 197, 135, 0.2);
    border-radius: 9999px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 11px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.semantic.color.borderHover : "transparent"};
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accentHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active, theme }) =>
      $active ? theme.semantic.color.accentHover : "rgba(255,255,255,0.05)"};
  }
`;

const WeekDate = styled.span`
  display: block;
  font-size: 8px;
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
  letter-spacing: 0.05em;
  margin-top: 2px;
  opacity: 0.6;
`;

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
    text-transform: uppercase;
    letter-spacing: 0.1em;
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
  width: 32px;
  height: 32px;
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
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
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
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 4px;
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

// ── Component ────────────────────────────────────────────────────

interface PlayerRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  current: PlayerCurrentStats | null;
  matches: MatchRecord[];
}

interface PlayerTableProps {
  players: PlayerRow[];
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function PlayerTable({ players }: PlayerTableProps) {
  const weeks = useMemo(() => getWeeks(), []);
  const [selectedWeek, setSelectedWeek] = useState(() => getCurrentWeekIndex(weeks));

  const week = weeks[selectedWeek];

  const rows = players.map((p) => {
    const totalGames = p.matches.length;
    const weekMatches = p.matches.filter(
      (m) => m.timestamp >= week.start && m.timestamp < week.end
    );
    const weekGames = weekMatches.length;
    const weekTop4 = weekMatches.filter((m) => m.placement <= 4).length;
    const weekFirsts = weekMatches.filter((m) => m.placement === 1).length;
    const weekDuration = weekMatches.reduce((s, m) => s + m.duration, 0);
    const totalDuration = p.matches.reduce((s, m) => s + m.duration, 0);

    return {
      puuid: p.puuid,
      name: `${p.gameName}#${p.tagLine}`,
      profileIconId: p.profileIconId,
      rank: formatRank(p.current?.tier, p.current?.rank, p.current?.lp),
      tier: p.current?.tier ?? "",
      totalGames,
      weekGames,
      top4Rate: percentOf(weekTop4, weekGames),
      firstRate: percentOf(weekFirsts, weekGames),
      weekTime: formatPlaytime(weekDuration),
      totalTime: formatPlaytime(totalDuration),
    };
  });

  return (
    <GlassCard title="PLAYER PERFORMANCE">
      <TabBar>
        {weeks.map((w, i) => {
          const isFuture = w.start > Date.now();
          if (isFuture) return null;
          return (
            <Tab key={i} $active={i === selectedWeek} onClick={() => setSelectedWeek(i)}>
              {w.label}
              <WeekDate>
                {formatShortDate(w.start)}-{formatShortDate(w.end)}
              </WeekDate>
            </Tab>
          );
        })}
      </TabBar>
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <th>Summoner</th>
              <th>Rank</th>
              <th style={{ textAlign: "center" }}>Total Games</th>
              <th style={{ textAlign: "center" }}>{week.label}</th>
              <th style={{ textAlign: "center" }}>Top 4%</th>
              <th style={{ textAlign: "center" }}>1st%</th>
              <th style={{ textAlign: "right" }}>Time Played</th>
            </tr>
          </Thead>
          <Tbody>
            {rows.length === 0 ? (
              <tr>
                <EmptyRow colSpan={7}>
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
                          <User size={16} />
                        )}
                      </SummonerIcon>
                      <SummonerName href={`/player/${row.puuid}`}>{row.name}</SummonerName>
                    </SummonerCell>
                  </td>
                  <td>
                    <RankCell>
                      <span style={{ fontSize: 12, color: getRankColor(row.tier) }}>{row.rank}</span>
                    </RankCell>
                  </td>
                  <CenterCell>{row.totalGames}</CenterCell>
                  <WeeklyCell>{row.weekGames}</WeeklyCell>
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
                    {row.weekTime}
                    <TimeSub>{row.totalTime} total</TimeSub>
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
