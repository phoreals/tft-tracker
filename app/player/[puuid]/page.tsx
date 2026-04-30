"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ReferenceArea,
} from "recharts";
import { ArrowLeft, Trophy, Gamepad2, Clock, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import {
  formatPlaytime,
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
    bg:         theme.primitive.color.neutral850,
    border:     `1px solid ${theme.semantic.color.borderDefault}`,
    radius:     theme.primitive.radius.sm,
    fontFamily: "Space Grotesk",
    fontSize:   theme.semantic.typography.label.fontSize,
    labelColor: theme.primitive.color.neutral200,
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
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.accent};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.md};
`;

const ProfileIcon = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 2px solid ${({ $color }) => $color}66;
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
  letter-spacing: 0;
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

// ── Tab navigation styled components ─────────────────────────────

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

const TabBar = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
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

    &::-webkit-scrollbar { height: 3px; }
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

const Tab = styled.button<{ $active: boolean }>`
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

const TabWeekDate = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
  letter-spacing: 0.05em;
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
  opacity: 0.6;
`;

const TabSelect = styled.select`
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
  background: rgba(229, 197, 135, 0.08);
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

const LoadingText = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  ${({ theme }) => theme.semantic.typography.data};
  color: ${({ theme }) => theme.semantic.color.textMuted};
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

// Tier label for Y-axis tick at tier base LP value
const TIER_BASES: { lp: number; short: string }[] = [
  { lp: 0,    short: "Iron"    },
  { lp: 400,  short: "Bronze"  },
  { lp: 800,  short: "Silver"  },
  { lp: 1200, short: "Gold"    },
  { lp: 1600, short: "Plat"    },
  { lp: 2000, short: "Em"      },
  { lp: 2400, short: "Diamond" },
  { lp: 2800, short: "Master"  },
  { lp: 3200, short: "GM"      },
  { lp: 3600, short: "Chal"    },
];

