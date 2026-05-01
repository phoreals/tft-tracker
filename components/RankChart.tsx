"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import styled from "styled-components";
import { GlassCard } from "./GlassCard";
import { TrendingUp } from "lucide-react";
import { rankToLP, formatRank } from "@/lib/utils";
import type { HistorySnapshot } from "@/lib/kv";
import { theme } from "@/styles/theme";

// ── Chart constants ───────────────────────────────────────────────
// Recharts props can't consume theme functions, so we reference the
// exported theme object directly here.
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
    padding:    `${theme.primitive.spacing.xs} ${theme.primitive.spacing.sm}`,
    fontFamily: "Space Grotesk",
    fontSize:   theme.semantic.typography.label.fontSize,
    labelColor: theme.primitive.color.neutral200,
  },
} as const;

// Gold-family palette — patterns are the primary differentiator; color provides secondary cues.
// Anchored to brand gold #e5c587, ranging from deep bronze → pale cream.
export const LINE_COLORS = [
  "#e5c587", // brand gold        (solid)
  "#a07830", // dark amber        (dashed)
  "#f5e0a8", // pale gold         (dotted)
  "#c09040", // medium amber      (dash-dot)
  "#7a5818", // deep bronze       (long-dash)
  "#f0cc70", // bright warm gold  (solid)
  "#b89050", // medium-dark gold  (dashed)
  "#fdedc0", // cream gold        (dotted)
  "#d4a840", // warm mid-gold     (dash-dot)
  "#8c6820", // rich bronze       (long-dash)
];

// Dash patterns — paired with colors for an extra visual dimension.
// 5 patterns cycle through the 10 colors (each pattern used twice, with different colors).
const DASH_PATTERNS: (string | undefined)[] = [
  undefined,  // solid
  "6 3",      // dashed
  "2 3",      // dotted
  "8 3 2 3",  // dash-dot
  "12 4",     // long dash
  undefined,
  "6 3",
  "2 3",
  "8 3 2 3",
  "12 4",
];

// ── Styled ───────────────────────────────────────────────────────

const ChartContainer = styled.div`
  height: 260px;
  width: 100%;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    height: 360px;
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

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  margin-top: ${({ theme }) => theme.primitive.spacing.xs};
`;

const LegendChip = styled.button<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  background: transparent;
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  cursor: pointer;
  opacity: ${({ $hidden }) => ($hidden ? 0.35 : 1)};
  transition: opacity 0.15s, border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  @media (hover: none) {
    &:hover {
      border-color: ${({ theme }) => theme.semantic.color.borderDefault};
    }
  }

  &:active {
    background: rgba(229, 197, 135, 0.06);
  }
`;

const LegendSwatch = styled.span<{ $color: string; $dash?: string }>`
  display: inline-block;
  width: 18px;
  height: 2px;
  border-radius: 1px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  position: relative;
`;

const ClearChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 3px ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  background: transparent;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  &:active {
    background: rgba(229, 197, 135, 0.06);
  }
`;

// ── Constants ────────────────────────────────────────────────────

// Tier base LP values and short display labels, ordered low→high.
const TIER_BASES: { lp: number; short: string; name: string }[] = [
  { lp: 0,    short: "Iron",    name: "iron"        },
  { lp: 400,  short: "Bronze",  name: "bronze"      },
  { lp: 800,  short: "Silver",  name: "silver"      },
  { lp: 1200, short: "Gold",    name: "gold"        },
  { lp: 1600, short: "Plat",    name: "platinum"    },
  { lp: 2000, short: "Em",      name: "emerald"     },
  { lp: 2400, short: "Diamond", name: "diamond"     },
  { lp: 2800, short: "Master",  name: "master"      },
  { lp: 3200, short: "GM",      name: "grandmaster" },
  { lp: 3600, short: "Chal",    name: "challenger"  },
];

const EMBLEM_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

const EMBLEM_SIZE = 16;

function TierTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  if (x === undefined || y === undefined || !payload) return null;
  const tier = TIER_BASES.find((t) => t.lp === payload.value);
  if (!tier) return null;
  return (
    <image
      href={`${EMBLEM_BASE}/${tier.name}_tft.svg`}
      x={x - EMBLEM_SIZE - 2}
      y={y - EMBLEM_SIZE / 2}
      width={EMBLEM_SIZE}
      height={EMBLEM_SIZE}
    />
  );
}

const PROFILE_ICON_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons";

