"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

import { rankToLP, formatRankAbbr, getRankColor } from "@/lib/utils";
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
    fontSize:   parseInt(theme.primitive.fontSize.xs),
    fontFamily: "Space Grotesk",
  },
  tooltip: {
    bg:               "rgba(12, 20, 30, 0.6)",
    backdropBlur:     "16px",
    border:           `1px solid ${theme.semantic.color.borderDefault}`,
    radius:           theme.primitive.radius.lg,
    shadow:           theme.semantic.shadow.glassInset,
    padding:          `${theme.primitive.spacing.sm} ${theme.primitive.spacing.md}`,
    fontFamily:       "Space Grotesk",
    fontSize:         theme.semantic.typography.label.fontSize,
    labelColor:       theme.semantic.color.textMuted,
    labelFontSize:    theme.semantic.typography.label.fontSize,
    labelFontWeight:  String(theme.semantic.typography.label.fontWeight),
  },
} as const;

// Muted palette anchored to the app's brand colors: warm gold (#e5c587) and
// cool cyan (#66fdfd). Colors arc from warm amber → sage → teal → periwinkle → mauve,
// all desaturated to feel cohesive on the dark glass background.
export const LINE_COLORS = [
  "#f472b6", // pink
  "#60a5fa", // blue
  "#fb923c", // orange
  "#a3e635", // lime
  "#2dd4bf", // teal
  "#38bdf8", // sky
  "#fbbf24", // amber
  "#4ade80", // mint
  "#f87171", // rose
  "#818cf8", // indigo
];

// Secondary visual differentiator: players 6–10 (indices 5–9) get a dashed stroke
// so each player has a unique color+pattern combination even when colors are similar
// on a small display. Matches the strokeDasharray prop on Recharts <Line>.
export const LINE_DASH_PATTERNS = [
  "",          // 1–5: solid
  "",
  "",
  "",
  "",
  "8 4",       // 6: long dash    ── ── ──
  "3 3",       // 7: short dash   – – – –
  "1 4",       // 8: dotted       ·  ·  ·
  "8 3 2 3",   // 9: dash-dot     ──·──·
  "12 3",      // 10: extra long  ────────
];

// ── Styled ───────────────────────────────────────────────────────

const ChartContainer = styled.div`
  height: 360px;
  width: 100%;
  touch-action: pan-y;

  svg:focus,
  svg *:focus {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.primitive.radius.sm};
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    height: 480px;
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
`;

const LegendChip = styled.button<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.primitive.spacing.xs};
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
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