function formatDateTick(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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

export default function PlayerDrilldownPage() {
  const { puuid } = useParams<{ puuid: string }>();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

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
  const { fadeLeft, fadeRight } = useScrollFade(tabBarRef);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedTab]);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data: PlayerData[]) => {
        setAllPlayers(data);
        const found = data.find((p) => p.puuid === puuid);
        if (found) setPlayer(found);
      })
      .finally(() => setLoading(false));
  }, [puuid]);

  // Active time window
  const isSet = selectedTab === "set";
  const activeWindow = isSet
    ? { start: SET_START, end: SET_END }
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);

  // The highlighted week on the rank chart — selected week, or latest for "Set 17"
  const highlightWeek = isSet
    ? (weeks[weeks.length - 1] ?? null)
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1] ?? null);

  // Matches filtered to the active window
  const scopedMatches = useMemo(() => {
    if (!player) return [];
    return [...player.matches]
      .filter((m) => m.timestamp >= activeWindow.start && m.timestamp < activeWindow.end)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [player, activeWindow]);

  // Rank history chart — always all history, epoch ms X-axis
  const rankChartData = useMemo(() => {
    if (!player) return [];
    return [...player.history]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        ts: new Date(h.date).getTime(),
        rank: rankToLP(h.tier, h.rank, h.lp),
        label: formatRank(h.tier, h.rank, h.lp),
      }));
  }, [player]);

  const { yTicks, yDomain } = useMemo(() => {
    if (rankChartData.length === 0) return { yTicks: [], yDomain: [0, 3700] as [number, number] };
    const values = rankChartData.map((d) => d.rank);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const minBase = Math.max(0, Math.floor(rawMin / 400) * 400 - 400);
    const maxBase = Math.ceil(rawMax / 400) * 400 + 400;
    const ticks = TIER_BASES.filter((t) => t.lp >= minBase && t.lp <= maxBase).map((t) => t.lp);
    return { yTicks: ticks, yDomain: [Math.max(0, minBase), maxBase] as [number, number] };
  }, [rankChartData]);

  // Placement per game chart — scoped to active window
  const placementChartData = useMemo(() => {
    return scopedMatches.map((m, i) => ({
      game: i + 1,
      placement: m.placement,
      date: formatShortDate(m.timestamp),
    }));
  }, [scopedMatches]);

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
        label: cat.label(isSet),
        value: val !== null ? cat.format(val as number) : "—",
      };
    });
  }, [player, allPlayers, selectedTab, weeks, isSet]);

  if (loading) return <LoadingText>Loading...</LoadingText>;
  if (!player) return <LoadingText>Player not found.</LoadingText>;

  const tierTickFormatter = (value: number) => {
    const tier = TIER_BASES.find((t) => t.lp === value);
    return tier ? tier.short : "";
  };

  return (
    <Page>
      <BackLink href="/">
        <ArrowLeft size={ICON_SIZE.sm} />
        BACK TO WEEKLY STATS
      </BackLink>

      <PlayerHeader>
        <ProfileIcon $color={player.current ? getRankColor(player.current.tier) : theme.semantic.color.accent}>
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
      </PlayerHeader>

      <StickyTabWrap>
        {/* Mobile: dropdown */}
        <TabSelect
          value={isSet ? "set" : String(selectedTab)}
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
        </TabSelect>

        {/* Desktop: tab bar */}
        <TabBar ref={tabBarRef} $fadeLeft={fadeLeft} $fadeRight={fadeRight}>
          <Tab
            $active={isSet}
            data-active={isSet ? "true" : undefined}
            onClick={() => setSelectedTab("set")}
          >
            Set 17
          </Tab>
          {weeks.map((w, i) => (
            <Tab
              key={i}
              $active={selectedTab === i}
              data-active={selectedTab === i ? "true" : undefined}
              onClick={() => setSelectedTab(i)}
            >
              {w.label}
              <TabWeekDate>
                {formatShortDate(w.start)}–{formatShortDate(w.end)}
              </TabWeekDate>
            </Tab>
          ))}
        </TabBar>
      </StickyTabWrap>

      <StatsGrid>
        <GlassCard>
          <StatRow>
            <StatLabel>Games {isSet ? "Set 17" : "This Week"}</StatLabel>
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
          <StatValue>{totalDuration > 0 ? formatPlaytime(totalDuration) : "—"}</StatValue>
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

      {/* Rank over time — always full history, selected week highlighted */}
      <GlassCard title="Rank Over Time" icon={TrendingUp}>
        <ChartContainer>
          {rankChartData.length === 0 ? (
            <EmptyState>Rank history builds daily with each sync.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rankChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  tickFormatter={formatDateTick}
                  tickCount={6}
                  dy={10}
                />
                <YAxis
                  domain={yDomain}
                  ticks={yTicks}
                  tickFormatter={tierTickFormatter}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  width={48}
                />
                {highlightWeek && (
                  <ReferenceArea
                    x1={highlightWeek.start}
                    x2={highlightWeek.end}
                    fill={CHART.refFill}
                    stroke={CHART.refStroke}
                    strokeWidth={1}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART.tooltip.bg,
                    border: CHART.tooltip.border,
                    borderRadius: CHART.tooltip.radius,
                    fontFamily: CHART.tooltip.fontFamily,
                    fontSize: CHART.tooltip.fontSize,
                  }}
                  labelStyle={{ color: CHART.tooltip.labelColor }}
                  labelFormatter={(label) => formatDateTick(Number(label))}
                  formatter={(value, name, props) => [
                    (props.payload as { label?: string }).label ?? String(value),
                    "Rank",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke={CHART.gold}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART.gold }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </GlassCard>

      {/* Placement per game — scoped to selected tab */}
      <GlassCard title={`Placement Per Game${isSet ? "" : ` — ${weeks[selectedTab as number]?.label ?? ""}`}`}>
        <ChartContainer>
          {placementChartData.length === 0 ? (
            <EmptyState>No games {isSet ? "this set" : "this week"}.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={placementChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="game"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  dy={10}
                  label={{ value: "Game #", position: "insideBottomRight", offset: -5, fill: CHART.tooltip.labelColor + "66", fontSize: CHART.tick.fontSize, fontFamily: "Space Grotesk" }}
                />
                <YAxis
                  reversed
                  domain={[1, 8]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  width={30}
                />
                <ReferenceLine y={4.5} stroke={CHART.refStroke} strokeDasharray="6 4" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART.tooltip.bg,
                    border: CHART.tooltip.border,
                    borderRadius: CHART.tooltip.radius,
                    fontFamily: CHART.tooltip.fontFamily,
                    fontSize: CHART.tooltip.fontSize,
                  }}
                  labelStyle={{ color: CHART.tooltip.labelColor }}
                  labelFormatter={(label) => {
                    const d = placementChartData[Number(label) - 1];
                    return d ? `Game ${label} (${d.date})` : `Game ${label}`;
                  }}
                  formatter={(value) => [value, "Placement"]}
                />
                <Line
                  type="monotone"
                  dataKey="placement"
                  stroke={CHART.gold}
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: CHART.gold }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </GlassCard>

      {/* Match history — scoped to selected tab */}
      <GlassCard title={`Match History${isSet ? "" : ` — ${weeks[selectedTab as number]?.label ?? ""}`}`}>
        <MatchList>
          {[...scopedMatches].reverse().map((m) => (
            <MatchRow key={m.matchId} $top4={m.placement <= 4}>
              <MatchPlacement $place={m.placement}>
                #{m.placement}
              </MatchPlacement>
              <MatchMeta>{formatPlaytime(m.duration)}</MatchMeta>
              <MatchMeta>{formatDateTime(m.timestamp)}</MatchMeta>
            </MatchRow>
          ))}
          {scopedMatches.length === 0 && (
            <MatchRow $top4={false}>
              <MatchMeta style={{ color: CHART.tooltip.labelColor, padding: `${theme.primitive.spacing.sm} 0` }}>
                No games {isSet ? "this set" : "this week"}.
              </MatchMeta>
            </MatchRow>
          )}
        </MatchList>
      </GlassCard>
    </Page>
  );
}
