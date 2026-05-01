"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import styled from "styled-components";
import Link from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  type ScatterShapeProps,
} from "recharts";
import { ArrowLeft, Trophy, Gamepad2, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { RankChart } from "@/components/RankChart";
import { TabNavigation } from "@/components/TabNavigation";
import { PlaytimeDisplay } from "@/components/PlaytimeDisplay";
import { SyncOverlay } from "@/components/SyncOverlay";
import { useSelectedTab } from "@/hooks/useSelectedTab";
import {
  formatRank,
  percentOf,
  getRankColor,
  rankToLP,
  getSetWeeks,
  SET_START,
  SET_END,
  SET_LABEL,
  computePlayerStats,
  SUPERLATIVE_CATEGORIES,
  findLeader,
} from "@/lib/utils";
import { theme, ICON_SIZE } from "@/styles/theme";

// ── Chart constants ───────────────────────────────────────────────
const CHART = {
  grid:      theme.semantic.color.chartGrid,
  refFill:   theme.semantic.color.chartHighlight,
  refStroke: theme.semantic.color.chartStroke,
  tick: {
    fill:       theme.primitive.color.neutral200,
    fontSize:   parseInt(theme.primitive.fontSize["2xs"]),
    fontFamily: "Space Grotesk",
  },
  tooltip: {
    bg:         "rgba(12, 20, 30, 0.92)",
    border:     `1px solid ${theme.semantic.color.borderDefault}`,
    radius:     theme.primitive.radius.lg,
    shadow:     theme.semantic.shadow.glassInset,
    fontFamily: "Space Grotesk",
    fontSize:   theme.semantic.typography.label.fontSize,
    labelColor: theme.semantic.color.textMuted,
  },
  gold:    theme.primitive.color.gold300,
  cyan:    theme.primitive.color.cyan500,
} as const;

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
    ranked?: boolean;
    lastRound?: number;
    gameType?: string;
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
  gap: ${({ theme }) => theme.primitive.spacing.lg};
  padding: ${({ theme }) => theme.primitive.spacing.lg} 0;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.xl};
    padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  text-decoration: none;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  align-self: flex-start;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.accent};
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
  }

  @media (hover: none) {
    &:hover {
      background: none;
      color: ${({ theme }) => theme.semantic.color.textMuted};
    }
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgActive};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
`;

const PlayerIdentity = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  min-width: 0;
`;

const ProfileIcon = styled.div`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 2px solid ${({ theme }) => theme.semantic.color.borderHover};
  overflow: hidden;
  background: ${({ theme }) => theme.component.glassCard.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    width: 80px;
    height: 80px;
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  min-width: 0;
`;

const PlayerName = styled.h1`
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

const PlayerTag = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  text-transform: none;
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: 4px;
`;

const RankBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  ${({ theme }) => theme.semantic.typography.label};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1a;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.md};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ $color }) => $color}4d;
  width: fit-content;
`;

// ── Stats styled components ───────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: 540px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const BadgeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  background: ${({ theme }) => theme.semantic.color.accentBgHover};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: rgba(229, 197, 135, 0.15);
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }
`;

const BadgeLabel = styled.span`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const BadgeValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
`;

const StatCount = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-left: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const ChartContainer = styled.div`
  height: 220px;
  width: 100%;
  margin-top: ${({ theme }) => theme.primitive.spacing.md};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    height: 320px;
  }
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
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  max-height: 400px;
  overflow-y: auto;
`;

