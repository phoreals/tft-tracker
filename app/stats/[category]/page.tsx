"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, User } from "lucide-react";
import { PieChart, Pie, Cell, Sector, Tooltip as RechartsTooltip, ResponsiveContainer, type PieSectorDataItem } from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { TabNavigation } from "@/components/TabNavigation";
import { DurationPill } from "@/components/DurationPill";
import { LINE_COLORS } from "@/components/RankChart";
import {
  formatPlaytime,
  percentOf,
  getSetWeeks,
  getLeaderboardColor,
  SET_START,
  SET_END,
  SET_LABEL,
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
};

// ── Category config ──────────────────────────────────────────────

type StatCategory = {
  title: string;
  isShare: boolean;
  getValue: (matches: MatchData[]) => number;
  formatValue: (n: number) => string;
  formatTotal: (n: number) => string;
};

const STAT_CATEGORIES: Record<string, StatCategory> = {
  games: {
    title: "Games Played",
    isShare: true,
    getValue: (ms) => ms.length,
    formatValue: (n) => String(n),
    formatTotal: (n) => String(n),
  },
  playtime: {
    title: "Squad Playtime",
    isShare: true,
    getValue: (ms) => ms.reduce((s, m) => s + m.duration, 0),
    formatValue: formatPlaytime,
    formatTotal: formatPlaytime,
  },
  "top4-rate": {
    title: "Avg Top 4 Rate",
    isShare: false,
    getValue: (ms) => (ms.length > 0 ? (ms.filter((m) => m.placement <= 4).length / ms.length) * 100 : 0),
    formatValue: (n) => `${n.toFixed(1)}%`,
    formatTotal: (n) => `${n.toFixed(1)}%`,
  },
  "win-rate": {
    title: "Squad Win Rate",
    isShare: false,
    getValue: (ms) => (ms.length > 0 ? (ms.filter((m) => m.placement === 1).length / ms.length) * 100 : 0),
    formatValue: (n) => `${n.toFixed(1)}%`,
    formatTotal: (n) => `${n.toFixed(1)}%`,
  },
};

// ── Types ────────────────────────────────────────────────────────

interface MatchData {
  matchId: string;
  placement: number;
  duration: number;
  timestamp: number;
}

interface PlayerData {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  matches: MatchData[];
}

type DonutPatternType = "solid" | "diag-right" | "horizontal" | "dots" | "diag-left" | "crosshatch";

const DONUT_PATTERN_TYPES: DonutPatternType[] = [
  "solid", "solid", "solid", "solid", "solid",
  "diag-right",  // 6:  /////
  "horizontal",  // 7:  =====
  "dots",        // 8:  · · ·
  "diag-left",   // 9:  \\\\\
  "crosshatch",  // 10: #####
];

