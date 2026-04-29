"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
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
  legend: {
    fontFamily: "Space Grotesk",
    fontSize:   theme.primitive.fontSize.sm,
  },
} as const;

// ── Styled ───────────────────────────────────────────────────────

const ChartContainer = styled.div`
  height: 220px;
  width: 100%;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    height: 288px;
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

// ── Constants ────────────────────────────────────────────────────

const LINE_COLORS = [
  theme.primitive.color.gold300,   // accent
  theme.primitive.color.cyan500,   // info
  theme.primitive.color.purple300, // highlight
  theme.primitive.color.red400,    // danger
  theme.primitive.color.green400,  // success
  "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#2dd4bf",
];

// Tier base LP values and short display labels, ordered low→high.
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

// ── Custom Tooltip ───────────────────────────────────────────────

interface TooltipEntry {
  color: string;
  name: string;
  value: number;
  payload: Record<string, unknown>;
}

function RankTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
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
      {payload.map((item) => {
        const rankLabel = item.payload[`${item.name}__label`];
        return (
          <p key={item.name} style={{ color: item.color, margin: "2px 0" }}>
            {item.name}: {String(rankLabel ?? item.value)}
          </p>
        );
      })}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────

interface PlayerData {
  gameName: string;
  history: HistorySnapshot[];
}

interface RankChartProps {
  players: PlayerData[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number }[];
}

export function RankChart({ players, selectedTab, weeks }: RankChartProps) {
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const check = () => setShowLegend(window.innerWidth >= parseInt(theme.primitive.breakpoint.md));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // The highlighted week — always the selected week, or the latest week for "This Set".
  const highlightWeek =
    selectedTab === "set"
      ? (weeks[weeks.length - 1] ?? null)
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1] ?? null);

  // Build a unified daily timeline from all players' history snapshots.
  const { chartData, yTicks, yDomain } = useMemo(() => {
    // Collect all unique date timestamps.
    const tsSet = new Set<number>();
    players.forEach((p) => {
      p.history.forEach((h) => tsSet.add(new Date(h.date).getTime()));
    });
    const allTs = [...tsSet].sort((a, b) => a - b);

    if (allTs.length === 0) return { chartData: [], yTicks: [], yDomain: [0, 3700] as [number, number] };

    // Build data points: one per day, one LP value per player.
    const data = allTs.map((ts) => {
      const point: Record<string, number | string> = { ts };
      players.forEach((p) => {
        const snap = p.history.find((h) => new Date(h.date).getTime() === ts);
        if (snap) {
          point[p.gameName] = rankToLP(snap.tier, snap.rank, snap.lp);
          point[`${p.gameName}__label`] = formatRank(snap.tier, snap.rank, snap.lp);
        }
      });
      return point;
    });

    // Compute Y-axis range from actual data, snapped to tier boundaries.
    const allLPValues: number[] = [];
    players.forEach((p) => {
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
    };
  }, [players]);

  const hasData = chartData.length > 0;

  const tierTickFormatter = (value: number) => {
    const tier = TIER_BASES.find((t) => t.lp === value);
    return tier ? tier.short : "";
  };

  return (
    <GlassCard title="RANK OVER TIME" icon={TrendingUp}>
      <ChartContainer>
        {!hasData ? (
          <EmptyState>No rank history yet. Sync to start tracking.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
                // Show ~6 ticks max to avoid crowding.
                tickCount={6}
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

              <Tooltip content={<RankTooltip />} />

              {showLegend && (
                <Legend wrapperStyle={CHART.legend} />
              )}

              {players.map((p, i) => (
                <Line
                  key={p.gameName}
                  type="monotone"
                  dataKey={p.gameName}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </GlassCard>
  );
}
