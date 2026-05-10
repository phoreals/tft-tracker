"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, User } from "lucide-react";
import { PieChart, Pie, Cell, Sector, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid, ReferenceLine, type PieSectorDataItem } from "recharts";
import { SortChevron } from "@/components/SortChevron";
import { GlassCard } from "@/components/GlassCard";
import { TabNavigation } from "@/components/TabNavigation";
import { DurationPill } from "@/components/DurationPill";
import { LINE_COLORS } from "@/components/RankChart";
import {
  formatPlaytime,
  formatPlaytimeHours,
  getSetWeeks,
  getLeaderboardColor,
  computePlayerStats,
  SET_START,
  SET_END,
  SET_LABEL,
  type PlayerStatInput,
  type PlayerStat,
} from "@/lib/utils";
import { useSelectedTab } from "@/hooks/useSelectedTab";
import { useScrollFade } from "@/hooks/useTabNavigation";
import { theme, ICON_SIZE } from "@/styles/theme";

// ── Chart constants ──────────────────────────────────────────────

const CHART = {
  tooltip: {
    bg:         "rgba(12, 20, 30, 0.92)",
    border:     `1px solid ${theme.semantic.color.borderDefault}`,
    radius:     theme.semantic.radius.card,
    shadow:     theme.semantic.shadow.glassInset,
    fontFamily: "Space Grotesk",
    fontSize:   theme.semantic.typography.label.fontSize,
  },
  tick: {
    fill:       theme.primitive.color.neutral200,
    fontSize:   parseInt(theme.primitive.fontSize.xs),
    fontFamily: "Space Grotesk",
  },
  grid:         theme.component.table.borderColor,
  accent:       theme.semantic.color.accent,
  sleep:        theme.primitive.color.neutral700,
  free:         theme.primitive.color.neutral600,
};

// ── Unified category config ─────────────────────────────────────

type ChartMode = "donut" | "gauge" | "none";

type UnifiedCategory = {
  slug: string;
  title: string;
  navLabel?: string;
  key: "games" | "time" | "top4Rate" | "winRate" | "lpDiff" | "lpPerGame";
  chartMode: ChartMode;
  isShare: boolean;
  format: (v: number) => string;
  formatTotal: (v: number) => string;
  filter: (s: PlayerStat) => boolean;
  hasNegative: boolean;
  extraChart: {
    type: "bar";
    title: (period: string, dateRange: string) => string;
    getValue: (value: number, periodSec: number) => number;
    formatLabel: (v: number) => string;
    domainStep: number;
    getRefValue?: (ranked: RankedRow[]) => { value: number; label: string } | null;
  } | {
    type: "donuts";
    title: (period: string, dateRange: string) => string;
  } | null;
};

const UNIFIED_CATEGORIES: Record<string, UnifiedCategory> = {
  "games": {
    slug: "games",
    title: "Games Played",
    key: "games",
    chartMode: "donut",
    isShare: true,
    format: (v) => String(v),
    formatTotal: (v) => String(v),
    filter: (s) => s.games > 0,
    hasNegative: false,
    extraChart: {
      type: "bar",
      title: () => "Games Per Day",
      getValue: (value, periodSec) => value / (periodSec / 86400),
      formatLabel: (v) => `${v.toFixed(1)}/day`,
      domainStep: 1,
    },
  },
  "playtime": {
    slug: "playtime",
    title: "Playtime",
    key: "time",
    chartMode: "donut",
    isShare: true,
    format: formatPlaytime,
    formatTotal: formatPlaytime,
    filter: (s) => s.time > 0,
    hasNegative: false,
    extraChart: {
      type: "donuts",
      title: () => "% of Time in TFT",
    },
  },
  "top4-rate": {
    slug: "top4-rate",
    title: "Top 4 Rate",
    key: "top4Rate",
    chartMode: "gauge",
    isShare: false,
    format: (v) => `${v.toFixed(1)}%`,
    formatTotal: (v) => `${v.toFixed(1)}%`,
    filter: (s) => s.games > 0,
    hasNegative: false,
    extraChart: null,
  },
  "win-rate": {
    slug: "win-rate",
    title: "Win Rate",
    key: "winRate",
    chartMode: "gauge",
    isShare: false,
    format: (v) => `${v.toFixed(1)}%`,
    formatTotal: (v) => `${v.toFixed(1)}%`,
    filter: (s) => s.games > 0,
    hasNegative: false,
    extraChart: null,
  },
  "highest-lp": {
    slug: "highest-lp",
    title: "LP Gain",
    key: "lpDiff",
    chartMode: "none",
    isShare: false,
    format: (v) => `${v >= 0 ? "+" : ""}${v} LP`,
    formatTotal: (v) => `${v >= 0 ? "+" : ""}${v} LP`,
    filter: (s) => s.lpDiff !== null,
    hasNegative: true,
    extraChart: null,
  },
  "best-lp-per-game": {
    slug: "best-lp-per-game",
    title: "Avg LP Per Game",
    navLabel: "LP / Game",
    key: "lpPerGame",
    chartMode: "none",
    isShare: false,
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} LP/game`,
    formatTotal: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} LP/game`,
    filter: (s) => s.lpPerGame !== null,
    hasNegative: true,
    extraChart: null,
  },
};

