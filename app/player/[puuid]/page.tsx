"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import styled from "styled-components";
import Link from "next/link";
import { ArrowLeft, RefreshCw, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, CartesianGrid, ReferenceLine, Tooltip as RechartsTooltip, PieChart, Pie, Sector, ResponsiveContainer, LabelList, type PieSectorDataItem } from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { ViewToggle } from "@/components/ViewToggle";
import { RankChart } from "@/components/RankChart";
import { TabNavigation } from "@/components/TabNavigation";
import { PlaytimeDisplay } from "@/components/PlaytimeDisplay";
import { SyncOverlay } from "@/components/SyncOverlay";
import { DurationPill } from "@/components/DurationPill";
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
    fontSize:   parseInt(theme.primitive.fontSize.xs),
    fontFamily: "Space Grotesk",
  },
  tooltip: {
    bg:         "rgba(12, 20, 30, 0.92)",
    border:     `1px solid ${theme.semantic.color.borderDefault}`,
    radius:     theme.semantic.radius.card,
    shadow:     theme.semantic.shadow.glassInset,
    fontFamily: "Space Grotesk",
    fontSize:   theme.semantic.typography.label.fontSize,
    labelColor: theme.semantic.color.textMuted,
  },
  gold:    theme.primitive.color.gold300,
  cyan:    theme.primitive.color.cyan500,
} as const;

// Per-placement colors: 1–4 are gold hue (41°) with decreasing lightness/saturation.
// 5–8 are cool neutrals.
const PLACEMENT_COLORS = [
  "#e5c587", // 1st — brand gold
  "#c9ab6f", // 2nd — muted gold
  "#ad925a", // 3rd — dim gold
  "#917a48", // 4th — dark gold
  "#8a9bb0", // 5th — slate blue
  "#7088a0", // 6th — steel
  "#5c7080", // 7th — dim teal
  "#4a5c6a", // 8th — dark slate
] as const;

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

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
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
  min-height: 44px;
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
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

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
`;

const PlayerIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  min-width: 0;
`;

const ProfileIcon = styled.div`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  border: 2px solid ${({ theme }) => theme.semantic.color.borderHover};
  overflow: hidden;
  background: ${({ theme }) => theme.component.glassCard.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    width: 80px;
    height: 80px;
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  min-width: 0;
`;

const PlayerName = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize.xl};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  overflow-wrap: break-word;
  word-break: break-word;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
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
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const RankBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  ${({ theme }) => theme.semantic.typography.label};
  color: ${({ $color }) => $color};
  width: fit-content;
`;

// ── Stats styled components ───────────────────────────────────────

const StatCardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  border-radius: ${({ theme }) => theme.component.glassCard.radius};
  transition: transform 0.15s, box-shadow 0.15s;

  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px ${({ theme }) => theme.semantic.color.accentBgSubtle};
    }
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }

  & > * { width: 100%; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @container content (min-width: ${({ theme }) => theme.primitive.container.sm}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    grid-template-columns: repeat(3, 1fr);
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
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.semantic.color.accentBgActive};
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

// In-card superlative indicator (smaller, text only)
const CardSuperlativeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
  padding: 2px ${({ theme }) => theme.primitive.spacing.xs};
  background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.accent};
  text-decoration: none;
  width: fit-content;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }
`;


const StatValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: clamp(20px, 4vw, ${({ theme }) => theme.primitive.fontSize["3xl"]});
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


const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

const PlacementChartWrap = styled.div`
  width: 100%;
  height: 280px;
  touch-action: pan-y;

  svg:focus,
  svg *:focus {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.semantic.radius.element};
  }
`;

const PlacementDonutWrap = styled.div`
  position: relative;
  width: clamp(200px, 70dvw, 320px);
  aspect-ratio: 1;
  margin: 0 auto;
  touch-action: pan-y;

  svg:focus,
  svg *:focus {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.semantic.radius.element};
  }
`;

const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const DonutTotal = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: clamp(18px, 4dvw, 24px);
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  line-height: 1;
`;

const DonutLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: clamp(10px, 1.5dvw, 11px);
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-top: 3px;
`;

const PlacementLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  margin-top: ${({ theme }) => theme.primitive.spacing.sm};
`;

const LegendRow = styled.div<{ $isTop4: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const LegendLabel = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const LegendPct = styled.span`
  color: ${({ theme }) => theme.semantic.color.textMuted};
  flex-shrink: 0;
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

const MatchDateTouch = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  display: none;

  @media (hover: none) {
    display: inline;
  }
`;


const QueueBadge = styled.span<{ $ranked: boolean | undefined }>`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  padding: 1px 5px;
  border-radius: ${({ theme }) => theme.semantic.radius.element};
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

