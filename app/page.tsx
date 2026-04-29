"use client";

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { RefreshCw, Clock, Trophy, Gamepad2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PlayerTable } from "@/components/PlayerTable";
import { RankChart } from "@/components/RankChart";
import { formatPlaytime, getStartOfWeek, percentOf } from "@/lib/utils";

// ── Styled ───────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xl};
  padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }
`;

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: 4px;
`;

const SyncButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: 10px 20px;
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 12px;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpinningIcon = styled(RefreshCw)<{ $spinning: boolean }>`
  color: ${({ theme }) => theme.semantic.color.accent};
  animation: ${({ $spinning }) => ($spinning ? "spin 1s linear infinite" : "none")};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
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
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

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

// ── Component ────────────────────────────────────────────────────

export default function WeeklyStatsPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      console.error("Failed to fetch players:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await fetchPlayers();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const weekStart = getStartOfWeek().getTime();
  const allMatches = players.flatMap((p) => p.matches);
  const weeklyMatches = allMatches.filter((m) => m.timestamp >= weekStart);
  const weeklyGames = weeklyMatches.length;
  const weeklyPlaytime = weeklyMatches.reduce((s, m) => s + m.duration, 0);
  const weeklyTop4 = weeklyMatches.filter((m) => m.placement <= 4).length;

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>The Asylum Weekly Stats</PageTitle>
          <PageSubtitle>Squad performance this week</PageSubtitle>
        </div>
        <SyncButton onClick={handleSync} disabled={syncing}>
          <SpinningIcon size={16} $spinning={syncing} />
          <span>{syncing ? "SYNCING..." : "SYNC NOW"}</span>
        </SyncButton>
      </PageHeader>

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>GAMES THIS WEEK</StatLabel>
            <Gamepad2 size={16} color="#e5c587" />
          </StatRow>
          <StatValue>{loading ? "..." : weeklyGames}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>SQUAD PLAYTIME</StatLabel>
            <Clock size={16} color="#00fbfb" />
          </StatRow>
          <StatValue>{loading ? "..." : formatPlaytime(weeklyPlaytime)}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>AVG TOP 4 RATE</StatLabel>
            <Trophy size={16} color="#e5c587" />
          </StatRow>
          <StatValue>
            {loading ? "..." : `${percentOf(weeklyTop4, weeklyGames)}%`}
          </StatValue>
        </GlassCard>
      </StatsGrid>

      <PlayerTable
        players={players.map((p) => ({
          gameName: p.gameName,
          tagLine: p.tagLine,
          current: p.current,
          matches: p.matches,
        }))}
      />

      <RankChart
        players={players.map((p) => ({
          gameName: p.gameName,
          history: p.history,
        }))}
      />
    </Page>
  );
}
