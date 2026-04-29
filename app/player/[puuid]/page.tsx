"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ArrowLeft, Trophy, Gamepad2, Clock, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { formatPlaytime, formatRank, percentOf, SET_START, SET_END } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────

interface PlayerData {
  puuid: string;
  gameName: string;
  tagLine: string;
  current: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    lastUpdated: string;
  } | null;
  matches: {
    matchId: string;
    placement: number;
    duration: number;
    timestamp: number;
  }[];
  history: {
    date: string;
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
  }[];
}

// ── Styled ───────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xl};
  padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 11px;
  color: ${({ theme }) => theme.semantic.color.textMuted};
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.accent};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const PlayerName = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PlayerTag = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  text-transform: none;
  letter-spacing: 0;
`;

const RankBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 12px;
  color: ${({ theme }) => theme.semantic.color.accent};
  background: ${({ theme }) => theme.semantic.color.accentHover};
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  width: fit-content;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.primitive.spacing.md};
`;

const StatLabel = styled.span`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 10px;
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

const StatValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xl};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const ChartContainer = styled.div`
  height: 320px;
  width: 100%;
  margin-top: ${({ theme }) => theme.primitive.spacing.md};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

const MatchList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;
`;

const MatchRow = styled.div<{ $top4: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
  background: ${({ theme }) => theme.component.table.headerBg};
  border-left: 3px solid ${({ $top4, theme }) =>
    $top4 ? theme.semantic.color.accent : "transparent"};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.component.table.rowHoverBg};
  }
`;

const MatchPlacement = styled.span<{ $place: number }>`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  min-width: 32px;
  color: ${({ $place, theme }) => {
    if ($place === 1) return theme.semantic.color.accent;
    if ($place <= 4) return theme.semantic.color.info;
    return theme.semantic.color.textMuted;
  }};
`;

const MatchMeta = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: 11px;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;

const LoadingText = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  ${({ theme }) => theme.semantic.typography.data};
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

// ── Component ────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PlayerDrilldownPage() {
  const { puuid } = useParams<{ puuid: string }>();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${puuid}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setPlayer(data);
      })
      .finally(() => setLoading(false));
  }, [puuid]);

  const sortedMatches = useMemo(() => {
    if (!player) return [];
    return [...player.matches].sort((a, b) => a.timestamp - b.timestamp);
  }, [player]);

  const chartData = useMemo(() => {
    return sortedMatches.map((m, i) => ({
      game: i + 1,
      placement: m.placement,
      date: formatDate(m.timestamp),
    }));
  }, [sortedMatches]);

  // Running average line data
  const avgData = useMemo(() => {
    let sum = 0;
    return chartData.map((d, i) => {
      sum += d.placement;
      return { ...d, avg: parseFloat((sum / (i + 1)).toFixed(2)) };
    });
  }, [chartData]);

  if (loading) return <LoadingText>Loading...</LoadingText>;
  if (!player) return <LoadingText>Player not found.</LoadingText>;

  const totalGames = player.matches.length;
  const top4 = player.matches.filter((m) => m.placement <= 4).length;
  const firsts = player.matches.filter((m) => m.placement === 1).length;
  const totalDuration = player.matches.reduce((s, m) => s + m.duration, 0);

  return (
    <Page>
      <BackLink href="/">
        <ArrowLeft size={14} />
        BACK TO WEEKLY STATS
      </BackLink>

      <PlayerHeader>
        <PlayerName>
          {player.gameName}
          <PlayerTag> #{player.tagLine}</PlayerTag>
        </PlayerName>
        {player.current && (
          <RankBadge>
            {formatRank(player.current.tier, player.current.rank, player.current.lp)}
            &nbsp;&middot;&nbsp;{player.current.wins}W {player.current.losses}L
          </RankBadge>
        )}
      </PlayerHeader>

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>TOTAL GAMES</StatLabel>
            <Gamepad2 size={14} color="#e5c587" />
          </StatRow>
          <StatValue>{totalGames}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>TOP 4 RATE</StatLabel>
            <Trophy size={14} color="#e5c587" />
          </StatRow>
          <StatValue>{percentOf(top4, totalGames)}%</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>1ST PLACE RATE</StatLabel>
            <TrendingUp size={14} color="#00fbfb" />
          </StatRow>
          <StatValue>{percentOf(firsts, totalGames)}%</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>TIME PLAYED</StatLabel>
            <Clock size={14} color="#00fbfb" />
          </StatRow>
          <StatValue>{formatPlaytime(totalDuration)}</StatValue>
        </GlassCard>
      </StatsGrid>

      <GlassCard title="PLACEMENT PER GAME" icon={TrendingUp}>
        <ChartContainer>
          {avgData.length === 0 ? (
            <EmptyState>No match data.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={avgData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5c58711" vertical={false} />
                <XAxis
                  dataKey="game"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }}
                  dy={10}
                  label={{ value: "Game #", position: "insideBottomRight", offset: -5, fill: "#d0c5b566", fontSize: 10, fontFamily: "Space Grotesk" }}
                />
                <YAxis
                  reversed
                  domain={[1, 8]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }}
                  width={30}
                />
                <ReferenceLine y={4.5} stroke="#e5c58733" strokeDasharray="6 4" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18202b",
                    border: "1px solid #e5c58733",
                    borderRadius: "4px",
                    fontFamily: "Space Grotesk",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#d0c5b5" }}
                  labelFormatter={(label) => {
                    const d = avgData[Number(label) - 1];
                    return d ? `Game ${label} (${d.date})` : `Game ${label}`;
                  }}
                  formatter={(value, name) => {
                    if (name === "avg") return [`${Number(value).toFixed(2)}`, "Running Avg"];
                    return [value, "Placement"];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="placement"
                  stroke="#e5c587"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: "#e5c587" }}
                  name="placement"
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#00fbfb"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  name="avg"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </GlassCard>

      <GlassCard title="MATCH HISTORY">
        <MatchList>
          {[...sortedMatches].reverse().map((m) => (
            <MatchRow key={m.matchId} $top4={m.placement <= 4}>
              <MatchPlacement $place={m.placement}>
                #{m.placement}
              </MatchPlacement>
              <MatchMeta>{formatPlaytime(m.duration)}</MatchMeta>
              <MatchMeta>{formatDateTime(m.timestamp)}</MatchMeta>
            </MatchRow>
          ))}
        </MatchList>
      </GlassCard>
    </Page>
  );
}