function formatDateTick(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Custom Tooltip ───────────────────────────────────────────────

interface TooltipEntry {
  color: string;
  name: string;
  value: number;
  payload: Record<string, unknown>;
}

function makeTooltip(hoveredPlayerRef: React.RefObject<string | null>) {
  return function RankTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: number;
  }) {
    if (!active || !payload?.length) return null;

    const hp = hoveredPlayerRef.current;
    const entries: TooltipEntry[] = hp
      ? payload.filter((item) => item.name === hp)
      : [...payload].sort((a, b) => b.value - a.value);

    return (
      <div
        style={{
          background:   CHART.tooltip.bg,
          border:       CHART.tooltip.border,
          borderRadius: CHART.tooltip.radius,
          padding:      CHART.tooltip.padding,
          fontFamily:   CHART.tooltip.fontFamily,
          fontSize:     CHART.tooltip.fontSize,
        }}
      >
        <p style={{ color: CHART.tooltip.labelColor, marginBottom: 4 }}>
          {label != null ? formatDateTick(label) : ""}
        </p>
        {entries.map((item) => {
          const rankLabel = item.payload[`${item.name}__label`];
          return (
            <p key={item.name} style={{ color: item.color, margin: "2px 0" }}>
              {item.name}: {String(rankLabel ?? item.value)}
            </p>
          );
        })}
      </div>
    );
  };
}

// ── Profile dot ──────────────────────────────────────────────────

interface PlayerData {
  gameName: string;
  profileIconId?: number;
  history: HistorySnapshot[];
}

const DOT_R = 12; // radius of the profile pic circle