const MatchRow = styled.div<{ $top4: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
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
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;


const QueueBadge = styled.span<{ $ranked: boolean | undefined }>`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: 9px;
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  padding: 1px 5px;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ $ranked, theme }) =>
    $ranked === true
      ? theme.semantic.color.borderHover
      : $ranked === false
        ? theme.semantic.color.borderDefault
        : "transparent"};
  color: ${({ $ranked, theme }) =>
    $ranked === true
      ? theme.semantic.color.accent
      : theme.semantic.color.textDisabled};
  background: ${({ $ranked, theme }) =>
    $ranked === true
      ? theme.semantic.color.accentBgSubtle
      : "transparent"};
  flex-shrink: 0;
`;

const LoadingText = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  ${({ theme }) => theme.semantic.typography.data};
  color: ${({ theme }) => theme.semantic.color.textMuted};
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

const SpinningRefresh = styled(RefreshCw)<{ $spinning: boolean }>`
  color: ${({ theme }) => theme.semantic.color.accent};
  animation: ${({ $spinning }) => ($spinning ? "spin 1s linear infinite" : "none")};
`;


// ── Helpers ──────────────────────────────────────────────────────

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
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}_tft.svg`}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

function PortalTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const elRef = useRef<HTMLSpanElement>(null);

  if (typeof document === "undefined") return <>{children}</>;

  const TOOLTIP_W = 180;
  const TOOLTIP_H = 26;
  const GAP = 6;

  // Compute position from the element's current rect at render time
  // so it stays correct even when the scrollable parent moves.
  let style: { left: number; top: number } | null = null;
  if (hovered && elRef.current) {
    const rect = elRef.current.getBoundingClientRect();
    // Center tooltip horizontally on the element
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    let top = rect.top - TOOLTIP_H - GAP;
    if (top < 4) top = rect.bottom + GAP;
    left = Math.max(4, Math.min(left, window.innerWidth - TOOLTIP_W - 4));
    style = { left, top };
  }

  return (
    <span
      ref={elRef}
      style={{ cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && style && createPortal(
        <div style={{
          position:    "fixed",
          left:        style.left,
          top:         style.top,
          zIndex:      9999,
          pointerEvents: "none",
          whiteSpace:  "nowrap",
          background:  CHART.tooltip.bg,
          border:      CHART.tooltip.border,
          borderRadius: CHART.tooltip.radius,
          padding:     "3px 8px",
          fontFamily:  "Space Grotesk",
          fontSize:    theme.primitive.fontSize.xs,
          color:       theme.semantic.color.textMuted,
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}

function toOrdinal(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][v % 10] ?? "th";
  return `${n}${suffix}`;
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDisplayDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// TFT stage/round layout (standard): S1=4rds, then each stage=7rds (5 PvP + carousel + wolves)
// Approximate: stage = floor((round - 1) / 7) + 1 for rounds > 4, else stage 1
function formatRound(round: number): string {
  if (round <= 0) return "";
  if (round <= 3) return `${round}-${round}`;      // S1 PvE
  if (round === 4) return "1-4";                    // S1 carousel
  const r = round - 4;
  const stage = Math.floor((r - 1) / 7) + 2;
  const stageRound = ((r - 1) % 7) + 1;
  return `${stage}-${stageRound}`;
}

const GAME_TYPE_LABEL: Record<string, string> = {
  standard: "",
  turbo:    "HYPER ROLL",
  pairs:    "DOUBLE UP",
  choncc:   "CHONCC",
};

function queueLabel(gameType: string | undefined, ranked: boolean | undefined): string {
  if (gameType && gameType !== "standard") return GAME_TYPE_LABEL[gameType] ?? gameType.toUpperCase();
  if (ranked === true) return "RANKED";
  if (ranked === false) return "NORMAL";
  return "";
}

function formatMatchDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ── Component ────────────────────────────────────────────────────

export default function PlayerDrilldownPage() {
  const { puuid } = useParams<{ puuid: string }>();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ tone: "muted" | "warn" | "error"; message: string } | null>(null);

  const weeks = useMemo(() => getSetWeeks(), []);
  const [selectedTab, setSelectedTab] = useSelectedTab();

  const fetchPlayer = useCallback(async () => {
    const data: PlayerData[] = await fetch("/api/players", { cache: "no-store" }).then((r) => r.json());
    setAllPlayers(data);
    const found = data.find((p) => p.puuid === puuid);
    if (found) setPlayer(found);
  }, [puuid]);

  useEffect(() => {
    fetchPlayer().finally(() => setLoading(false));
  }, [fetchPlayer]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);

    let pass = 0;
    let totalAdded = 0;

    try {
      while (true) {
        pass++;
        setSyncStatus({ tone: "muted", message: pass === 1 ? "Syncing…" : `Pass ${pass} — ${totalAdded} matches added so far…` });

        const res = await fetch(`/api/sync/${puuid}`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Server error ${res.status}`);
        }
        const data = await res.json();
        totalAdded += data.totalAdded ?? 0;
        const maxRateLimitMs: number = data.maxRateLimitMs ?? 0;

        await fetchPlayer();

        if (maxRateLimitMs > 0) {
          let secsLeft = Math.ceil(maxRateLimitMs / 1000);
          while (secsLeft > 0) {
            setSyncStatus({ tone: "warn", message: `Rate limited — waiting ${secsLeft}s before next pass…` });
            await new Promise((r) => setTimeout(r, 1000));
            secsLeft--;
          }
          continue;
        }

        if ((data.matchesRemaining ?? 0) > 0) {
          setSyncStatus({ tone: "muted", message: `Pass ${pass} done — ${data.matchesRemaining} matches remaining, continuing…` });
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        const errNote = (data.matchErrors ?? 0) > 0 ? ` (${data.matchErrors} match fetch error${data.matchErrors > 1 ? "s" : ""})` : "";
        setSyncStatus({
          tone: (data.matchErrors ?? 0) > 0 ? "warn" : "muted",
          message: totalAdded > 0
            ? `All caught up — ${totalAdded} match${totalAdded > 1 ? "es" : ""} added across ${pass} pass${pass > 1 ? "es" : ""}${errNote}`
            : `Up to date${errNote}`,
        });
        break;
      }
    } catch (err) {
      setSyncStatus({ tone: "error", message: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  // Active time window
  const isSet = selectedTab === "set";
  const activeWindow = isSet
    ? { start: SET_START, end: SET_END }
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);

  // Matches filtered to the active window
  const scopedMatches = useMemo(() => {
    if (!player) return [];
    return [...player.matches]
      .filter((m) => m.timestamp >= activeWindow.start && m.timestamp < activeWindow.end)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [player, activeWindow]);

  // All matches sorted chronologically — used for placement chart and match history
  const allMatchesSorted = useMemo(() => {
    if (!player) return [];
    return [...player.matches].sort((a, b) => a.timestamp - b.timestamp);
  }, [player]);

  // Placement per game chart — all games, not filtered by tab
  const placementChartData = useMemo(() => {
    return allMatchesSorted.map((m, i) => ({
      game: i + 1,
      placement: m.placement,
      date: formatShortDate(m.timestamp),
    }));
  }, [allMatchesSorted]);

  // Stats scoped to active window
  const totalGames = scopedMatches.length;
  const allGames = player?.matches.length ?? 0;
  const top4 = scopedMatches.filter((m) => m.placement <= 4).length;
  const firsts = scopedMatches.filter((m) => m.placement === 1).length;
  const totalDuration = scopedMatches.reduce((s, m) => s + m.duration, 0);
  const avgPlacement = totalGames > 0
    ? (scopedMatches.reduce((s, m) => s + m.placement, 0) / totalGames).toFixed(2)
    : "—";

  // Superlatives: which categories does this player lead?
  const playerSuperlatives = useMemo(() => {
    if (!player || allPlayers.length === 0) return [];

    const win = isSet
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
    const stats = computePlayerStats(allPlayers, win);

    return SUPERLATIVE_CATEGORIES.filter((cat) => {
      const leader = findLeader(stats, cat);
      return leader?.player.puuid === player.puuid;
    }).map((cat) => {
      const me = stats.find((s) => s.player.puuid === player.puuid);
      const val = me ? me[cat.key] : null;
      return {
        slug: cat.slug,
        label: cat.label(isSet, weeks[selectedTab as number]?.weekNumber),
        value: val !== null ? cat.format(val as number) : "—",
      };
    });
  }, [player, allPlayers, selectedTab, weeks, isSet]);

  if (loading) return <LoadingText>Loading...</LoadingText>;
  if (!player) return <LoadingText>Player not found.</LoadingText>;

  return (
    <Page>
      <BackLink href="/">
        <ArrowLeft size={ICON_SIZE.sm} />
        BACK TO HOME
      </BackLink>

      <PlayerHeader>
        <PlayerIdentity>
          <ProfileIcon>
            {player.profileIconId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${player.profileIconId}.jpg`}
                alt=""
                width={80}
                height={80}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </ProfileIcon>
          <PlayerInfo>
            <PlayerName>
              {player.gameName}
              <PlayerTag> #{player.tagLine}</PlayerTag>
            </PlayerName>
            {player.current && (
              <RankBadge $color={getRankColor(player.current.tier)}>
                <RankEmblem tier={player.current.tier} size={ICON_SIZE.nav} color={getRankColor(player.current.tier)} />
                {formatRank(player.current.tier, player.current.rank, player.current.lp)}
                &nbsp;&middot;&nbsp;{player.current.wins}W {player.current.losses}L
              </RankBadge>
            )}
          </PlayerInfo>
        </PlayerIdentity>
        <SyncWrap>
          <SyncButton onClick={handleSync} disabled={syncing}>
            <SpinningRefresh size={ICON_SIZE.md} $spinning={syncing} />
            <span>{syncing ? "SYNCING..." : "SYNC NOW"}</span>
          </SyncButton>
        </SyncWrap>
      </PlayerHeader>

      <SyncOverlay status={syncStatus} syncing={syncing} onDismiss={() => setSyncStatus(null)} />

      <PageSubtitle>
        {isSet ? (
          <><strong>{SET_LABEL}</strong>{"\u2002·\u2002"}{formatDisplayDate(SET_START)}{"\u2009\u2013\u2009"}{formatDisplayDate(SET_END)}</>
        ) : (() => {
          const w = weeks[selectedTab as number];
          return w ? <><strong>{w.label}</strong>{"\u2002·\u2002"}{formatDisplayDate(w.start)}{"\u2009\u2013\u2009"}{formatDisplayDate(w.end)}</> : null;
        })()}
      </PageSubtitle>

      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} weeks={weeks} />

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>Games</StatLabel>
            <Gamepad2 size={ICON_SIZE.sm} color={CHART.gold} />
          </StatRow>
          <StatValue>
            {totalGames}
            {!isSet && <StatCount>/ {allGames} total</StatCount>}
          </StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>Avg Placement</StatLabel>
            <TrendingUp size={ICON_SIZE.sm} color={CHART.cyan} />
          </StatRow>
          <StatValue>{avgPlacement}</StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>Top 4 Rate</StatLabel>
            <Trophy size={ICON_SIZE.sm} color={CHART.gold} />
          </StatRow>
          <StatValue>{percentOf(top4, totalGames)}%<StatCount>({top4})</StatCount></StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>1st Place Rate</StatLabel>
            <Trophy size={ICON_SIZE.sm} color={CHART.cyan} />
          </StatRow>
          <StatValue>{percentOf(firsts, totalGames)}%<StatCount>({firsts})</StatCount></StatValue>
        </GlassCard>

        <GlassCard>
          <StatRow>
            <StatLabel>Time Played</StatLabel>
            <Clock size={ICON_SIZE.sm} color={CHART.cyan} />
          </StatRow>
          <StatValue><PlaytimeDisplay seconds={totalDuration} variant="full" /></StatValue>
        </GlassCard>
      </StatsGrid>

      {playerSuperlatives.length > 0 && (
        <BadgeRow>
          {playerSuperlatives.map((s) => (
            <BadgeLink key={s.slug} href={`/superlative/${s.slug}`}>
              <BadgeLabel>{s.label}</BadgeLabel>
              <BadgeValue>{s.value}</BadgeValue>
            </BadgeLink>
          ))}
        </BadgeRow>
      )}

      {/* Rank over time — shared component, single player, gold line, no legend */}
      <RankChart
        players={[{ gameName: player.gameName, profileIconId: player.profileIconId, history: player.history }]}
        selectedTab={selectedTab}
        weeks={weeks}
        hideLegend
        lineColors={[theme.primitive.color.gold300]}
      />

      {/* Placement per game — all games */}
      <GlassCard title="Placement Per Game" prominent>
        <ChartContainer>
          {placementChartData.length === 0 ? (
            <EmptyState>No games recorded yet.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 16, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="game"
                  type="number"
                  domain={[0, placementChartData.length + 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  dy={10}
                  label={{ value: "Game #", position: "insideBottomRight", offset: -5, fill: CHART.tooltip.labelColor + "66", fontSize: CHART.tick.fontSize, fontFamily: "Space Grotesk" }}
                />
                <YAxis
                  dataKey="placement"
                  type="number"
                  reversed
                  domain={[0.5, 8.5]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  tickFormatter={toOrdinal}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  width={36}
                />
                <ReferenceLine y={4.5} stroke={CHART.refStroke} strokeDasharray="6 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: CHART.grid }}
                  contentStyle={{
                    backgroundColor: CHART.tooltip.bg,
                    border: CHART.tooltip.border,
                    borderRadius: CHART.tooltip.radius,
                    boxShadow: CHART.tooltip.shadow,
                    fontFamily: CHART.tooltip.fontFamily,
                    fontSize: CHART.tooltip.fontSize,
                  }}
                  labelStyle={{ color: CHART.tooltip.labelColor }}
                  formatter={(value, name) => {
                    if (name === "placement") return [toOrdinal(Number(value)), "Placement"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as typeof placementChartData[0];
                    return (
                      <div style={{
                        background: CHART.tooltip.bg,
                        border: CHART.tooltip.border,
                        borderRadius: CHART.tooltip.radius,
                        padding: "8px 12px",
                        fontFamily: "Space Grotesk",
                        fontSize: CHART.tooltip.fontSize,
                      }}>
                        <div style={{ color: CHART.tooltip.labelColor, marginBottom: 4 }}>
                          Game {d.game} &middot; {d.date}
                        </div>
                        <div style={{ color: d.placement <= 4 ? CHART.gold : CHART.tick.fill, fontWeight: 600 }}>
                          {toOrdinal(d.placement)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={placementChartData}
                  isAnimationActive={false}
                  shape={(props: ScatterShapeProps) => {
                    const { cx, cy } = props;
                    const d = (props as ScatterShapeProps & { payload: typeof placementChartData[0] }).payload;
                    const top4 = d.placement <= 4;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={top4 ? CHART.gold : CHART.grid}
                        fillOpacity={top4 ? 0.9 : 0.6}
                        stroke={top4 ? CHART.gold : "none"}
                        strokeOpacity={0.4}
                        strokeWidth={1}
                      />
                    );
                  }}
                >
                  {placementChartData.map((d, i) => (
                    <Cell key={i} fill={d.placement <= 4 ? CHART.gold : CHART.grid} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </GlassCard>

      {/* Match history — all games */}
      <GlassCard title="Match History" prominent>
        <MatchList>
          {[...allMatchesSorted].reverse().map((m) => (
            <MatchRow key={m.matchId} $top4={m.placement <= 4}>
              <MatchPlacement $place={m.placement}>
                {toOrdinal(m.placement)}
              </MatchPlacement>
              <QueueBadge $ranked={m.gameType && m.gameType !== "standard" ? undefined : m.ranked}>
                {queueLabel(m.gameType, m.ranked)}
              </QueueBadge>
              {m.lastRound != null && (
                <MatchMeta>R{formatRound(m.lastRound)}</MatchMeta>
              )}
              <MatchMeta>{formatMatchDuration(m.duration)}</MatchMeta>
              <PortalTooltip text={formatDateTime(m.timestamp)}>
                <MatchMeta>{formatRelativeTime(m.timestamp)}</MatchMeta>
              </PortalTooltip>
            </MatchRow>
          ))}
          {allMatchesSorted.length === 0 && (
            <MatchRow $top4={false}>
              <MatchMeta style={{ color: CHART.tooltip.labelColor, padding: `${theme.primitive.spacing.sm} 0` }}>
                No games recorded yet.
              </MatchMeta>
            </MatchRow>
          )}
        </MatchList>
      </GlassCard>
    </Page>
  );
}