function LegendSwatch({ color, dashPattern }: { color: string; dashPattern: string }) {
  return (
    <svg width="16" height="8" viewBox="0 0 16 8" style={{ flexShrink: 0, display: "block" }}>
      <line
        x1="0" y1="4" x2="16" y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashPattern || undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

const ClearChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 3px ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  background: transparent;
  color: ${({ theme }) => theme.semantic.color.accent};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
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

const AXIS_EMBLEM = 14;
const DIV_LABELS: Record<number, string> = { 0: "IV", 100: "III", 200: "II", 300: "I" };

function fullRankLabel(lp: number): string {
  const withinTier = lp % 400;
  const tierBase = lp - withinTier;
  const tier = TIER_BASES.find((t) => t.lp === tierBase);
  if (!tier) return "";
  const name = tier.name.charAt(0).toUpperCase() + tier.name.slice(1);
  const isHighTier = tierBase >= 2800;
  if (isHighTier) return name;
  return `${name} ${DIV_LABELS[withinTier] ?? ""}`;
}

function RankTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  if (x === undefined || y === undefined || !payload) return null;
  const lp = payload.value;
  const withinTier = lp % 400;
  const tierBase = lp - withinTier;
  const isHighTier = tierBase >= 2800;
  const tier = TIER_BASES.find((t) => t.lp === tierBase);

  // Skip non-boundary high-tier ticks (no divisions)
  if (isHighTier && withinTier !== 0) return null;

  const label = fullRankLabel(lp);

  return (
    <g
      onMouseEnter={(e) => setTipPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTipPos(null)}
      style={{ cursor: "default" }}
    >
      {/* Transparent hit area so small text is easy to hover */}
      <rect x={x - 34} y={y - 10} width={34} height={20} fill="transparent" />

      {tier && (
        <image
          href={`${EMBLEM_BASE}/${tier.name}_tft.svg`}
          x={x - 32}
          y={y - AXIS_EMBLEM / 2 - 1}
          width={AXIS_EMBLEM}
          height={AXIS_EMBLEM}
        />
      )}
      {!isHighTier && (
        <text
          x={x - 32 + AXIS_EMBLEM + 2}
          y={y}
          textAnchor="start"
          dominantBaseline="middle"
          fill={CHART.tick.fill}
          fontSize={CHART.tick.fontSize}
          fontFamily={CHART.tick.fontFamily}
          opacity={0.5}
        >
          {DIV_LABELS[withinTier] ?? ""}
        </text>
      )}

      {tipPos && typeof document !== "undefined" && createPortal(
        <div style={{
          position:             "fixed",
          left:                 tipPos.x + 12,
          top:                  tipPos.y - 13,
          zIndex:               9999,
          pointerEvents:        "none",
          whiteSpace:           "nowrap",
          background:           CHART.tooltip.bg,
          backdropFilter:       `blur(${CHART.tooltip.backdropBlur})`,
          WebkitBackdropFilter: `blur(${CHART.tooltip.backdropBlur})`,
          border:               CHART.tooltip.border,
          borderRadius:         CHART.tooltip.radius,
          padding:              "3px 8px",
          fontFamily:           CHART.tooltip.fontFamily,
          fontSize:             CHART.tooltip.fontSize,
          color:                CHART.tick.fill,
        }}>
          {label}
        </div>,
        document.body,
      )}
    </g>
  );
}

function formatDateTick(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Tooltip ───────────────────────────────────────────────────────

interface TooltipEntry {
  color: string;
  name: string;
  value: number | undefined;
  payload: Record<string, unknown>;
}

function makePortalTooltip(
  mousePos: React.RefObject<{ x: number; y: number }>,
  hoveredPlayerRef: React.RefObject<string | null>,
  playerNamesRef: React.RefObject<string[]>,
) {
  return function PortalTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: number;
  }) {
    if (!active || !payload?.length || typeof document === "undefined") return null;

    const hp = hoveredPlayerRef.current;
    const entries = (hp
      ? payload.filter((e) => e.name === hp)
      : [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    ).filter((e) => e.value != null);

    if (!entries.length) return null;

    const { x, y } = mousePos.current;
    const TOOLTIP_W = 200;
    const flipLeft = x + 16 + TOOLTIP_W > window.innerWidth;
    const leftPos  = flipLeft ? x - TOOLTIP_W - 8 : x + 16;

    return createPortal(
      <div
        style={{
          position:             "fixed",
          left:                 leftPos,
          top:                  y - 20,
          zIndex:               9999,
          pointerEvents:        "none",
          background:           CHART.tooltip.bg,
          backdropFilter:       `blur(${CHART.tooltip.backdropBlur})`,
          WebkitBackdropFilter: `blur(${CHART.tooltip.backdropBlur})`,
          border:               CHART.tooltip.border,
          borderRadius:         CHART.tooltip.radius,
          boxShadow:            CHART.tooltip.shadow,
          padding:              CHART.tooltip.padding,
          fontFamily:           CHART.tooltip.fontFamily,
          fontSize:             CHART.tooltip.fontSize,
          minWidth:             160,
        }}
      >
        <p style={{
          color:         CHART.tooltip.labelColor,
          fontSize:      CHART.tooltip.labelFontSize,
          fontWeight:    700,
          marginBottom:  10,
        }}>
          {label != null ? formatDateTick(label) : ""}
        </p>
        {entries.map((item) => {
          const rankLabel = String(item.payload[`${item.name}__label`] ?? item.value);
          const tier      = String(item.payload[`${item.name}__tier`] ?? "");
          const rankColor = getRankColor(tier);
          const playerIdx = playerNamesRef.current.indexOf(item.name);
          const dashPat = LINE_DASH_PATTERNS[playerIdx < 0 ? 0 : playerIdx % LINE_DASH_PATTERNS.length];
          return (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0" }}>
              <svg width="16" height="8" viewBox="0 0 16 8" style={{ flexShrink: 0 }}>
                <line x1="0" y1="4" x2="16" y2="4" stroke={item.color} strokeWidth="2.5" strokeDasharray={dashPat || undefined} strokeLinecap="round" />
              </svg>
              <span style={{ color: CHART.tick.fill, flex: 1 }}>{item.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 16, flexShrink: 0 }}>
                {tier && (
                  <img
                    src={`${EMBLEM_BASE}/${tier.toLowerCase()}_tft.svg`}
                    width={EMBLEM_SIZE}
                    height={EMBLEM_SIZE}
                    alt={tier}
                  />
                )}
                <span style={{ color: rankColor, fontWeight: 600 }}>{rankLabel}</span>
              </span>
            </div>
          );
        })}
      </div>,
      document.body,
    );
  };
}

// ── Types ────────────────────────────────────────────────────────

interface PlayerData {
  gameName: string;
  profileIconId?: number;
  history: HistorySnapshot[];
}

// ── Component ────────────────────────────────────────────────────

interface RankChartProps {
  players: PlayerData[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number }[];
  hideLegend?: boolean;
  lineColors?: string[];
  periodTag?: React.ReactNode;
}