function makeProfileDot(player: PlayerData, color: string, lastIdx: number) {
  const uid = `pdot_${player.gameName.replace(/[^a-z0-9]/gi, "_")}`;
  return function ProfileDot(props: {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: Record<string, unknown>;
  }) {
    const { cx, cy, index, payload } = props;
    if (cx === undefined || cy === undefined || index === undefined) return <g />;
    if (payload?.[player.gameName] === undefined) return <g />;

    // Last valid data point — render profile pic + name label.
    if (index === lastIdx) {
      return (
        <g>
          <defs>
            <clipPath id={uid}>
              <circle cx={cx} cy={cy} r={DOT_R} />
            </clipPath>
          </defs>
          {player.profileIconId ? (
            <image
              href={`${PROFILE_ICON_BASE}/${player.profileIconId}.jpg`}
              x={cx - DOT_R}
              y={cy - DOT_R}
              width={DOT_R * 2}
              height={DOT_R * 2}
              clipPath={`url(#${uid})`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <circle cx={cx} cy={cy} r={DOT_R} fill={color} opacity={0.25} />
          )}
          <circle cx={cx} cy={cy} r={DOT_R} fill="none" stroke={color} strokeWidth={1.5} />
          <text
            x={cx + DOT_R + 5}
            y={cy + 4}
            fill={color}
            fontSize={10}
            fontFamily="Space Grotesk"
            fontWeight={600}
          >
            {player.gameName}
          </text>
        </g>
      );
    }

    // All other data points — small dot.
    return <circle cx={cx} cy={cy} r={2.5} fill={color} />;
  };
}

// ── Component ────────────────────────────────────────────────────

interface RankChartProps {
  players: PlayerData[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number }[];
}

export function RankChart({ players, selectedTab, weeks }: RankChartProps) {
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const hoveredPlayerRef = useRef<string | null>(null);

  const TooltipContent = useMemo(() => makeTooltip(hoveredPlayerRef), []);

  const toggleHidden = (name: string) => {
    setHiddenPlayers((prev) => {
      // All visible: solo this player (hide everyone else)
      if (prev.size === 0) {
        return new Set(players.filter((p) => p.gameName !== name).map((p) => p.gameName));
      }
      // Normal toggle
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visiblePlayers = players.filter((p) => !hiddenPlayers.has(p.gameName));

  // The highlighted week — always the selected week, or the latest week for "This Set".
  const highlightWeek =
    selectedTab === "set"
      ? (weeks[weeks.length - 1] ?? null)
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1] ?? null);

  // Build a unified daily timeline from all players' history snapshots.
  const { chartData, yTicks, yDomain, lastValidIndices } = useMemo(() => {
    // Collect all unique date timestamps.
    const tsSet = new Set<number>();
    visiblePlayers.forEach((p) => {
      p.history.forEach((h) => tsSet.add(new Date(h.date).getTime()));
    });
    const allTs = [...tsSet].sort((a, b) => a - b);

    if (allTs.length === 0) {
      return {
        chartData: [],
        yTicks: [],
        yDomain: [0, 3700] as [number, number],
        lastValidIndices: {} as Record<string, number>,
      };
    }

    // Build data points: one per day, one LP value per player.
    const data = allTs.map((ts) => {
      const point: Record<string, number | string> = { ts };
      visiblePlayers.forEach((p) => {
        const snap = p.history.find((h) => new Date(h.date).getTime() === ts);
        if (snap) {
          point[p.gameName] = rankToLP(snap.tier, snap.rank, snap.lp);
          point[`${p.gameName}__label`] = formatRank(snap.tier, snap.rank, snap.lp);
        }
      });
      return point;
    });

    // Last index where each player has data.
    const lastValidIndices: Record<string, number> = {};
    visiblePlayers.forEach((p) => {
      let last = -1;
      data.forEach((pt, i) => {
        if (pt[p.gameName] !== undefined) last = i;
      });
      lastValidIndices[p.gameName] = last;
    });

    // Compute Y-axis range from actual data, snapped to tier boundaries.
    const allLPValues: number[] = [];
    visiblePlayers.forEach((p) => {
      p.history.forEach((h) => allLPValues.push(rankToLP(h.tier, h.rank, h.lp)));
    });
    const rawMin = Math.min(...allLPValues);
    const rawMax = Math.max(...allLPValues);

    // Snap to tier boundaries with one tier of padding on each side.
    const minBase = Math.max(0, Math.floor(rawMin / 400) * 400 - 400);
    const maxBase = Math.ceil(rawMax / 400) * 400 + 400;

    const ticks = TIER_BASES
      .filter((t) => t.lp >= minBase && t.lp <= maxBase)
      .map((t) => t.lp);

    return {
      chartData: data,
      yTicks: ticks,
      yDomain: [Math.max(0, minBase), maxBase] as [number, number],
      lastValidIndices,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, hiddenPlayers]);

  const hasData = chartData.length > 0;

  return (
    <GlassCard title="Rank Over Time" icon={TrendingUp} prominent>
      <ChartContainer>
        {!hasData ? (
          <EmptyState>No rank history yet. Sync to start tracking.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
              onMouseLeave={() => {
                hoveredPlayerRef.current = null;
                setHoveredPlayer(null);
              }}
            >
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
                dy={10}
                tickCount={6}
              />

              <YAxis
                domain={yDomain}
                ticks={yTicks}
                axisLine={false}
                tickLine={false}
                tick={TierTick as Parameters<typeof YAxis>[0]["tick"]}
                width={24}
              />

              {/* Shade the selected week */}
              {highlightWeek && (
                <ReferenceArea
                  x1={highlightWeek.start}
                  x2={highlightWeek.end}
                  fill={CHART.refFill}
                  stroke={CHART.refStroke}
                  strokeWidth={1}
                />
              )}

              <Tooltip content={<TooltipContent />} />

              {visiblePlayers.map((p) => {
                const globalIdx = players.indexOf(p);
                const color = LINE_COLORS[globalIdx % LINE_COLORS.length];
                const dash = DASH_PATTERNS[globalIdx % DASH_PATTERNS.length];
                const lastIdx = lastValidIndices[p.gameName] ?? -1;
                const isHovered = hoveredPlayer === p.gameName;
                const anyHovered = hoveredPlayer !== null;
                const opacity = anyHovered ? (isHovered ? 1 : 0.2) : 1;
                const strokeW = anyHovered ? (isHovered ? 2.5 : 1) : 2;
                return (
                  <Line
                    key={p.gameName}
                    type="monotone"
                    dataKey={p.gameName}
                    stroke={color}
                    strokeWidth={strokeW}
                    strokeOpacity={opacity}
                    strokeDasharray={dash}
                    dot={makeProfileDot(p, color, lastIdx)}
                    activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                    onMouseEnter={() => {
                      hoveredPlayerRef.current = p.gameName;
                      setHoveredPlayer(p.gameName);
                    }}
                    onMouseLeave={() => {
                      hoveredPlayerRef.current = null;
                      setHoveredPlayer(null);
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {players.length > 0 && (
        <LegendRow>
          {players.map((p, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const dash = DASH_PATTERNS[i % DASH_PATTERNS.length];
            const isHidden = hiddenPlayers.has(p.gameName);
            return (
              <LegendChip
                key={p.gameName}
                type="button"
                $hidden={isHidden}
                aria-pressed={!isHidden}
                aria-label={`${isHidden ? "Show" : "Hide"} ${p.gameName}`}
                onClick={() => toggleHidden(p.gameName)}
              >
                <svg width={18} height={10} style={{ flexShrink: 0 }}>
                  <line
                    x1={0} y1={5} x2={18} y2={5}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={dash}
                  />
                </svg>
                {p.gameName}
              </LegendChip>
            );
          })}
          {hiddenPlayers.size > 0 && (
            <ClearChip
              type="button"
              onClick={() => setHiddenPlayers(new Set())}
              aria-label="Show all players"
            >
              Show all
            </ClearChip>
          )}
        </LegendRow>
      )}
    </GlassCard>
  );
}
