"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import styled from "styled-components";
import { RefreshCw, Clock, Trophy, Gamepad2, User } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { TabNavigation } from "@/components/TabNavigation";
import { PlayerTable } from "@/components/PlayerTable";
import { RankChart } from "@/components/RankChart";
import { getSetWeeks, SET_START, SET_END, SET_LABEL, computePlayerStats, SUPERLATIVE_CATEGORIES, findLeader } from "@/lib/utils";
import { useSelectedTab } from "@/hooks/useSelectedTab";
import { PlaytimeDisplay } from "@/components/PlaytimeDisplay";
import { theme, ICON_SIZE } from "@/styles/theme";

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
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  overflow-wrap: break-word;
  word-break: break-word;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: 4px;
`;

const SyncButton = styled.button`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing.sm};
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

  &:active:not(:disabled) {
    filter: brightness(0.85);
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

const SyncWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    align-items: flex-end;
  }
`;

const SyncStatus = styled.p<{ $tone: "muted" | "warn" | "error" }>`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme, $tone }) =>
    $tone === "error"
      ? theme.semantic.color.info
      : $tone === "warn"
        ? theme.semantic.color.accent
        : theme.semantic.color.textMuted};
  margin: 0;
  white-space: pre-line;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const StatLabel = styled.span`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textMuted};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: 12px;
  }
`;

const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.accent};
  flex-shrink: 0;
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

// Wraps unit indicators (%, LP, d/h/m, LP/game) in stat values.
// Currently unstyled — kept as a semantic marker for future visual treatment.
const StatUnit = styled.span``;

const SuperlativesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const PlayerChip = styled(Link)`
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.xs};
  margin-left: -${({ theme }) => theme.primitive.spacing.xs};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  text-decoration: none;
  color: inherit;
  position: relative;
  z-index: 1;
  transition: background 0.2s;
  max-width: calc(100% + ${({ theme }) => theme.primitive.spacing.xs});

  &:hover {
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
  }

  @media (hover: none) {
    &:hover {
      background: none;
    }
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgActive};
  }
`;

