"use client";

import React, { useState, useMemo } from "react";
import styled from "styled-components";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GlassCard } from "./GlassCard";
import { TrendingUp } from "lucide-react";
import { SET_START, SET_END } from "@/lib/utils";
import type { MatchRecord, HistorySnapshot } from "@/lib/kv";

// ── Styled ───────────────────────────────────────────────────────

const ToggleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 10px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: ${({ $active, theme }) =>
    $active ? `1px solid ${theme.semantic.color.borderHover}` : "1px solid transparent"};
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accentHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }
`;

const ChartContainer = styled.div`
  height: 220px;
  width: 100%;
  margin-top: ${({ theme }) => theme.primitive.spacing.md};

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

// ── Helpers ──────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const LINE_COLORS = [
  "#e5c587", "#00fbfb", "#e4b9ff", "#f87171", "#34d399",
  "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#2dd4bf",
];

function getSetWeeks(): { label: string; start: number; end: number }[] {
  const weeks: { label: string; start: number; end: number }[] = [];
  let start = SET_START;
  let i = 1;
  const now = Date.now();
  while (start < SET_END && start < now) {
    const end = Math.min(start + WEEK_MS, SET_END);
    weeks.push({ label: `Wk ${i}`, start, end });
    start += WEEK_MS;
    i++;
  }
  return weeks;
}

// ── Component ────────────────────────────────────────────────────

type ChartMode = "placement" | "rank";

interface PlayerData {
  gameName: string;
  matches: MatchRecord[];
  history: HistorySnapshot[];
}

interface RankChartProps {
  players: PlayerData[];
}

const RANK_VALUES: Record<string, number> = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200,
  PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400,
  MASTER: 2800, GRANDMASTER: 3200, CHALLENGER: 3600,
};

const DIVISION_VALUES: Record<string, number> = {
  IV: 0, III: 100, II: 200, I: 300,
};

function rankToNumeric(tier: string, rank: string, lp: number): number {
  return (RANK_VALUES[tier] ?? 0) + (DIVISION_VALUES[rank] ?? 0) + lp;
}

function numericToLabel(value: number): string {
  const tiers = Object.entries(RANK_VALUES).sort((a, b) => a[1] - b[1]);
  let tierName = "Iron";
  for (const [name, threshold] of tiers) {
    if (value >= threshold) tierName = name.charAt(0) + name.slice(1).toLowerCase();
  }
  return tierName;
}

export function RankChart({ players }: RankChartProps) {
  const [mode, setMode] = useState<ChartMode>("placement");
  const weeks = useMemo(() => getSetWeeks(), []);

  // Placement chart: average placement per week from match data
  const placementData = useMemo(() => {
    return weeks.map((w) => {
      const point: Record<string, string | number> = { week: w.label };
      players.forEach((p) => {
        const weekMatches = p.matches.filter(
          (m) => m.timestamp >= w.start && m.timestamp < w.end
        );
        if (weekMatches.length > 0) {
          const avg = weekMatches.reduce((s, m) => s + m.placement, 0) / weekMatches.length;
          point[p.gameName] = parseFloat(avg.toFixed(2));
        }
      });
      // Only include weeks with at least one player's data
      const hasData = Object.keys(point).some((k) => k !== "week");
      return hasData ? point : null;
    }).filter(Boolean) as Record<string, string | number>[];
  }, [weeks, players]);

  // Rank chart: daily snapshots from history (existing logic)
  const rankData = useMemo(() => {
    const allDates = new Set<string>();
    players.forEach((p) => p.history.forEach((h) => allDates.add(h.date)));
    const sorted = Array.from(allDates).sort();
    return sorted.map((date) => {
      const point: Record<string, string | number> = { week: date };
      players.forEach((p) => {
        const snap = p.history.find((h) => h.date === date);
        if (snap) {
          point[p.gameName] = rankToNumeric(snap.tier, snap.rank, snap.lp);
        }
      });
      return point;
    });
  }, [players]);

  const chartData = mode === "placement" ? placementData : rankData;
  const hasData = chartData.length > 0;

  return (
    <GlassCard
      title={mode === "placement" ? "AVG PLACEMENT BY WEEK" : "RANK OVER TIME"}
      icon={TrendingUp}
      headerAction={
        <ToggleGroup>
          <ToggleButton $active={mode === "placement"} onClick={() => setMode("placement")}>
            Placement
          </ToggleButton>
          <ToggleButton $active={mode === "rank"} onClick={() => setMode("rank")}>
            Rank
          </ToggleButton>
        </ToggleGroup>
      }
    >
      <ChartContainer>
        {!hasData ? (
          <EmptyState>
            {mode === "placement"
              ? "No match data yet. Sync to start tracking."
              : "Rank history builds daily. Keep syncing."}
          </EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5c58711" vertical={false} />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }}
                width={50}
                {...(mode === "placement"
                  ? { reversed: true, domain: [1, 8] }
                  : { tickFormatter: numericToLabel })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18202b",
                  border: "1px solid #e5c58733",
                  borderRadius: "4px",
                  fontFamily: "Space Grotesk",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#d0c5b5" }}
                formatter={(value) =>
                  mode === "placement"
                    ? [`${Number(value).toFixed(2)} avg`, ""]
                    : [numericToLabel(Number(value)) + ` (${value})`, ""]
                }
              />
              <Legend wrapperStyle={{ fontFamily: "Space Grotesk", fontSize: "11px" }} />
              {players.map((p, i) => (
                <Line
                  key={p.gameName}
                  type="monotone"
                  dataKey={p.gameName}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </GlassCard>
  );
}