// ── Types ────────────────────────────────────────────────────────

interface PlayerData extends PlayerStatInput {
  current: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    lastUpdated: string;
  } | null;
}

type DonutPatternType = "solid" | "diag-right" | "horizontal" | "dots" | "diag-left" | "crosshatch";

const DONUT_PATTERN_TYPES: DonutPatternType[] = [
  "solid", "solid", "solid", "solid", "solid",
  "solid", "solid", "solid", "solid", "solid",
];

// ── Donut pattern helpers ───────────────────────────────────────

function renderPatternDef(puuid: string, color: string, type: DonutPatternType): React.ReactElement | null {
  if (type === "solid") return null;
  const id = `dp-${puuid}-${type}`;
  const bgFill = `${color}33`;
  const bg8 = <rect width="8" height="8" fill={bgFill} />;
  let content: React.ReactElement;
  switch (type) {
    case "diag-right":
      content = <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={color} strokeWidth="2.5" strokeLinecap="square" />;
      break;
    case "horizontal":
      content = <line x1="0" y1="4" x2="8" y2="4" stroke={color} strokeWidth="2.5" />;
      break;
    case "dots":
      return (
        <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill={bgFill} />
          <circle cx="3" cy="3" r="2" fill={color} />
        </pattern>
      );
    case "diag-left":
      content = <path d="M2,-2 l-4,4 M8,0 l-8,8 M10,6 l-4,4" stroke={color} strokeWidth="2.5" strokeLinecap="square" />;
      break;
    case "crosshatch":
      content = (
        <>
          <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={color} strokeWidth="2" strokeLinecap="square" />
          <path d="M2,-2 l-4,4 M8,0 l-8,8 M10,6 l-4,4" stroke={color} strokeWidth="2" strokeLinecap="square" />
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="8" height="8">
      {bg8}
      {content}
    </pattern>
  );
}

function getFill(puuid: string, color: string, type: DonutPatternType): string {
  if (type === "solid") return color;
  return `url(#dp-${puuid}-${type})`;
}

function ColorDot({ color, patternType }: { color: string; patternType: DonutPatternType }) {
  if (patternType === "solid") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
        <circle cx="5" cy="5" r="4.5" fill={color} />
      </svg>
    );
  }
  const miniId = `mini-${color.replace("#", "")}-${patternType}`;
  const patternEl = renderPatternDef(miniId, color, patternType);
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
      {patternEl && <defs>{patternEl}</defs>}
      <circle cx="5" cy="5" r="4.5" fill={getFill(miniId, color, patternType)} />
    </svg>
  );
}

