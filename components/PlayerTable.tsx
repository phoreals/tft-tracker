"use client";

import React from "react";
import styled from "styled-components";
import { Star } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { formatPlaytime, formatRank, percentOf, getStartOfWeek } from "@/lib/utils";
import type { PlayerCurrentStats, MatchRecord } from "@/lib/kv";

// ── Styled ───────────────────────────────────────────────────────

const TableWrap = styled.div`
  overflow-x: auto;
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
    padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
    font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
    font-size: ${({ theme }) => theme.primitive.fontSize.xs};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${({ theme }) => theme.semantic.color.textDisabled};
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
    padding: 20px ${({ theme }) => theme.primitive.spacing.lg};
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
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  letter-spacing: 0.05em;
`;

const RankCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const RankDot = styled.div<{ $ranked: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $ranked, theme }) =>
    $ranked ? theme.semantic.color.accentDark : theme.semantic.color.textDisabled};
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
  gameName: string;
  tagLine: string;
  current: PlayerCurrentStats | null;
  matches: MatchRecord[];
}

interface PlayerTableProps {
  players: PlayerRow[];
}

export function PlayerTable({ players }: PlayerTableProps) {
  const weekStart = getStartOfWeek().getTime();

  const rows = players.map((p) => {
    const totalGames = p.matches.length;
    const weeklyMatches = p.matches.filter((m) => m.timestamp >= weekStart);
    const weeklyGames = weeklyMatches.length;
    const top4 = p.matches.filter((m) => m.placement <= 4).length;
    const firsts = p.matches.filter((m) => m.placement === 1).length;
    const totalDuration = p.matches.reduce((s, m) => s + m.duration, 0);
    const weeklyDuration = weeklyMatches.reduce((s, m) => s + m.duration, 0);

    return {
      name: `${p.gameName}#${p.tagLine}`,
      rank: formatRank(p.current?.tier, p.current?.rank, p.current?.lp),
      tier: p.current?.tier ?? "",
      totalGames,
      weeklyGames,
      top4Rate: percentOf(top4, totalGames),
      firstRate: percentOf(firsts, totalGames),
      totalTime: formatPlaytime(totalDuration),
      weeklyTime: formatPlaytime(weeklyDuration),
    };
  });

  return (
    <GlassCard style={{ padding: 0 }} title="PLAYER PERFORMANCE">
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <th>Summoner</th>
              <th>Rank</th>
              <th style={{ textAlign: "center" }}>Total Games</th>
              <th style={{ textAlign: "center" }}>This Week</th>
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
                        <Star size={16} />
                      </SummonerIcon>
                      <SummonerName>{row.name}</SummonerName>
                    </SummonerCell>
                  </td>
                  <td>
                    <RankCell>
                      <RankDot $ranked={row.tier !== "" && row.tier !== "UNRANKED"} />
                      <span style={{ fontSize: 12 }}>{row.rank}</span>
                    </RankCell>
                  </td>
                  <CenterCell>{row.totalGames}</CenterCell>
                  <WeeklyCell>{row.weeklyGames}</WeeklyCell>
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
                    {row.weeklyTime}
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
