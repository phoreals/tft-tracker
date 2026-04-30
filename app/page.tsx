"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import styled from "styled-components";
import { RefreshCw, Clock, Trophy, Gamepad2, User } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PlayerTable } from "@/components/PlayerTable";
import { RankChart } from "@/components/RankChart";
import { formatPlaytime, percentOf, getSetWeeks, SET_START, SET_END, SET_LABEL, computePlayerStats, SUPERLATIVE_CATEGORIES, findLeader } from "@/lib/utils";
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

const StickyTabWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  border-bottom: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  box-shadow: 0 4px 16px rgba(229, 197, 135, 0.06);
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  margin-right: -${({ theme }) => theme.primitive.spacing.sm};
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: -${({ theme }) => theme.primitive.spacing.xl};
    margin-right: -${({ theme }) => theme.primitive.spacing.xl};
    padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.xl};
  }
`;

const PageTabBar = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  display: none;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: flex;
    align-items: stretch;
    gap: ${({ theme }) => theme.primitive.spacing.xs};
    overflow-x: auto;
    mask-image: ${({ $fadeLeft, $fadeRight }) => {
      if ($fadeLeft && $fadeRight)
        return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft)
        return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight)
        return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
      return "none";
    }};
    -webkit-mask-image: ${({ $fadeLeft, $fadeRight }) => {
      if ($fadeLeft && $fadeRight)
        return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft)
        return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight)
        return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
      return "none";
    }};

    &::-webkit-scrollbar {
      height: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: ${({ theme }) => theme.primitive.radius.full};
      transition: background 0.2s;
    }
    &:hover::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.semantic.color.borderDefault};
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

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
  margin-top: ${({ theme }) => theme.primitive.spacing.xs};
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
    background: rgba(229, 197, 135, 0.08);
  }
`;

const ChipIcon = styled.div`
  width: 24px;
  height: 24px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SuperlativeCardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
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

function useScrollFade(ref: React.RefObject<HTMLDivElement | null>) {
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setFadeLeft(el.scrollLeft > 2);
      setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [ref]);

  return { fadeLeft, fadeRight };
}

// ── Component ────────────────────────────────────────────────────

export default function WeeklyStatsPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ tone: "muted" | "warn" | "error"; message: string } | null>(null);

  const weeks = useMemo(() => getSetWeeks(), []);

  const [selectedTab, setSelectedTab] = useState<"set" | number>(() => {
    const tabParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tabParam === "set") return "set";
    if (tabParam !== null) {
      const n = parseInt(tabParam, 10);
      if (!isNaN(n)) return n;
    }
    const now = Date.now();
    const ws = getSetWeeks();
    let idx = 0;
    for (let i = 0; i < ws.length; i++) {
      if (ws[i].start <= now) idx = i;
    }
    return idx;
  });

  const tabBarRef = useRef<HTMLDivElement>(null);
  const { fadeLeft, fadeRight } = useScrollFade(tabBarRef);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedTab]);

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
    const all = players.flatMap((p) => p.matches);
    let start: number, end: number, label: string;
    if (selectedTab === "set") {
      start = SET_START;
      end = SET_END;
      label = "Set 17";
    } else {
      const w = weeks[selectedTab] ?? weeks[weeks.length - 1];
      start = w.start;
      end = w.end;
      label = w.label;
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

  const superlatives = useMemo(() => {
    if (players.length === 0) return [];

    const win = selectedTab === "set"
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
    const stats = computePlayerStats(players, win);

    const isSetMode = selectedTab === "set";
    return SUPERLATIVE_CATEGORIES.map((cat) => {
      const leader = findLeader(stats, cat);
      const val = leader ? leader[cat.key] : null;
      return {
        slug: cat.slug,
        label: cat.label(isSetMode),
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
          <PageTitle>{isSet ? "The Asylum Set 17 Stats" : "The Asylum Weekly Stats"}</PageTitle>
          <PageSubtitle>
            {isSet
              ? "Squad performance · Set 17"
              : (() => {
                  const w = weeks[selectedTab as number];
                  return w
                    ? `Squad performance · ${w.label} (${formatShortDate(w.start)}–${formatShortDate(w.end)})`
                    : "Squad performance this week";
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

      <StickyTabWrap>
        {/* Mobile: dropdown */}
        <PageTabSelect
          value={selectedTab === "set" ? "set" : String(selectedTab)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedTab(v === "set" ? "set" : parseInt(v, 10));
          }}
        >
          <option value="set">Set 17</option>
          {weeks.map((w, i) => (
            <option key={i} value={String(i)}>
              {w.label} ({formatShortDate(w.start)}–{formatShortDate(w.end)})
            </option>
          ))}
        </PageTabSelect>

        {/* Desktop: tab bar */}
        <PageTabBar ref={tabBarRef} $fadeLeft={fadeLeft} $fadeRight={fadeRight}>
          <PageTab
            $active={selectedTab === "set"}
            data-active={selectedTab === "set" ? "true" : undefined}
            onClick={() => setSelectedTab("set")}
          >
            Set 17
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
      </StickyTabWrap>

      <SuperlativesGrid>
        {(loading || superlatives.length === 0
          ? SUPERLATIVE_CATEGORIES.map((cat) => ({ slug: cat.slug, label: cat.label(selectedTab === "set"), value: "...", player: null }))
          : superlatives
        ).map((s) => (
          <SuperlativeCardLink key={s.slug} href={`/superlative/${s.slug}?tab=${selectedTab}`}>
            <GlassCard>
              <StatRow>
                <StatLabel>{s.label}</StatLabel>
              </StatRow>
              <StatValue>{s.value}</StatValue>
              {s.player && (
                <PlayerChip href={`/player/${s.player.puuid}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <ChipIcon>
                    {s.player.profileIconId ? (
                      <img
                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${s.player.profileIconId}.jpg`}
                        alt=""
                        width={24}
                        height={24}
                        style={{ display: "block" }}
                      />
                    ) : (
                      <User size={ICON_SIZE.sm} />
                    )}
                  </ChipIcon>
                  <ChipName>{s.player.gameName}#{s.player.tagLine}</ChipName>
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
          history: p.history,
        }))}
        selectedTab={selectedTab}
        weeks={weeks}
      />

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>Games {summaryStats.label}</StatLabel>
            <Gamepad2 size={ICON_SIZE.md} color={theme.semantic.color.accent} />
          </StatRow>
          <StatValue>{loading ? "..." : summaryStats.games}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>Squad Playtime</StatLabel>
            <Clock size={ICON_SIZE.md} color={theme.semantic.color.info} />
          </StatRow>
          <StatValue>{loading ? "..." : formatPlaytime(summaryStats.playtime)}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>Avg Top 4 Rate</StatLabel>
            <Trophy size={ICON_SIZE.md} color={theme.semantic.color.accent} />
          </StatRow>
          <StatValue>
            {loading ? "..." : `${percentOf(summaryStats.top4, summaryStats.total)}%`}
          </StatValue>
        </GlassCard>
      </StatsGrid>
    </Page>
  );
}