interface RankedRow {
  stat: PlayerStat;
  value: number;
  color: string;
  patternType: DonutPatternType;
  playerIndex: number;
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
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
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

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
`;

// ── Donut styled ────────────────────────────────────────────────

const DonutSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  width: 100%;
`;

const DonutWrap = styled.div`
  position: relative;
  touch-action: pan-y;
  svg:focus, svg *:focus {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.semantic.radius.element};
  }
  width: clamp(200px, 80dvw, 460px);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DonutCenter = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const DonutTotal = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: clamp(18px, 5dvw, 32px);
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  line-height: 1;
`;

const DonutLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: clamp(10px, 1.5dvw, 11px);
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-top: 3px;
  text-align: center;
`;

// ── Gauge styled ────────────────────────────────────────────────

const GaugeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  width: 50%;
`;

const GaugeValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  line-height: 1;
`;

const GaugeLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;

const GaugeToggle = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  background: ${({ $active, theme }) => $active ? theme.semantic.color.accentBgHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  @media (hover: hover) {
    &:hover {
      border-color: ${({ theme }) => theme.semantic.color.borderHover};
      color: ${({ theme }) => theme.semantic.color.textPrimary};
    }
  }
`;

const GaugeToggleRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const GaugeTrack = styled.div`
  position: relative;
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  overflow: visible;
  margin-top: ${({ theme }) => theme.primitive.spacing.xs};
`;

const GaugeFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
`;

const GaugeRef = styled.div`
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 12px;
  background: ${({ theme }) => theme.semantic.color.textDisabled};
  opacity: 0.5;
`;

const GaugeRefLabel = styled.span`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: calc(100% + ${({ theme }) => theme.primitive.spacing.xs});
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  white-space: nowrap;
`;

// ── Table styled ────────────────────────────────────────────────

const Table = styled.table`
  min-width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  th {
    ${({ theme }) => theme.semantic.typography.label};
    font-size: ${({ theme }) => theme.primitive.fontSize.xs};
    color: ${({ theme }) => theme.semantic.color.textMuted};
    text-align: left;
    padding: ${({ theme }) => theme.primitive.spacing.sm};
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
  }
  th:first-child {
    padding-left: ${({ theme }) => theme.primitive.spacing.xs};
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
  th:last-child {
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
`;

const SortIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : "currentColor"};
  opacity: ${({ $active }) => ($active ? 1 : 0.3)};
  transition: opacity 0.15s, color 0.15s;
`;

const SortTh = styled.th<{ $active: boolean }>`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted} !important;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary} !important;
  }

  &:hover ${SortIcon} {
    opacity: 0.5;
  }

  &:hover ${SortIcon}[data-active="true"] {
    opacity: 1;
  }

  &:active {
    opacity: 0.7;
  }
`;

const SortThInner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
`;

const RankBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  border: 1px solid ${({ $color }) => $color};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ $color }) => $color};
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
    transition: background 0.15s;
  }

  @media (hover: hover) {
    tr:hover {
      background: ${({ theme }) => theme.component.table.rowHoverBg};
    }
  }

  td {
    padding: ${({ theme }) => theme.primitive.spacing.sm};
    font-family: ${({ theme }) => theme.semantic.font.display};
    font-size: ${({ theme }) => theme.primitive.fontSize.sm};
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    white-space: nowrap;
  }
  td:first-child {
    padding-left: ${({ theme }) => theme.primitive.spacing.xs};
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
  td:last-child {
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
`;

const SummonerCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const SummonerIcon = styled.div`
  width: ${ICON_SIZE.avatar}px;
  height: ${ICON_SIZE.avatar}px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  width: fit-content;
  text-decoration: none;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  transition: color 0.15s, background 0.15s;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.xs};
  margin: -${({ theme }) => theme.primitive.spacing["2xs"]} -${({ theme }) => theme.primitive.spacing.xs};
  border-radius: ${({ theme }) => theme.semantic.radius.element};

  @media (hover: hover) {
    &:hover {
      color: ${({ theme }) => theme.semantic.color.accent};
      background: ${({ theme }) => theme.semantic.color.accentBgHover};
    }
    &:active {
      background: ${({ theme }) => theme.semantic.color.accentBgActive};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const TagSpan = styled.span`
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
`;

const BarTrack = styled.div`
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
`;

const BiBarTrack = styled.div`
  position: relative;
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const BiBarCenter = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => theme.semantic.color.borderHover};
  z-index: 1;
`;

const BiBarFill = styled.div<{ $pct: number; $positive: boolean }>`
  position: absolute;
  height: 100%;
  top: 0;
  background: ${({ $positive, theme }) =>
    $positive ? theme.semantic.color.accent : theme.semantic.color.danger};
  ${({ $positive, $pct }) =>
    $positive
      ? `left: 50%; width: ${$pct / 2}%;`
      : `right: 50%; width: ${$pct / 2}%;`}
`;

const LeaderRow = styled.tr`
  background: ${({ theme }) => theme.semantic.color.accentBgSubtle} !important;
`;

const LoadingText = styled.p`
  ${({ theme }) => theme.semantic.typography.label};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  text-align: center;
  padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
`;

const CategoryNav = styled.nav<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  flex-wrap: nowrap;
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
    height: 0;
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    flex-wrap: wrap;
    overflow-x: visible;
    mask-image: none;
    -webkit-mask-image: none;
  }
`;

const CategoryPill = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  background: ${({ $active, theme }) => $active ? theme.semantic.color.accentBgHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
    color: ${({ $active, theme }) =>
      $active ? theme.semantic.color.accent : theme.semantic.color.textPrimary};
  }

  @media (hover: none) {
    &:hover {
      border-color: ${({ $active, theme }) =>
        $active ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
      color: ${({ $active, theme }) =>
        $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const TableWrap = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
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
    border-radius: ${({ theme }) => theme.semantic.radius.pill};
  }
  &:hover::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.semantic.color.borderDefault};
  }

  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  &:hover {
    scrollbar-color: ${({ theme }) => theme.semantic.color.borderDefault} transparent;
  }
`;

const PeriodChartWrap = styled.div<{ $h: number }>`
  width: 100%;
  height: ${({ $h }) => $h}px;
`;

const DonutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.primitive.spacing.lg};
  justify-items: center;
`;

const MiniDonutCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const MiniDonutWrap = styled.div`
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MiniDonutCenter = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
`;

const MiniDonutCenterValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  line-height: 1;
`;

const MiniDonutCenterLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MiniDonutChip = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.xs};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  text-decoration: none;
  color: inherit;
  transition: background 0.2s;
  max-width: 100%;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.semantic.color.accentBgHover};
    }
    &:active {
      background: ${({ theme }) => theme.semantic.color.accentBgActive};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const MiniDonutChipIcon = styled.div`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  overflow: hidden;
  background: ${({ theme }) => theme.component.glassCard.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

const MiniDonutChipName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

const ChartLegend = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  flex-wrap: wrap;
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textMuted};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

// ── Helpers ──────────────────────────────────────────────────────

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Component ────────────────────────────────────────────────────

export default function StatsDrilldownPage() {
  const { category: slug } = useParams<{ category: string }>();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<"name" | "value">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [miniActiveIndex, setMiniActiveIndex] = useState<Record<string, number | undefined>>({});
  const [showWeighted, setShowWeighted] = useState(false);
  const [refLineTip, setRefLineTip] = useState<{ x: number; y: number } | null>(null);

  const cat = UNIFIED_CATEGORIES[slug];
  const weeks = useMemo(() => getSetWeeks(), []);
  const [selectedTab, setSelectedTab] = useSelectedTab();
  const catNavRef = useRef<HTMLElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const { fadeLeft: catFadeLeft, fadeRight: catFadeRight } = useScrollFade(catNavRef as React.RefObject<HTMLDivElement>);
  const { fadeLeft: tableFadeLeft, fadeRight: tableFadeRight } = useScrollFade(tableWrapRef);

  useEffect(() => {
    fetch("/api/players", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setPlayers(data))
      .finally(() => setLoading(false));
  }, []);

  const isSet = selectedTab === "set";
  const win = isSet
    ? { start: SET_START, end: SET_END }
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]);
  const weekNumber = (weeks[selectedTab as number] ?? weeks[weeks.length - 1])?.weekNumber;
  const period = isSet ? SET_LABEL : weekNumber ? `Week ${weekNumber}` : "This Week";

  const periodSec = win ? (Math.min(win.end, Date.now()) - win.start) / 1000 : 0;
  const periodLabel = isSet ? "the set" : "the week";
  const periodDateRange = win ? `${formatShortDate(win.start)} – ${formatShortDate(Math.min(win.end, Date.now()))}` : "";

  const stats = useMemo(() => {
    if (players.length === 0) return [];
    return computePlayerStats(players, win);
  }, [players, win]);

  const ranked = useMemo((): RankedRow[] => {
    if (!cat) return [];
    return stats
      .map((s, i) => ({
        stat: s,
        value: (s[cat.key] as number) ?? 0,
        color: LINE_COLORS[i % LINE_COLORS.length],
        patternType: DONUT_PATTERN_TYPES[i % DONUT_PATTERN_TYPES.length],
        playerIndex: i,
      }))
      .filter((r) => cat.filter(r.stat))
      .sort((a, b) => b.value - a.value);
  }, [stats, cat]);

  const toggleSort = (col: "name" | "value") => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  };