const ShowAllButton = styled.button`
  ${({ theme }) => theme.semantic.typography.label};
  color: ${({ theme }) => theme.semantic.color.accent};
  background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.md};
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;

  &:hover {
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }
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

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
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
  -webkit-backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
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
          borderRadius: theme.semantic.radius.micro,
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

  let style: { left: number; top: number } | null = null;
  if (hovered && elRef.current) {
    const rect = elRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    let top = rect.top - TOOLTIP_H - GAP;
    if (top < 4) top = rect.bottom + GAP;
    left = Math.max(4, Math.min(left, window.innerWidth - TOOLTIP_W - 4));
    style = { left, top };
  }

  return (
    <span
      ref={elRef}
      style={{ cursor: "default", display: "inline-flex" }}
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
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [placementView, setPlacementView] = useState<"bar" | "donut">("bar");
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | undefined>(undefined);

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
        const name = player?.gameName ?? "Player";
        setSyncStatus({
          tone: (data.matchErrors ?? 0) > 0 ? "warn" : "muted",
          message: totalAdded > 0
            ? `${name} synced — ${totalAdded} match${totalAdded > 1 ? "es" : ""} added${errNote}`
            : `${name} is up to date${errNote}`,
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
  const weekNumber = (weeks[selectedTab as number] ?? weeks[weeks.length - 1])?.weekNumber;
  const period = isSet ? SET_LABEL : weekNumber ? `Week ${weekNumber}` : "This Week";

  // Matches filtered to the active window
  const scopedMatches = useMemo(() => {
    if (!player) return [];
    return [...player.matches]
      .filter((m) => m.timestamp >= activeWindow.start && m.timestamp < activeWindow.end)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [player, activeWindow]);

  // All matches sorted chronologically — used for match history
  const allMatchesSorted = useMemo(() => {
    if (!player) return [];
    return [...player.matches].sort((a, b) => a.timestamp - b.timestamp);
  }, [player]);

  // Placement breakdown — scoped to active tab window
  const placementCounts = useMemo(() => {
    const counts = Array.from({ length: 8 }, (_, i) => ({ placement: i + 1, count: 0 }));
    scopedMatches.forEach((m) => {
      if (m.placement >= 1 && m.placement <= 8) counts[m.placement - 1].count++;
    });
    return counts;
  }, [scopedMatches]);

  // Stats scoped to active window
  const totalGames = scopedMatches.length;
  const top4 = scopedMatches.filter((m) => m.placement <= 4).length;
  const firsts = scopedMatches.filter((m) => m.placement === 1).length;
  const totalDuration = scopedMatches.reduce((s, m) => s + m.duration, 0);

  // % of period stats — cap end at now so set tab doesn't divide by future time
  const periodSec = (Math.min(activeWindow.end, Date.now()) - activeWindow.start) / 1000;

  // Superlatives + LP stats: compute once, share both
  const { playerSuperlatives, lpDiff, lpPerGame } = useMemo(() => {
    if (!player || allPlayers.length === 0) return { playerSuperlatives: [], lpDiff: null as number | null, lpPerGame: null as number | null };

    const win = isSet
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
    const stats = computePlayerStats(allPlayers, win);
    const me = stats.find((s) => s.player.puuid === player.puuid);

    const superlatives = SUPERLATIVE_CATEGORIES.filter((cat) => {
      const leader = findLeader(stats, cat);
      return leader?.player.puuid === player.puuid;
    }).map((cat) => {
      const val = me ? me[cat.key] : null;
      return {
        slug: cat.slug,
        title: cat.title,
        label: cat.label(isSet, weeks[selectedTab as number]?.weekNumber),
        value: val !== null ? cat.format(val as number) : "—",
      };
    });

    return {
      playerSuperlatives: superlatives,
      lpDiff: me?.lpDiff ?? null,
      lpPerGame: me?.lpPerGame ?? null,
    };
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
        <StatCardLink href={`/stats/games?tab=${selectedTab}`}>
          <GlassCard title="Games" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue>{totalGames}</StatValue>
          </GlassCard>
        </StatCardLink>

        <StatCardLink href={`/stats/top4-rate?tab=${selectedTab}`}>
          <GlassCard title="Top 4 Rate" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue>{percentOf(top4, totalGames)}%<StatCount>({top4})</StatCount></StatValue>
          </GlassCard>
        </StatCardLink>

        <StatCardLink href={`/stats/win-rate?tab=${selectedTab}`}>
          <GlassCard title="Win Rate" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue>{percentOf(firsts, totalGames)}%<StatCount>({firsts})</StatCount></StatValue>
          </GlassCard>
        </StatCardLink>

        <StatCardLink href={`/stats/playtime?tab=${selectedTab}`}>
          <GlassCard title="Time Played" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue><PlaytimeDisplay seconds={totalDuration} variant="full" /></StatValue>
          </GlassCard>
        </StatCardLink>

        <StatCardLink href={`/stats/highest-lp?tab=${selectedTab}`}>
          <GlassCard title="LP Gain" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue>{lpDiff !== null ? `${lpDiff >= 0 ? "+" : ""}${lpDiff} LP` : "—"}</StatValue>
          </GlassCard>
        </StatCardLink>

        <StatCardLink href={`/stats/best-lp-per-game?tab=${selectedTab}`}>
          <GlassCard title="Avg LP Per Game" titleExtra={<DurationPill>{period}</DurationPill>}>
            <StatValue>{lpPerGame !== null ? `${lpPerGame >= 0 ? "+" : ""}${lpPerGame.toFixed(1)} LP/g` : "—"}</StatValue>
          </GlassCard>
        </StatCardLink>
      </StatsGrid>

      {playerSuperlatives.length > 0 && (
        <BadgeRow>
          {playerSuperlatives.map((s) => (
            <BadgeLink key={s.slug} href={`/stats/${s.slug}`}>
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
        periodTag={<DurationPill>{period}</DurationPill>}
      />

      {/* Placement breakdown — scoped to active tab */}
      <GlassCard
        title="Placement Breakdown"
        titleExtra={<DurationPill>{period}</DurationPill>}
        headerAction={
          <ViewToggle
            views={[
              { id: "bar" as const, icon: BarChart3, label: "Bar chart" },
              { id: "donut" as const, icon: PieChartIcon, label: "Donut chart" },
            ]}
            value={placementView}
            onChange={setPlacementView}
          />
        }
        prominent
      >
        {totalGames === 0 ? (
          <EmptyState>No games in this period.</EmptyState>
        ) : placementView === "bar" ? (
          <PlacementChartWrap>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={placementCounts.map((p) => ({
                  ...p,
                  label: toOrdinal(p.placement),
                  pct: totalGames > 0 ? ((p.count / totalGames) * 100).toFixed(1) + "%" : "0%",
                }))}
                layout="vertical"
                margin={{ top: 0, right: 36, bottom: 4, left: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tick={(props: Record<string, unknown>) => {
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const payload = props.payload as { value: string; index: number };
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fill={PLACEMENT_COLORS[payload.index]}
                        fontSize={CHART.tick.fontSize}
                        fontFamily={CHART.tick.fontFamily}
                        fontWeight={700}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <ReferenceLine
                  y="4th"
                  stroke={CHART.refStroke}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  ifOverflow="extendDomain"
                  position="end"
                />
                <RechartsTooltip
                  cursor={{ fill: CHART.refFill }}
                  wrapperStyle={{ zIndex: 10, transition: "none" }}
                  animationDuration={0}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    const data = item.payload as { label: string; count: number; placement: number; pct: string };
                    return (
                      <div style={{
                        background: "rgba(12, 20, 30, 0.6)",
                        backdropFilter: `blur(${theme.semantic.blur.standard})`,
                        WebkitBackdropFilter: `blur(${theme.semantic.blur.standard})`,
                        border: CHART.tooltip.border,
                        borderRadius: CHART.tooltip.radius,
                        boxShadow: CHART.tooltip.shadow,
                        padding: `${theme.primitive.spacing.xs} ${theme.primitive.spacing.sm}`,
                        fontFamily: CHART.tooltip.fontFamily,
                        fontSize: CHART.tooltip.fontSize,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}>
                        <span style={{ color: PLACEMENT_COLORS[data.placement - 1], fontWeight: 600 }}>
                          {data.label}
                        </span>
                        <span style={{ color: theme.primitive.color.neutral200 }}>
                          {data.count} game{data.count !== 1 ? "s" : ""}
                        </span>
                        <span style={{ color: theme.semantic.color.textMuted }}>
                          {data.pct}
                        </span>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {placementCounts.map((p) => (
                    <Cell
                      key={p.placement}
                      fill={PLACEMENT_COLORS[p.placement - 1]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill={theme.semantic.color.textPrimary}
                    fontSize={parseInt(theme.primitive.fontSize.sm)}
                    fontFamily="Space Grotesk"
                    fontWeight={500}
                    formatter={(v) => (Number(v) > 0 ? String(v) : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </PlacementChartWrap>
        ) : (
          <>
            <PlacementDonutWrap>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementCounts.filter((p) => p.count > 0).map((p) => ({
                      ...p,
                      pctLabel: `${totalGames > 0 ? ((p.count / totalGames) * 100).toFixed(0) : 0}%`,
                    }))}
                    dataKey="count"
                    nameKey="placement"
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="55%"
                    outerRadius="72%"
                    strokeWidth={0}
                    isAnimationActive={false}
                    {...{ activeIndex: activeDonutIndex } as Record<string, unknown>}
                    activeShape={(props: PieSectorDataItem) => (
                      <Sector
                        {...props}
                        outerRadius={(props.outerRadius ?? 0) + 4}
                        stroke="rgba(12, 20, 30, 0.7)"
                        strokeWidth={3}
                      />
                    )}
                    onMouseEnter={(_, i) => setActiveDonutIndex(i)}
                    onMouseLeave={() => setActiveDonutIndex(undefined)}
                    {...{ label: (props: Record<string, unknown>) => {
                      const { cx, cy, midAngle, outerRadius, placement, pctLabel } = props as {
                        cx: number; cy: number; midAngle: number; outerRadius: number;
                        placement: number; pctLabel: string;
                      };
                      const RADIAN = Math.PI / 180;
                      const sin = Math.sin(-RADIAN * midAngle);
                      const cos = Math.cos(-RADIAN * midAngle);
                      const r1 = outerRadius + 6;
                      const r2 = outerRadius + 20;
                      const x1 = cx + r1 * cos;
                      const y1 = cy + r1 * sin;
                      const x2 = cx + r2 * cos;
                      const y2 = cy + r2 * sin;
                      const textX = x2 + (cos >= 0 ? 4 : -4);
                      const anchor = cos >= 0 ? "start" : "end";
                      const color = PLACEMENT_COLORS[placement - 1];
                      return (
                        <g>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.5} />
                          <text
                            x={textX}
                            y={y2}
                            textAnchor={anchor}
                            dominantBaseline="middle"
                            fill={color}
                            fontSize={CHART.tick.fontSize}
                            fontFamily={CHART.tick.fontFamily}
                            fontWeight={700}
                          >
                            {toOrdinal(placement)}
                          </text>
                          <text
                            x={textX}
                            y={y2 + 12}
                            textAnchor={anchor}
                            dominantBaseline="middle"
                            fill={theme.semantic.color.textMuted}
                            fontSize={CHART.tick.fontSize - 1}
                            fontFamily={CHART.tick.fontFamily}
                          >
                            {pctLabel}
                          </text>
                        </g>
                      );
                    }, labelLine: false } as Record<string, unknown>}
                  >
                    {placementCounts.filter((p) => p.count > 0).map((p) => (
                      <Cell
                        key={p.placement}
                        fill={PLACEMENT_COLORS[p.placement - 1]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    wrapperStyle={{ zIndex: 10, transition: "none" }}
                    animationDuration={0}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as { placement: number; count: number };
                      const pct = totalGames > 0 ? ((data.count / totalGames) * 100).toFixed(1) : "0.0";
                      return (
                        <div style={{
                          background: "rgba(12, 20, 30, 0.6)",
                          backdropFilter: `blur(${theme.semantic.blur.standard})`,
                          WebkitBackdropFilter: `blur(${theme.semantic.blur.standard})`,
                          border: CHART.tooltip.border,
                          borderRadius: CHART.tooltip.radius,
                          boxShadow: CHART.tooltip.shadow,
                          padding: `${theme.primitive.spacing.xs} ${theme.primitive.spacing.sm}`,
                          fontFamily: CHART.tooltip.fontFamily,
                          fontSize: CHART.tooltip.fontSize,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <span style={{ color: PLACEMENT_COLORS[data.placement - 1], fontWeight: 600 }}>
                            {toOrdinal(data.placement)}
                          </span>
                          <span style={{ color: theme.primitive.color.neutral200 }}>
                            {data.count} game{data.count !== 1 ? "s" : ""}
                          </span>
                          <span style={{ color: theme.semantic.color.textMuted }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <DonutCenter>
                <DonutTotal>{totalGames}</DonutTotal>
                <DonutLabel>GAMES</DonutLabel>
              </DonutCenter>
            </PlacementDonutWrap>
          </>
        )}
      </GlassCard>

      {/* Match history — all games */}
      <GlassCard title="Match History" prominent>
        <MatchList>
          {(() => {
            const reversed = [...allMatchesSorted].reverse();
            const PREVIEW_COUNT = 20;
            const visible = showAllMatches ? reversed : reversed.slice(0, PREVIEW_COUNT);
            const remaining = reversed.length - PREVIEW_COUNT;
            return (
              <>
                {visible.map((m) => (
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
                    <MatchDateTouch>{formatShortDate(m.timestamp)}</MatchDateTouch>
                  </MatchRow>
                ))}
                {!showAllMatches && remaining > 0 && (
                  <ShowAllButton onClick={() => setShowAllMatches(true)}>
                    SHOW ALL ({reversed.length} GAMES)
                  </ShowAllButton>
                )}
              </>
            );
          })()}
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
