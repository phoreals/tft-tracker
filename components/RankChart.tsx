"use client";

import React, { useState, useMemo, useEffect } from "react";
import styled from "styled-components";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { GlassCard } from "./GlassCard";
import { TrendingUp } from "lucide-react";
import { SET_START, SET_END } from "@/lib/utils";
import type { MatchRecord, HistorySnapshot } from "@/lib/kv";

// ── Styled ───────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.primitive.spacing.sm};
  margin-bottom: ${({ theme }) => theme.primitive.spacing.md};

  /* bleed to card edges — same technique as PlayerTable TabBar and TableWrap */
  margin-left: -${({ theme }) => theme.primitive.spacing.md};
  margin-right: -${({ theme }) => theme.primitive.spacing.md};
  padding-left: ${({ theme }) => theme.primitive.spacing.md};
  padding-right: ${({ theme }) => theme.primitive.spacing.md};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: -${({ theme }) => theme.primitive.spacing.lg};
    margin-right: -${({ theme }) => theme.primitive.spacing.lg};
    padding-left: ${({ theme }) => theme.primitive.spacing.lg};
    padding-right: ${({ theme }) => theme.primitive.spacing.lg};
  }

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(229, 197, 135, 0.2);
    border-radius: 9999px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 11px;
  padding: 10px 14px;
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

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active, theme }) =>
      $active ? theme.semantic.color.accentHover : "rgba(255,255,255,0.05)"};
  }
`;

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
  while (start < SET_END && start <= now) {
    const end = Math.min(start + WEEK_MS, SET_END);
    weeks.push({ label: `Wk ${i}`, start, end });
    start += WEEK_MS;
    i++;
  }
  return weeks;
}

function formatMatchDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Component ────────────────────────────────────────────────────

type ChartMode = "week" | "set";

interface PlayerData {
  gameName: string;
  matches: MatchRecord[];
  history: HistorySnapshot[];
}

interface RankChartProps {
  players: PlayerData[];
}

export function RankChart({ players }: RankChartProps) {
  const [mode, setMode] = useState<ChartMode>("week");
  const [showLegend, setShowLegend] = useState(false);
  const weeks = useMemo(() => getSetWeeks(), []);
  const currentWeek = weeks[weeks.length - 1];

  useEffect(() => {
    const check = () => setShowLegend(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // "This Week" — individual game placements for the current week,
  // merged into a single chronological timeline across all players.
  const weekData = useMemo(() => {
    if (!currentWeek) return [];

    const entries: { ts: number; player: string; placement: number }[] = [];
    players.forEach((p) => {
      p.matches
        .filter((m) => m.timestamp >= currentWeek.start && m.timestamp < currentWeek.end)
        .forEach((m) => entries.push({ ts: m.timestamp, player: p.gameName, placement: m.placement }));
    });
    entries.sort((a, b) => a.ts - b.ts);

    // One chart point per unique timestamp; multiple players can share a slot
    const pointsMap = new Map<number, Record<string, string | number>>();
    for (const e of entries) {
      if (!pointsMap.has(e.ts)) {
        pointsMap.set(e.ts, { week: formatMatchDate(e.ts) });
      }
      pointsMap.get(e.ts)![e.player] = e.placement;
    }
    return Array.from(pointsMap.values());
  }, [currentWeek, players]);

  // "This Set" — average placement per set-week across all weeks.
  const setData = useMemo(() => {
    return weeks.map((w) => {
      const point: Record<string, string | number> = { week: w.label };
      players.forEach((p) => {
        const wm = p.matches.filter((m) => m.timestamp >= w.start && m.timestamp < w.end);
        if (wm.length > 0) {
          point[p.gameName] = parseFloat(
            (wm.reduce((s, m) => s + m.placement, 0) / wm.length).toFixed(2)
          );
        }
      });
      const hasData = Object.keys(point).some((k) => k !== "week");
      return hasData ? point : null;
    }).filter(Boolean) as Record<string, string | number>[];
  }, [weeks, players]);

  const chartData = mode === "week" ? weekData : setData;
  const hasData = chartData.length > 0;

  return (
    <GlassCard title="PLACEMENT OVER TIME" icon={TrendingUp}>
      <TabBar>
        <Tab $active={mode === "week"} onClick={() => setMode("week")}>
          This Week
        </Tab>
        <Tab $active={mode === "set"} onClick={() => setMode("set")}>
          This Set
        </Tab>
      </TabBar>

      <ChartContainer>
        {!hasData ? (
          <EmptyState>
            {mode === "week"
              ? "No games played this week yet."
              : "No match data yet. Sync to start tracking."}
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
                reversed
                domain={[1, 8]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#d0c5b5", fontSize: 10, fontFamily: "Space Grotesk" }}
                width={24}
              />
              <ReferenceLine y={4.5} stroke="#e5c58733" strokeDasharray="6 4" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18202b",
                  border: "1px solid #e5c58733",
                  borderRadius: "4px",
                  fontFamily: "Space Grotesk",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#d0c5b5" }}
                formatter={(value) => [`${Number(value).toFixed(2)}`, ""]}
              />
              {showLegend && (
                <Legend wrapperStyle={{ fontFamily: "Space Grotesk", fontSize: "11px" }} />
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </GlassCard>
  );
}
