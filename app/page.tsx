"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import { RefreshCw, Clock, Trophy, Gamepad2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PlayerTable } from "@/components/PlayerTable";
import { RankChart } from "@/components/RankChart";
import { formatPlaytime, percentOf, getSetWeeks, SET_START, SET_END } from "@/lib/utils";
import { theme } from "@/styles/theme";

// ── Styled ───────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
  padding: ${({ theme }) => theme.primitive.spacing.lg} 0;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.xl};
    padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
  }
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

  > div:first-child {
    min-width: 0;
  }
`;

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  overflow-wrap: break-word;
  word-break: break-word;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  }

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
  align-self: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.lg};
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  ${({ theme }) => theme.semantic.typography.label};
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

const PageTabBar = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: flex;
    gap: ${({ theme }) => theme.primitive.spacing.xs};
    overflow-x: auto;
    padding-bottom: ${({ theme }) => theme.primitive.spacing.sm};

    &::-webkit-scrollbar {
      height: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.semantic.color.borderDefault};
      border-radius: ${({ theme }) => theme.primitive.radius.full};
    }
  }
`;

const PageTabSelect = styled.select`
  display: block;
  width: 100%;
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
  min-height: 44px;
  background: ${({ theme }) => theme.component.glassCard.bg};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  letter-spacing: 0.05em;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23e5c587' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${({ theme }) => theme.primitive.spacing.md} center;
  padding-right: ${({ theme }) => theme.primitive.spacing.xl};

  option {
    background: ${({ theme }) => theme.primitive.color.neutral850};
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const PageTab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
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
      $active ? theme.semantic.color.accentHover : theme.semantic.color.borderDim};
  }
`;

const WeekDate = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
  letter-spacing: 0.05em;
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
  opacity: 0.6;
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
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

const StatValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xl};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  }
`;

// ── Types ────────────────────────────────────────────────────────

interface PlayerData {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
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

// ── Helpers ──────────────────────────────────────────────────────

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Component ────────────────────────────────────────────────────

export default function WeeklyStatsPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const weeks = useMemo(() => getSetWeeks(), []);

  const [selectedTab, setSelectedTab] = useState<"set" | number>(() => {
    const now = Date.now();
    const ws = getSetWeeks();
    let idx = 0;
    for (let i = 0; i < ws.length; i++) {
      if (ws[i].start <= now) idx = i;
    }
    return idx;
  });

  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedTab]);

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

  const summaryStats = useMemo(() => {
    const all = players.flatMap((p) => p.matches);
    let start: number, end: number, label: string;
    if (selectedTab === "set") {
      start = SET_START;
      end = SET_END;
      label = "THIS SET";
    } else {
      const w = weeks[selectedTab] ?? weeks[weeks.length - 1];
      start = w.start;
      end = w.end;
      label = w.label.toUpperCase();
    }
    const ms = all.filter((m) => m.timestamp >= start && m.timestamp < end);
    return {
      label,
      games: ms.length,
      playtime: ms.reduce((s, m) => s + m.duration, 0),
      top4: ms.filter((m) => m.placement <= 4).length,
      total: ms.length,
    };
  }, [players, selectedTab, weeks]);

  const isSet = selectedTab === "set";

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>The Asylum Weekly Stats</PageTitle>
          <PageSubtitle>
            {isSet ? "Squad performance this set" : "Squad performance this week"}
          </PageSubtitle>
        </div>
        <SyncButton onClick={handleSync} disabled={syncing}>
          <SpinningIcon size={16} $spinning={syncing} />
          <span>{syncing ? "SYNCING..." : "SYNC NOW"}</span>
        </SyncButton>
      </PageHeader>

      {/* Mobile: dropdown */}
      <PageTabSelect
        value={selectedTab === "set" ? "set" : String(selectedTab)}
        onChange={(e) => {
          const v = e.target.value;
          setSelectedTab(v === "set" ? "set" : parseInt(v, 10));
        }}
      >
        <option value="set">This Set</option>
        {weeks.map((w, i) => (
          <option key={i} value={String(i)}>
            {w.label} ({formatShortDate(w.start)}–{formatShortDate(w.end)})
          </option>
        ))}
      </PageTabSelect>

      {/* Desktop: tab bar */}
      <PageTabBar ref={tabBarRef}>
        <PageTab
          $active={selectedTab === "set"}
          data-active={selectedTab === "set" ? "true" : undefined}
          onClick={() => setSelectedTab("set")}
        >
          This Set
        </PageTab>
        {weeks.map((w, i) => (
          <PageTab
            key={i}
            $active={selectedTab === i}
            data-active={selectedTab === i ? "true" : undefined}
            onClick={() => setSelectedTab(i)}
          >
            {w.label}
            <WeekDate>
              {formatShortDate(w.start)}–{formatShortDate(w.end)}
            </WeekDate>
          </PageTab>
        ))}
      </PageTabBar>

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>GAMES {summaryStats.label}</StatLabel>
            <Gamepad2 size={16} color={theme.semantic.color.accent} />
          </StatRow>
          <StatValue>{loading ? "..." : summaryStats.games}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>SQUAD PLAYTIME</StatLabel>
            <Clock size={16} color={theme.semantic.color.info} />
          </StatRow>
          <StatValue>{loading ? "..." : formatPlaytime(summaryStats.playtime)}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>AVG TOP 4 RATE</StatLabel>
            <Trophy size={16} color={theme.semantic.color.accent} />
          </StatRow>
          <StatValue>
            {loading ? "..." : `${percentOf(summaryStats.top4, summaryStats.total)}%`}
          </StatValue>
        </GlassCard>
      </StatsGrid>

      <PlayerTable
        players={players.map((p) => ({
          puuid: p.puuid,
          gameName: p.gameName,
          tagLine: p.tagLine,
          profileIconId: p.profileIconId,
          current: p.current,
          matches: p.matches,
          history: p.history,
        }))}
        selectedTab={selectedTab}
        weeks={weeks}
      />

      <RankChart
        players={players.map((p) => ({
          gameName: p.gameName,
          history: p.history,
        }))}
        selectedTab={selectedTab}
        weeks={weeks}
      />
    </Page>
  );
}