  const sortedRanked = useMemo(() => {
    if (sortCol === "value") {
      return sortDir === "desc" ? ranked : [...ranked].reverse();
    }
    return [...ranked].sort((a, b) => {
      const an = a.stat.player.gameName.toLowerCase();
      const bn = b.stat.player.gameName.toLowerCase();
      return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }, [ranked, sortCol, sortDir]);

  const total = useMemo(() => ranked.reduce((s, r) => s + r.value, 0), [ranked]);
  const maxVal = ranked.length > 0 ? Math.max(...ranked.map((r) => Math.abs(r.value))) : 1;

  const extraChartRows = useMemo(() => {
    const ec = cat?.extraChart;
    if (ec?.type !== "bar" || periodSec <= 0) return [];
    const filtered = ranked.filter((r) => r.value > 0);
    return filtered.map((r, i) => ({
      puuid: r.stat.player.puuid,
      gameName: r.stat.player.gameName,
      chartValue: parseFloat(ec.getValue(r.value, periodSec).toFixed(2)),
      rankColor: getLeaderboardColor(i + 1, filtered.length),
    }));
  }, [ranked, periodSec, cat]);

  const donutGridRows = useMemo(() => {
    if (cat?.extraChart?.type !== "donuts" || periodSec <= 0) return [];
    const sleepSec = periodSec / 3;
    return ranked
      .filter((r) => r.value > 0)
      .map((r) => ({
        puuid: r.stat.player.puuid,
        gameName: r.stat.player.gameName,
        tagLine: r.stat.player.tagLine,
        profileIconId: r.stat.player.profileIconId,
        pct: parseFloat(((r.value / periodSec) * 100).toFixed(1)),
        segments: [
          { name: "TFT", value: r.value },
          { name: "Free", value: Math.max(periodSec - r.value - sleepSec, 0) },
          { name: "Sleep", value: sleepSec },
        ],
      }));
  }, [ranked, periodSec, cat]);

  if (!cat) return <LoadingText>Category not found.</LoadingText>;

  const hasData = ranked.some((r) => r.value > 0);
  const simpleAvg = ranked.length > 0 ? total / ranked.length : 0;
  const weightedAvg = (() => {
    const totalGames = ranked.reduce((s, r) => s + r.stat.games, 0);
    return totalGames > 0 ? ranked.reduce((s, r) => s + r.value * r.stat.games, 0) / totalGames : 0;
  })();
  const aggregateLabel = cat.isShare
    ? cat.formatTotal(total)
    : ranked.length > 0
    ? cat.formatTotal(showWeighted ? weightedAvg : simpleAvg)
    : "—";

  const extraChartStep = (cat?.extraChart?.type === "bar" ? cat.extraChart.domainStep : 5);
  const extraChartDomainMax = extraChartRows.length > 0
    ? Math.max(Math.ceil(Math.max(...extraChartRows.map((r) => r.chartValue)) / extraChartStep) * extraChartStep, extraChartStep)
    : 10;
  const extraChartH = Math.max(extraChartRows.length * 44 + 24, 120);
  const extraChartRef = cat?.extraChart?.type === "bar" && cat.extraChart.getRefValue
    ? cat.extraChart.getRefValue(ranked)
    : null;

  // Donut data: only rows with positive values
  const donutData = ranked.filter((r) => r.value > 0);

  return (
    <Page>
      <BackLink href={`/?tab=${selectedTab}`}>
        <ArrowLeft size={ICON_SIZE.sm} />
        BACK TO HOME
      </BackLink>

      <div>
        <PageTitle>{cat.title}</PageTitle>
        <PageSubtitle>
          {isSet ? (
            <><strong>{SET_LABEL}</strong>{" · "}{formatShortDate(SET_START)}{" – "}{formatShortDate(SET_END)}</>
          ) : (() => {
            const w = weeks[selectedTab as number];
            return w ? <><strong>{w.label}</strong>{" · "}{formatShortDate(w.start)}{" – "}{formatShortDate(w.end)}</> : null;
          })()}
        </PageSubtitle>
      </div>

      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} weeks={weeks} />

      <CategoryNav ref={catNavRef} aria-label="Stat categories" $fadeLeft={catFadeLeft} $fadeRight={catFadeRight}>
        {Object.entries(UNIFIED_CATEGORIES).map(([key, c]) => (
          <CategoryPill
            key={key}
            href={`/stats/${key}?tab=${selectedTab}`}
            $active={key === slug}
          >
            {c.navLabel ?? c.title}
          </CategoryPill>
        ))}
      </CategoryNav>

      {loading ? (
        <LoadingText>Loading...</LoadingText>
      ) : !hasData ? (
        <LoadingText>No data for this time period.</LoadingText>
      ) : (
        <GlassCard prominent title={cat.title} titleExtra={<DurationPill>{period}</DurationPill>}>
          <ContentGrid>
            {/* Chart section */}
            {cat.chartMode === "donut" && (
              <DonutSection>
                <DonutWrap>
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {donutData.filter((r) => r.patternType !== "solid").map((r) =>
                        renderPatternDef(r.stat.player.puuid, r.color, r.patternType)
                      )}
                    </defs>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="stat.player.gameName"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      strokeWidth={0}
                      isAnimationActive={false}
                      {...{ activeIndex } as Record<string, unknown>}
                      activeShape={(props: PieSectorDataItem) => (
                        <Sector
                          {...props}
                          outerRadius={(props.outerRadius ?? 0) + 6}
                          stroke="rgba(12, 20, 30, 0.7)"
                          strokeWidth={3}
                        />
                      )}
                      onMouseEnter={(_, i) => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(undefined)}
                    >
                      {donutData.map((r) => (
                        <Cell key={r.stat.player.puuid} fill={getFill(r.stat.player.puuid, r.color, r.patternType)} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      wrapperStyle={{ zIndex: 10, transition: "none" }}
                      animationDuration={0}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as RankedRow | undefined;
                        if (!row) return null;
                        const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div style={{
                            background: CHART.tooltip.bg,
                            backdropFilter: `blur(${theme.semantic.blur.standard})`,
                            WebkitBackdropFilter: `blur(${theme.semantic.blur.standard})`,
                            border: CHART.tooltip.border,
                            borderRadius: CHART.tooltip.radius,
                            boxShadow: CHART.tooltip.shadow,
                            padding: `${theme.primitive.spacing.sm} ${theme.primitive.spacing.md}`,
                            fontFamily: "Space Grotesk",
                            fontSize: theme.semantic.typography.label.fontSize,
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <ColorDot color={row.color} patternType={row.patternType} />
                            <span style={{ color: theme.primitive.color.neutral200 }}>{row.stat.player.gameName}</span>
                            <span style={{ color: theme.semantic.color.textMuted, marginLeft: "auto", paddingLeft: 12, flexShrink: 0 }}>
                              {cat.format(row.value)} · {pct}%
                            </span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                  </ResponsiveContainer>
                  <DonutCenter>
                    <DonutTotal>{aggregateLabel}</DonutTotal>
                    <DonutLabel>SQUAD TOTAL</DonutLabel>
                  </DonutCenter>
                </DonutWrap>
              </DonutSection>
            )}

            {cat.chartMode === "gauge" && (
              <GaugeSection>
                <GaugeToggleRow>
                  <GaugeToggle $active={!showWeighted} onClick={() => setShowWeighted(false)}>Avg</GaugeToggle>
                  <GaugeToggle $active={showWeighted} onClick={() => setShowWeighted(true)}>Weighted</GaugeToggle>
                </GaugeToggleRow>
                <GaugeValue>{aggregateLabel}</GaugeValue>
                <GaugeLabel>{showWeighted ? "Weighted by games played" : "Squad Avg"}</GaugeLabel>
                <GaugeTrack role="meter" aria-valuenow={typeof aggregateLabel === "string" ? parseFloat(aggregateLabel) : 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${cat.title}: ${aggregateLabel}`}>
                  <GaugeFill $pct={typeof aggregateLabel === "string" ? parseFloat(aggregateLabel) : 0} />
                  <GaugeRef />
                  <GaugeRefLabel>50%</GaugeRefLabel>
                </GaugeTrack>
              </GaugeSection>
            )}

            {/* Ranked table */}
            <TableWrap ref={tableWrapRef} $fadeLeft={tableFadeLeft} $fadeRight={tableFadeRight}>
            <Table>
              <Thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <SortTh $active={sortCol === "name"} onClick={() => toggleSort("name")}>
                    <SortThInner>
                      Summoner
                      <SortIcon $active={sortCol === "name"} data-active={sortCol === "name" || undefined}>
                        <SortChevron direction={sortCol === "name" ? sortDir : "asc"} variant="alpha" />
                      </SortIcon>
                    </SortThInner>
                  </SortTh>
                  <SortTh $active={sortCol === "value"} onClick={() => toggleSort("value")} style={{ textAlign: "right" }}>
                    <SortThInner style={{ justifyContent: "flex-end" }}>
                      <SortIcon $active={sortCol === "value"} data-active={sortCol === "value" || undefined}>
                        <SortChevron direction={sortCol === "value" ? sortDir : "desc"} />
                      </SortIcon>
                      {cat.title}
                    </SortThInner>
                  </SortTh>
                  {cat.isShare && (
                    <th style={{ textAlign: "right" }}>%</th>
                  )}
                </tr>
              </Thead>
              <Tbody>
                {sortedRanked.map((r, i) => {
                  const naturalRank = ranked.indexOf(r) + 1;
                  const isLead = naturalRank === 1;
                  const Row = isLead ? LeaderRow : "tr";
                  const barPct = maxVal > 0 ? (Math.abs(r.value) / maxVal) * 100 : 0;
                  return (
                    <Row key={r.stat.player.puuid}>
                      <td>
                        <RankBadge $color={getLeaderboardColor(naturalRank, ranked.length)}>{naturalRank}</RankBadge>
                      </td>
                      <td>
                        <SummonerLink href={`/player/${r.stat.player.puuid}`}>
                          <SummonerIcon>
                            {r.stat.player.profileIconId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${r.stat.player.profileIconId}.jpg`}
                                alt=""
                                width={32}
                                height={32}
                                style={{ display: "block" }}
                              />
                            ) : (
                              <User size={ICON_SIZE.md} />
                            )}
                          </SummonerIcon>
                          <ColorDot color={r.color} patternType={r.patternType} />
                          <span>{r.stat.player.gameName}<TagSpan>#{r.stat.player.tagLine}</TagSpan></span>
                        </SummonerLink>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div>{cat.format(r.value)}</div>
                        {cat.hasNegative ? (
                          <BiBarTrack>
                            <BiBarCenter />
                            <BiBarFill $pct={barPct} $positive={r.value >= 0} />
                          </BiBarTrack>
                        ) : (
                          <BarTrack><BarFill $pct={barPct} /></BarTrack>
                        )}
                      </td>
                      {cat.isShare && (
                        <td style={{ textAlign: "right", color: theme.semantic.color.textMuted, whiteSpace: "nowrap" }}>
                          {total > 0 ? `${((r.value / total) * 100).toFixed(1)}%` : "0.0%"}
                        </td>
                      )}
                    </Row>
                  );
                })}
              </Tbody>
            </Table>
            </TableWrap>
          </ContentGrid>
        </GlassCard>
      )}

      {cat?.extraChart?.type === "bar" && !loading && extraChartRows.length > 0 && (
        <GlassCard prominent title={cat.extraChart.title(period, periodDateRange)} titleExtra={<DurationPill>{period}</DurationPill>}>
          <PeriodChartWrap $h={extraChartH}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={extraChartRows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis
                  type="number"
                  domain={[0, extraChartDomainMax]}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                />
                <YAxis
                  type="category"
                  dataKey="gameName"
                  width={96}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART.tick}
                />
                {extraChartRef && (
                  <ReferenceLine
                    x={extraChartRef.value}
                    stroke={CHART.accent}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={(props: Record<string, unknown>) => {
                      const vx = props.viewBox as { x?: number; y?: number; height?: number } | undefined;
                      if (!vx?.x || !vx?.height) return null;
                      return (
                        <rect
                          x={(vx.x as number) - 10}
                          y={vx.y as number}
                          width={20}
                          height={vx.height}
                          fill="transparent"
                          style={{ cursor: "default" }}
                          onMouseEnter={(e) => {
                            const r = (e.target as SVGRectElement).getBoundingClientRect();
                            setRefLineTip({ x: r.left + r.width / 2, y: r.top });
                          }}
                          onMouseLeave={() => setRefLineTip(null)}
                        />
                      );
                    }}
                  />
                )}
                <Bar dataKey="chartValue" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={20}>
                  {extraChartRows.map((r) => (
                    <Cell key={r.puuid} fill={r.rankColor} fillOpacity={0.85} />
                  ))}
                  <LabelList
                    dataKey="chartValue"
                    position="right"
                    formatter={(v: unknown) => (typeof v === "number" && cat.extraChart?.type === "bar" ? cat.extraChart.formatLabel(v) : "")}
                    style={{ fontFamily: CHART.tick.fontFamily, fontSize: CHART.tick.fontSize, fill: theme.semantic.color.textMuted }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </PeriodChartWrap>
          {refLineTip && extraChartRef && typeof document !== "undefined" && createPortal(
            <div style={{
              position: "fixed",
              left: refLineTip.x,
              top: refLineTip.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              background: CHART.tooltip.bg,
              backdropFilter: `blur(${theme.semantic.blur.standard})`,
              WebkitBackdropFilter: `blur(${theme.semantic.blur.standard})`,
              border: CHART.tooltip.border,
              borderRadius: CHART.tooltip.radius,
              boxShadow: CHART.tooltip.shadow,
              padding: `${theme.primitive.spacing.sm} ${theme.primitive.spacing.md}`,
              fontFamily: "Space Grotesk",
              fontSize: theme.semantic.typography.label.fontSize,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <svg width="16" height="2" style={{ flexShrink: 0 }}>
                <line x1="0" y1="1" x2="16" y2="1" stroke={CHART.accent} strokeWidth={1.5} strokeDasharray="4 4" />
              </svg>
              <span style={{ color: theme.primitive.color.neutral200 }}>{extraChartRef.label}</span>
            </div>,
            document.body,
          )}
          {extraChartRef && (
            <ChartLegend>
              <LegendItem>
                <svg width="16" height="2" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="1" x2="16" y2="1" stroke={CHART.accent} strokeWidth={1.5} strokeDasharray="4 4" />
                </svg>
                {extraChartRef.label}
              </LegendItem>
            </ChartLegend>
          )}
        </GlassCard>
      )}

      {cat?.extraChart?.type === "donuts" && !loading && donutGridRows.length > 0 && (
        <GlassCard prominent title={cat.extraChart.title(period, periodDateRange)} titleExtra={<DurationPill>{period}</DurationPill>}>
          <DonutGrid>
            {donutGridRows.map((r) => (
              <MiniDonutCard key={r.puuid}>
                <MiniDonutWrap>
                  <PieChart width={200} height={200}>
                    <Pie
                      data={r.segments}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      strokeWidth={0}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={false}
                      {...{ activeIndex: miniActiveIndex[r.puuid] } as Record<string, unknown>}
                      activeShape={(props: PieSectorDataItem) => (
                        <Sector
                          {...props}
                          outerRadius={(props.outerRadius ?? 0) + 4}
                          stroke="rgba(12, 20, 30, 0.7)"
                          strokeWidth={2}
                        />
                      )}
                      onMouseEnter={(_, i) => setMiniActiveIndex((prev) => ({ ...prev, [r.puuid]: i }))}
                      onMouseLeave={() => setMiniActiveIndex((prev) => ({ ...prev, [r.puuid]: undefined }))}
                    >
                      <Cell fill={CHART.accent} />
                      <Cell fill={CHART.free} />
                      <Cell fill={CHART.sleep} />
                    </Pie>
                    <RechartsTooltip
                      wrapperStyle={{ zIndex: 10, transition: "none" }}
                      animationDuration={0}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const seg = payload[0] as { name: string; value: number };
                        const segTotal = r.segments.reduce((s, d) => s + d.value, 0);
                        const segPct = segTotal > 0 ? ((seg.value / segTotal) * 100).toFixed(1) : "0";
                        const segColor = seg.name === "TFT" ? CHART.accent : seg.name === "Sleep" ? CHART.sleep : CHART.free;
                        return (
                          <div style={{
                            background: CHART.tooltip.bg,
                            backdropFilter: `blur(${theme.semantic.blur.standard})`,
                            WebkitBackdropFilter: `blur(${theme.semantic.blur.standard})`,
                            border: CHART.tooltip.border,
                            borderRadius: CHART.tooltip.radius,
                            boxShadow: CHART.tooltip.shadow,
                            padding: `${theme.primitive.spacing.sm} ${theme.primitive.spacing.md}`,
                            fontFamily: "Space Grotesk",
                            fontSize: theme.semantic.typography.label.fontSize,
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <LegendDot $color={segColor} />
                            <span style={{ color: theme.primitive.color.neutral200 }}>{seg.name === "TFT" ? "TFT" : seg.name === "Sleep" ? "Sleep" : "Free time"}</span>
                            <span style={{ color: theme.semantic.color.textMuted, marginLeft: "auto", paddingLeft: 12, flexShrink: 0 }}>
                              {formatPlaytimeHours(seg.value)} · {segPct}%
                            </span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                  <MiniDonutCenter>
                    <MiniDonutCenterValue>{r.pct}%</MiniDonutCenterValue>
                    <MiniDonutCenterLabel>in TFT</MiniDonutCenterLabel>
                  </MiniDonutCenter>
                </MiniDonutWrap>
                <MiniDonutChip href={`/player/${r.puuid}`}>
                  <MiniDonutChipIcon>
                    {r.profileIconId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${r.profileIconId}.jpg`}
                        alt=""
                        width={20}
                        height={20}
                        style={{ display: "block" }}
                      />
                    ) : (
                      <User size={12} />
                    )}
                  </MiniDonutChipIcon>
                  <MiniDonutChipName>{r.gameName}<TagSpan>#{r.tagLine}</TagSpan></MiniDonutChipName>
                </MiniDonutChip>
              </MiniDonutCard>
            ))}
          </DonutGrid>
          <ChartLegend>
            <LegendItem><LegendDot $color={CHART.accent} />TFT</LegendItem>
            <LegendItem><LegendDot $color={CHART.free} />Free time</LegendItem>
            <LegendItem><LegendDot $color={CHART.sleep} />Sleep (8h/day)</LegendItem>
          </ChartLegend>
        </GlassCard>
      )}
    </Page>
  );
}