function renderPatternDef(puuid: string, color: string, type: DonutPatternType): React.ReactElement | null {
  if (type === "solid") return null;
  const id = `dp-${puuid}-${type}`;
  // Background tinted with the same hue as the stroke for visual cohesion
  const bgFill = `${color}33`; // 20% opacity of line color
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

interface PlayerRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  value: number;
  label: string;
  color: string;
  playerIndex: number;
  patternType: DonutPatternType;
  games: number;
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

  svg:focus,
  svg *:focus {
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

const Table = styled.table`
  width: 100%;
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
  }
  td:first-child {
    padding-left: ${({ theme }) => theme.primitive.spacing.xs};
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


const LeaderRow = styled.tr`
  background: ${({ theme }) => theme.semantic.color.accentBgSubtle} !important;
`;


const LoadingText = styled.p`
  ${({ theme }) => theme.semantic.typography.label};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  text-align: center;
  padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
`;

const CategoryNavWrap = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 48px;
    z-index: 1;
    pointer-events: none;
    transition: opacity 0.15s;
  }

  &::before {
    left: 0;
    background: linear-gradient(to right, ${({ theme }) => theme.semantic.color.bgPrimary}, transparent);
    opacity: ${({ $fadeLeft }) => ($fadeLeft ? 1 : 0)};
  }

  &::after {
    right: 0;
    background: linear-gradient(to left, ${({ theme }) => theme.semantic.color.bgPrimary}, transparent);
    opacity: ${({ $fadeRight }) => ($fadeRight ? 1 : 0)};
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    &::before,
    &::after {
      display: none;
    }
  }
`;

const CategoryNav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  flex-wrap: nowrap;

  &::-webkit-scrollbar {
    height: 0;
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    flex-wrap: wrap;
    overflow-x: visible;
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

  const cat = STAT_CATEGORIES[slug];
  const weeks = useMemo(() => getSetWeeks(), []);
  const [selectedTab, setSelectedTab] = useSelectedTab();
  const catNavRef = useRef<HTMLElement>(null);
  const { fadeLeft: catFadeLeft, fadeRight: catFadeRight } = useScrollFade(catNavRef as React.RefObject<HTMLDivElement>);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

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

  const { rows, total } = useMemo(() => {
    if (!cat) return { rows: [], total: 0 };

    const computed: PlayerRow[] = players.map((p, i) => {
      const ms = p.matches.filter((m) => m.timestamp >= win.start && m.timestamp < win.end);
      const value = cat.getValue(ms);
      return {
        puuid: p.puuid,
        gameName: p.gameName,
        tagLine: p.tagLine,
        profileIconId: p.profileIconId,
        value,
        label: cat.formatValue(value),
        color: LINE_COLORS[i % LINE_COLORS.length],
        playerIndex: i,
        patternType: DONUT_PATTERN_TYPES[i % DONUT_PATTERN_TYPES.length],
        games: ms.length,
      };
    });

    const sorted = [...computed].sort((a, b) => b.value - a.value);
    const rawTotal = computed.reduce((s, r) => s + r.value, 0);

    return { rows: sorted, total: rawTotal };
  }, [players, win, cat]);

  if (!cat) return <LoadingText>Category not found.</LoadingText>;

  const hasData = rows.some((r) => r.value > 0);
  const aggregateLabel = cat.isShare
    ? cat.formatTotal(total)
    : rows.length > 0
    ? cat.formatTotal(total / rows.length)
    : "—";

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
            <><strong>{SET_LABEL}</strong>{"\u2002·\u2002"}{formatShortDate(SET_START)}{"\u2009\u2013\u2009"}{formatShortDate(SET_END)}</>
          ) : (() => {
            const w = weeks[selectedTab as number];
            return w ? <><strong>{w.label}</strong>{"\u2002·\u2002"}{formatShortDate(w.start)}{"\u2009\u2013\u2009"}{formatShortDate(w.end)}</> : null;
          })()}
        </PageSubtitle>
      </div>

      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} weeks={weeks} />

      <CategoryNavWrap $fadeLeft={catFadeLeft} $fadeRight={catFadeRight}>
      <CategoryNav ref={catNavRef} aria-label="Stat categories">
        {Object.entries(STAT_CATEGORIES).map(([key, c]) => (
          <CategoryPill
            key={key}
            href={`/stats/${key}?tab=${selectedTab}`}
            $active={key === slug}
          >
            {c.title}
          </CategoryPill>
        ))}
      </CategoryNav>
      </CategoryNavWrap>

      {loading ? (
        <LoadingText>Loading...</LoadingText>
      ) : !hasData ? (
        <LoadingText>No data for this time period.</LoadingText>
      ) : (
        <GlassCard prominent>
          <ContentGrid>
            {/* Left: chart */}
            {cat.isShare ? (
              <DonutSection>
                <DonutWrap>
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {rows.filter((r) => r.value > 0 && r.patternType !== "solid").map((r) =>
                        renderPatternDef(r.puuid, r.color, r.patternType)
                      )}
                    </defs>
                    <Pie
                      data={rows.filter((r) => r.value > 0)}
                      dataKey="value"
                      nameKey="gameName"
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
                      {rows.filter((r) => r.value > 0).map((r) => (
                        <Cell key={r.puuid} fill={getFill(r.puuid, r.color, r.patternType)} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      wrapperStyle={{ zIndex: 10, transition: "none" }}
                      animationDuration={0}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0] as { name: string; value: number };
                        const row = rows.find((r) => r.gameName === item.name);
                        if (!row) return null;
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
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
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <ColorDot color={row.color} patternType={row.patternType} />
                            <span style={{ color: theme.primitive.color.neutral200 }}>{item.name}</span>
                            <span style={{ color: theme.semantic.color.textMuted, marginLeft: "auto", paddingLeft: 12, flexShrink: 0 }}>
                              {cat.formatValue(item.value)} · {pct}%
                            </span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                  </ResponsiveContainer>
                  <DonutCenter>
                    <DonutTotal>{aggregateLabel}</DonutTotal>
                    <DonutLabel>TOTAL</DonutLabel>
                  </DonutCenter>
                </DonutWrap>
              </DonutSection>
            ) : (
              <GaugeSection>
                <DurationPill>{period}</DurationPill>
                <GaugeValue>{aggregateLabel}</GaugeValue>
                <GaugeLabel>Squad Avg</GaugeLabel>
                <GaugeTrack>
                  <GaugeFill $pct={typeof aggregateLabel === "string" ? parseFloat(aggregateLabel) : 0} />
                  <GaugeRef />
                  <GaugeRefLabel>50%</GaugeRefLabel>
                </GaugeTrack>
              </GaugeSection>
            )}

            {/* Right: ranked table */}
            <Table>
              <Thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>Summoner</th>
                  <th style={{ textAlign: "right" }}>{cat.title}</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </Thead>
              <Tbody>
                {rows.map((r, i) => {
                  const isLead = i === 0;
                  const Row = isLead ? LeaderRow : "tr";
                  return (
                    <Row key={r.puuid}>
                      <td>
                        <RankBadge $color={getLeaderboardColor(i + 1, rows.length)}>{i + 1}</RankBadge>
                      </td>
                      <td>
                        <SummonerCell>
                          <SummonerIcon>
                            {r.profileIconId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${r.profileIconId}.jpg`}
                                alt=""
                                width={32}
                                height={32}
                                style={{ display: "block" }}
                              />
                            ) : (
                              <User size={ICON_SIZE.md} />
                            )}
                          </SummonerIcon>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <ColorDot color={r.color} patternType={r.patternType} />
                            <span>{r.gameName}<span style={{ color: theme.semantic.color.textDisabled, fontSize: "0.85em", fontWeight: 400 }}>#{r.tagLine}</span></span>
                          </span>
                        </SummonerCell>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {r.label}
                      </td>
                      <td style={{ textAlign: "right", color: theme.semantic.color.textMuted, whiteSpace: "nowrap" }}>
                        {cat.isShare
                          ? `${total > 0 ? ((r.value / total) * 100).toFixed(1) : "0.0"}%`
                          : r.label}
                      </td>
                    </Row>
                  );
                })}
              </Tbody>
            </Table>
          </ContentGrid>
        </GlassCard>
      )}
    </Page>
  );
}