export function RankChart({ players, selectedTab, weeks, hideLegend, lineColors, periodTag }: RankChartProps) {
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const hoveredPlayerRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const playerNamesRef = useRef<string[]>(players.map((p) => p.gameName));
  playerNamesRef.current = players.map((p) => p.gameName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const TooltipContent = useMemo(() => makePortalTooltip(mousePos, hoveredPlayerRef, playerNamesRef), []);

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

  // Build a unified daily timeline from all players' history snapshots.
  const { chartData, yTicks, yDomain } = useMemo(() => {
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
      };
    }

    // Build data points: one per day, one LP value per player.
    const data = allTs.map((ts) => {
      const point: Record<string, number | string> = { ts };
      visiblePlayers.forEach((p) => {
        const snap = p.history.find((h) => new Date(h.date).getTime() === ts);
        if (snap) {
          point[p.gameName] = rankToLP(snap.tier, snap.rank, snap.lp);
          point[`${p.gameName}__label`] = formatRankAbbr(snap.tier, snap.rank, snap.lp);
          point[`${p.gameName}__tier`] = snap.tier;
        }
      });
      return point;
    });

    // Compute Y-axis range from actual data, snapped to tier boundaries.
    const allLPValues: number[] = [];
    visiblePlayers.forEach((p) => {
      p.history.forEach((h) => allLPValues.push(rankToLP(h.tier, h.rank, h.lp)));
    });
    const rawMin = Math.min(...allLPValues);
    const rawMax = Math.max(...allLPValues);

    // Snap to the tier boundaries that contain the actual data range.
    const minBase = Math.max(0, Math.floor(rawMin / 400) * 400);
    const maxBase = Math.min(3600, Math.ceil(rawMax / 400) * 400);

    const ticks: number[] = [];
    for (let lp = minBase; lp <= maxBase; lp += 100) {
      const withinTier = lp % 400;
      const tierBase = lp - withinTier;
      if (tierBase >= 2800 && withinTier !== 0) continue; // no divisions in Master+
      ticks.push(lp);
    }

    return {
      chartData: data,
      yTicks: ticks,
      yDomain: [Math.max(0, minBase), maxBase] as [number, number],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, hiddenPlayers]);

  const hasData = chartData.length > 0;

  // The highlighted week — always the selected week, or the latest week for "This Set".
  const highlightWeek = selectedTab === "set"
    ? (weeks[weeks.length - 1] ?? null)
    : (weeks[selectedTab as number] ?? weeks[weeks.length - 1] ?? null);

  return (
    <GlassCard title="Rank Over Time" titleExtra={periodTag} prominent>
      <ChartContainer
        ref={containerRef}
        onMouseMove={(e) => { mousePos.current = { x: e.clientX, y: e.clientY }; }}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) mousePos.current = { x: t.clientX, y: t.clientY }; }}
        onTouchMove={(e) => { const t = e.touches[0]; if (t) mousePos.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={() => { mousePos.current = { x: -9999, y: -9999 }; hoveredPlayerRef.current = null; setHoveredPlayer(null); }}
      >
        {!hasData ? (
          <EmptyState>No rank history yet. Sync to start tracking.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 16, bottom: 0, left: 4 }}
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
                tick={RankTick as Parameters<typeof YAxis>[0]["tick"]}
                width={36}
              />

              {/* Shade the selected week */}
              {highlightWeek && (
                <ReferenceArea
                  x1={highlightWeek.start}
                  x2={highlightWeek.end}
                  fill={CHART.refFill}
                  stroke={CHART.refStroke}
                  strokeWidth={1}
                  ifOverflow="hidden"
                />
              )}

              <Tooltip
                content={<TooltipContent />}
                cursor={{ stroke: CHART.refStroke, strokeWidth: 1 }}
                wrapperStyle={{ background: "none", border: "none", boxShadow: "none", padding: 0, pointerEvents: "none" }}
              />

              {visiblePlayers.map((p) => {
                const globalIdx = players.indexOf(p);
                const colors = lineColors ?? LINE_COLORS;
                const color = colors[globalIdx % colors.length];
                const dashPattern = LINE_DASH_PATTERNS[globalIdx % LINE_DASH_PATTERNS.length];
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
                    strokeDasharray={dashPattern || undefined}
                    dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 4, stroke: CHART.gold, strokeWidth: 2 }}
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

      {!hideLegend && players.length > 0 && (
        <LegendRow>
          {players.map((p, i) => {
            const colors = lineColors ?? LINE_COLORS;
            const color = colors[i % colors.length];
            const dashPattern = LINE_DASH_PATTERNS[i % LINE_DASH_PATTERNS.length];
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
                <LegendSwatch color={color} dashPattern={dashPattern} />
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