const ChipIcon = styled.div`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.component.glassCard.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

const ChipName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

const ChipTag = styled.span`
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
`;

const SuperlativeCardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  min-width: 0;
  border-radius: ${({ theme }) => theme.component.glassCard.radius};
  transition: transform 0.15s;

  & > * {
    flex: 1;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &:hover ${ChipName} {
    color: ${({ theme }) => theme.semantic.color.accent};
  }

  &:active {
    transform: translateY(0);
    background: rgba(229, 197, 135, 0.04);
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
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function renderStatValue(s: string): React.ReactNode {
  if (!s || s === "—" || s === "...") return s;
  // Plain integer (game count, win count)
  if (/^\d+$/.test(s)) return s;
  // Time format: "1d 23h 24m" — dim the unit letters
  if (/\d+[dhm]/.test(s)) {
    const segments: React.ReactNode[] = [];
    const regex = /(\d+)([dhm])\s*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(s)) !== null) {
      if (match.index > last) segments.push(s.slice(last, match.index));
      segments.push(match[1]);
      segments.push(<StatUnit key={match.index}>{match[2]} </StatUnit>);
      last = match.index + match[0].length;
    }
    if (last < s.length) segments.push(s.slice(last));
    return <>{segments}</>;
  }
  // LP/game: "+4.3 LP/game" or "-2.1 LP/game"
  if (s.endsWith(" LP/game")) return <>{s.slice(0, -8)}<StatUnit> LP/game</StatUnit></>;
  // LP with optional sign: "+45 LP" or "-20 LP"
  if (s.endsWith(" LP")) return <>{s.slice(0, -3)}<StatUnit> LP</StatUnit></>;

  // Percentage: "62.5%"
  if (s.endsWith("%")) return <>{s.slice(0, -1)}<StatUnit>%</StatUnit></>;
  return s;
}

// ── Component ────────────────────────────────────────────────────

export default function WeeklyStatsPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ tone: "muted" | "warn" | "error"; message: string } | null>(null);

  const weeks = useMemo(() => getSetWeeks(), []);
  const [selectedTab, setSelectedTab] = useSelectedTab();

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players", { cache: "no-store" });
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
    setSyncStatus(null);

    let pass = 0;
    let totalAdded = 0;

    try {
      while (true) {
        pass++;
        setSyncStatus({ tone: "muted", message: pass === 1 ? "Syncing…" : `Pass ${pass} — ${totalAdded} matches added so far…` });

        const res = await fetch("/api/sync", { method: "POST" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
        }
        const data = await res.json();
        totalAdded += data.totalAdded ?? 0;
        const maxRateLimitMs: number = data.maxRateLimitMs ?? 0;

        const failed = (data.results ?? []).filter((r: { success: boolean }) => !r.success);
        const withErrors = (data.results ?? []).filter((r: { matchErrors: number }) => r.matchErrors > 0);
        const withRemaining = (data.results ?? []).filter((r: { matchesRemaining: number }) => r.matchesRemaining > 0);
        const matchErrCount = withErrors.reduce((s: number, r: { matchErrors: number }) => s + r.matchErrors, 0);

        if (failed.length > 0) {
          await fetchPlayers();
          setSyncStatus({
            tone: "error",
            message: failed.map((r: { name: string; error?: string }) => `${r.name}: ${r.error ?? "unknown error"}`).join("\n"),
          });
          break;
        }

        if (withRemaining.length > 0 || maxRateLimitMs > 0) {
          await fetchPlayers();
          if (maxRateLimitMs > 0) {
            // Rate limited — count down before next pass
            let secsLeft = Math.ceil(maxRateLimitMs / 1000);
            while (secsLeft > 0) {
              setSyncStatus({ tone: "warn", message: `Rate limited — waiting ${secsLeft}s before next pass…` });
              await new Promise((r) => setTimeout(r, 1000));
              secsLeft--;
            }
          } else {
            // More matches to fetch — pause briefly then run another pass
            const remaining = withRemaining.reduce((s: number, r: { matchesRemaining: number }) => s + r.matchesRemaining, 0);
            setSyncStatus({ tone: "muted", message: `Pass ${pass} done — ${remaining} matches remaining, continuing…` });
            await new Promise((r) => setTimeout(r, 1500));
          }
          continue;
        }

        // All caught up
        await fetchPlayers();
        const errNote = matchErrCount > 0 ? ` (${matchErrCount} match fetch error${matchErrCount > 1 ? "s" : ""})` : "";
        setSyncStatus({
          tone: matchErrCount > 0 ? "warn" : "muted",
          message: totalAdded > 0
            ? `All caught up — ${totalAdded} match${totalAdded > 1 ? "es" : ""} added across ${pass} pass${pass > 1 ? "es" : ""}${errNote}`
            : `All players up to date${errNote}`,
        });
        break;
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncStatus({ tone: "error", message: err instanceof Error ? err.message : "Sync request failed — check console" });
    } finally {
      setSyncing(false);
    }
  };

  const summaryStats = useMemo(() => {
    const win = selectedTab === "set"
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
    const all = players.flatMap((p) => p.matches).filter((m) => m.timestamp >= win.start && m.timestamp < win.end);
    return {
      games: all.length,
      playtime: all.reduce((s, m) => s + m.duration, 0),
      top4: all.filter((m) => m.placement <= 4).length,
      firsts: all.filter((m) => m.placement === 1).length,
      total: all.length,
    };
  }, [players, selectedTab, weeks]);

  const superlatives = useMemo(() => {
    if (players.length === 0) return [];

    const win = selectedTab === "set"
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
    const stats = computePlayerStats(players, win);

    const isSetMode = selectedTab === "set";
    const weekNumber = weeks[selectedTab as number]?.weekNumber;
    const period = isSetMode ? SET_LABEL : weekNumber ? `Week ${weekNumber}` : "This Week";
    return SUPERLATIVE_CATEGORIES.map((cat) => {
      const leader = findLeader(stats, cat);
      const val = leader ? leader[cat.key] : null;
      return {
        slug: cat.slug,
        label: cat.title,
        period,
        value: val !== null ? cat.format(val as number) : "—",
        player: leader?.player ?? null,
      };
    });
  }, [players, selectedTab, weeks]);

  const isSet = selectedTab === "set";

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>The Asylum TFT Tracker</PageTitle>
          <PageSubtitle>
            {isSet ? (
              <><strong>{SET_LABEL}</strong>{"\u2002·\u2002"}{formatShortDate(SET_START)}{"\u2009\u2013\u2009"}{formatShortDate(SET_END)}</>
            ) : (() => {
              const w = weeks[selectedTab as number];
              return w ? <><strong>{w.label}</strong>{"\u2002·\u2002"}{formatShortDate(w.start)}{"\u2009\u2013\u2009"}{formatShortDate(w.end)}</> : null;
            })()}
          </PageSubtitle>
        </div>
        <SyncWrap>
          <SyncButton onClick={handleSync} disabled={syncing}>
            <SpinningIcon size={ICON_SIZE.md} $spinning={syncing} />
            <span>{syncing ? "SYNCING..." : "SYNC NOW"}</span>
          </SyncButton>

          {syncStatus && <SyncStatus $tone={syncStatus.tone}>{syncStatus.message}</SyncStatus>}
        </SyncWrap>
      </PageHeader>

      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} weeks={weeks} />

      <SuperlativesGrid>
        {(loading || superlatives.length === 0
          ? SUPERLATIVE_CATEGORIES.map((cat) => ({ slug: cat.slug, label: cat.title, period: "···", value: "...", player: null }))
          : superlatives
        ).map((s) => (
          <SuperlativeCardLink key={s.slug} href={`/superlative/${s.slug}?tab=${selectedTab}`}>
            <GlassCard>
              <StatRow>
                <StatLabel>{s.label}</StatLabel>
                <DurationPill>{s.period}</DurationPill>
              </StatRow>
              <StatValue>{renderStatValue(s.value)}</StatValue>
              {s.player && (
                <PlayerChip href={`/player/${s.player.puuid}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <ChipIcon>
                    {s.player.profileIconId ? (
                      <img
                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${s.player.profileIconId}.jpg`}
                        alt=""
                        width={18}
                        height={18}
                        style={{ display: "block" }}
                      />
                    ) : (
                      <User size={14} />
                    )}
                  </ChipIcon>
                  <ChipName>{s.player.gameName}<ChipTag>#{s.player.tagLine}</ChipTag></ChipName>
                </PlayerChip>
              )}
            </GlassCard>
          </SuperlativeCardLink>
        ))}
      </SuperlativesGrid>

      <PlayerTable
        players={players.map((p) => ({
          puuid: p.puuid,
          gameName: p.gameName,
          tagLine: p.tagLine,
          profileIconId: p.profileIconId,
          current: p.current,
          matches: p.matches,
        }))}
        selectedTab={selectedTab}
        weeks={weeks}
      />

      <RankChart
        players={players.map((p) => ({
          gameName: p.gameName,
          profileIconId: p.profileIconId,
          history: p.history,
        }))}
        selectedTab={selectedTab}
        weeks={weeks}
      />

      <StatsGrid>
        <SuperlativeCardLink href={`/stats/games?tab=${selectedTab}`}>
          <GlassCard>
            <StatRow>
              <StatLabel>Games</StatLabel>
              <Gamepad2 size={ICON_SIZE.md} color={theme.semantic.color.accent} />
            </StatRow>
            <StatValue>{loading ? "..." : summaryStats.games}</StatValue>
          </GlassCard>
        </SuperlativeCardLink>

        <SuperlativeCardLink href={`/stats/playtime?tab=${selectedTab}`}>
          <GlassCard>
            <StatRow>
              <StatLabel>Squad Playtime</StatLabel>
              <Clock size={ICON_SIZE.md} color={theme.semantic.color.info} />
            </StatRow>
            <StatValue>{loading ? "..." : <PlaytimeDisplay seconds={summaryStats.playtime} variant="full" />}</StatValue>
          </GlassCard>
        </SuperlativeCardLink>

        <SuperlativeCardLink href={`/stats/top4-rate?tab=${selectedTab}`}>
          <GlassCard>
            <StatRow>
              <StatLabel>Avg Top 4 Rate</StatLabel>
              <Trophy size={ICON_SIZE.md} color={theme.semantic.color.accent} />
            </StatRow>
            <StatValue>
              {loading ? "..." : renderStatValue(`${summaryStats.total > 0 ? ((summaryStats.top4 / summaryStats.total) * 100).toFixed(1) : "0.0"}%`)}
            </StatValue>
          </GlassCard>
        </SuperlativeCardLink>

        <SuperlativeCardLink href={`/stats/win-rate?tab=${selectedTab}`}>
          <GlassCard>
            <StatRow>
              <StatLabel>Squad Win Rate</StatLabel>
              <Trophy size={ICON_SIZE.md} color={theme.semantic.color.info} />
            </StatRow>
            <StatValue>
              {loading ? "..." : renderStatValue(`${summaryStats.total > 0 ? ((summaryStats.firsts / summaryStats.total) * 100).toFixed(1) : "0.0"}%`)}
            </StatValue>
          </GlassCard>
        </SuperlativeCardLink>
      </StatsGrid>
    </Page>
  );
}
