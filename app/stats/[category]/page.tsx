"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, Gamepad2, Clock, Trophy, User } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { CustomSelect } from "@/components/CustomSelect";
import { GlassCard } from "@/components/GlassCard";
import { LINE_COLORS } from "@/components/RankChart";
import {
  formatPlaytime,
  percentOf,
  getSetWeeks,
  SET_START,
  SET_END,
  SET_LABEL,
} from "@/lib/utils";
import { theme, ICON_SIZE } from "@/styles/theme";

// ── Category config ──────────────────────────────────────────────

type StatCategory = {
  title: string;
  icon: React.ElementType;
  isShare: boolean;
  getValue: (matches: MatchData[]) => number;
  formatValue: (n: number) => string;
  formatTotal: (n: number) => string;
  getBarPct: (value: number, total: number) => number;
};

const STAT_CATEGORIES: Record<string, StatCategory> = {
  games: {
    title: "Games Played",
    icon: Gamepad2,
    isShare: true,
    getValue: (ms) => ms.length,
    formatValue: (n) => String(n),
    formatTotal: (n) => String(n),
    getBarPct: (v, total) => (total > 0 ? (v / total) * 100 : 0),
  },
  playtime: {
    title: "Squad Playtime",
    icon: Clock,
    isShare: true,
    getValue: (ms) => ms.reduce((s, m) => s + m.duration, 0),
    formatValue: formatPlaytime,
    formatTotal: formatPlaytime,
    getBarPct: (v, total) => (total > 0 ? (v / total) * 100 : 0),
  },
  "top4-rate": {
    title: "Avg Top 4 Rate",
    icon: Trophy,
    isShare: false,
    getValue: (ms) => (ms.length > 0 ? (ms.filter((m) => m.placement <= 4).length / ms.length) * 100 : 0),
    formatValue: (n) => `${n.toFixed(1)}%`,
    formatTotal: (n) => `${n.toFixed(1)}%`,
    getBarPct: (v) => v, // already a percentage
  },
  "win-rate": {
    title: "Squad Win Rate",
    icon: Trophy,
    isShare: false,
    getValue: (ms) => (ms.length > 0 ? (ms.filter((m) => m.placement === 1).length / ms.length) * 100 : 0),
    formatValue: (n) => `${n.toFixed(1)}%`,
    formatTotal: (n) => `${n.toFixed(1)}%`,
    getBarPct: (v) => v,
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

interface PlayerRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  value: number;
  label: string;
  color: string;
  games: number;
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
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
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

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: 4px;
`;

const StickyTabWrap = styled.div<{ $isSticky: boolean }>`
  position: sticky;
  top: 0;
  z-index: 20;
  transition: box-shadow 0.2s, border-color 0.2s;
  ${({ $isSticky }) => $isSticky ? "-webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);" : ""}
  border-bottom: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  box-shadow: ${({ $isSticky, theme }) => ($isSticky ? `0 4px 16px ${theme.semantic.color.accentBgSubtle}` : "none")};
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  margin-right: -${({ theme }) => theme.primitive.spacing.sm};
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: calc(-${({ theme }) => theme.primitive.spacing.xl} - var(--bleed-extra, 0px));
    margin-right: calc(-${({ theme }) => theme.primitive.spacing.xl} - var(--bleed-extra, 0px));
    padding: ${({ theme }) => theme.primitive.spacing.xs} calc(${({ theme }) => theme.primitive.spacing.xl} + var(--bleed-extra, 0px));
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
      if ($fadeLeft && $fadeRight) return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft) return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight) return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
      return "none";
    }};
    -webkit-mask-image: ${({ $fadeLeft, $fadeRight }) => {
      if ($fadeLeft && $fadeRight) return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft) return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight) return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
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

const MobileSelectWrap = styled.div`
  display: block;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.md};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.semantic.color.borderHover : "transparent")};
  background: ${({ $active, theme }) => ($active ? theme.semantic.color.accentHover : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.semantic.color.accent : theme.semantic.color.textMuted)};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active, theme }) => ($active ? theme.semantic.color.accentHover : theme.semantic.color.borderDim)};
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }
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
  font-size: clamp(8px, 1.5dvw, 11px);
  letter-spacing: 0.06em;
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
  letter-spacing: 0.06em;
`;

const GaugeTrack = styled.div`
  position: relative;
  height: 4px;
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  overflow: visible;
  margin-top: ${({ theme }) => theme.primitive.spacing.xs};
`;

const GaugeFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  th {
    ${({ theme }) => theme.semantic.typography.label};
    font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
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

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textMuted};
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
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const ColorDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const BarTrack = styled.div`
  height: 4px;
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  margin-top: 4px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
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

// ── Helpers ──────────────────────────────────────────────────────

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function useFullBleedSticky() {
  const [stickyEl, setStickyEl] = useState<HTMLDivElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);

  const stickyRef = useCallback((node: HTMLDivElement | null) => setStickyEl(node), []);

  useEffect(() => {
    if (!stickyEl) return;
    const check = () => setIsSticky(stickyEl.getBoundingClientRect().top <= 1);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [stickyEl]);

  useEffect(() => {
    if (!stickyEl) return;
    const main = stickyEl.closest("main");
    if (!main) return;
    const update = () => {
      const extra = Math.max(0, (main.getBoundingClientRect().width - 1440) / 2);
      stickyEl.style.setProperty("--bleed-extra", `${extra}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    return () => ro.disconnect();
  }, [stickyEl]);

  return { stickyRef, isSticky };
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

export default function StatsDrilldownPage() {
  const { category: slug } = useParams<{ category: string }>();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const cat = STAT_CATEGORIES[slug];
  const weeks = useMemo(() => getSetWeeks(), []);

  const [selectedTab, setSelectedTab] = useState<"set" | number>(() => {
    const tabParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tabParam === "set") return "set";
    if (tabParam !== null) {
      const n = parseInt(tabParam, 10);
      if (!isNaN(n)) return n;
    }
    const now = Date.now();
    const ws = getSetWeeks();
    let idx = 0;
    for (let i = 0; i < ws.length; i++) {
      if (ws[i].start <= now) idx = i;
    }
    return idx;
  });

  const tabBarRef = useRef<HTMLDivElement>(null);
  const { stickyRef, isSticky } = useFullBleedSticky();
  const { fadeLeft, fadeRight } = useScrollFade(tabBarRef);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedTab]);

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
        games: ms.length,
      };
    });

    const sorted = [...computed].sort((a, b) => b.value - a.value);
    const rawTotal = computed.reduce((s, r) => s + r.value, 0);

    return { rows: sorted, total: rawTotal };
  }, [players, win, cat]);

  if (!cat) return <LoadingText>Category not found.</LoadingText>;

  const Icon = cat.icon;
  const hasData = rows.some((r) => r.value > 0);
  const maxVal = rows.length > 0 ? Math.max(...rows.map((r) => r.value)) : 1;
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

      <StickyTabWrap ref={stickyRef} $isSticky={isSticky}>
        <MobileSelectWrap>
          <CustomSelect
            value={selectedTab === "set" ? "set" : String(selectedTab)}
            onChange={(v) => setSelectedTab(v === "set" ? "set" : parseInt(v, 10))}
            options={[
              { value: "set", label: SET_LABEL },
              ...weeks.map((w, i) => ({
                value: String(i),
                label: `${w.label} (${formatShortDate(w.start)}\u2009\u2013\u2009${formatShortDate(w.end)})`,
              })),
            ]}
          />
        </MobileSelectWrap>

        <TabBar ref={tabBarRef} $fadeLeft={fadeLeft} $fadeRight={fadeRight}>
          <Tab
            $active={selectedTab === "set"}
            data-active={selectedTab === "set" ? "true" : undefined}
            onClick={() => setSelectedTab("set")}
          >
            {SET_LABEL}
          </Tab>
          {weeks.map((w, i) => (
            <Tab
              key={i}
              $active={selectedTab === i}
              data-active={selectedTab === i ? "true" : undefined}
              onClick={() => setSelectedTab(i)}
            >
              {w.label}
            </Tab>
          ))}
        </TabBar>
      </StickyTabWrap>

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
                    >
                      {rows.filter((r) => r.value > 0).map((r) => (
                        <Cell key={r.puuid} fill={r.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      wrapperStyle={{ zIndex: 10 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0] as { name: string; value: number; fill: string };
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div style={{
                            background: "rgba(12, 20, 30, 0.6)",
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                            border: `1px solid ${theme.semantic.color.borderDefault}`,
                            borderRadius: theme.primitive.radius.lg,
                            boxShadow: theme.semantic.shadow.glassInset,
                            padding: `${theme.primitive.spacing.sm} ${theme.primitive.spacing.md}`,
                            fontFamily: "Space Grotesk",
                            fontSize: theme.semantic.typography.label.fontSize,
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.fill, flexShrink: 0, display: "inline-block" }} />
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
                <Icon size={ICON_SIZE.lg} color={theme.semantic.color.accent} />
                <GaugeValue>{aggregateLabel}</GaugeValue>
                <GaugeLabel>SQUAD AVG</GaugeLabel>
                <GaugeTrack>
                  <GaugeFill $pct={typeof aggregateLabel === "string" ? parseFloat(aggregateLabel) : 0} />
                  <GaugeRef title="50% reference" />
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
                </tr>
              </Thead>
              <Tbody>
                {rows.map((r, i) => {
                  const isLead = i === 0;
                  const barPct = cat.getBarPct(r.value, cat.isShare ? total : maxVal);
                  const Row = isLead ? LeaderRow : "tr";
                  return (
                    <Row key={r.puuid}>
                      <td>
                        <RankBadge>{i + 1}</RankBadge>
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
                            <ColorDot $color={r.color} />
                            <span>{r.gameName}<span style={{ color: theme.semantic.color.textDisabled, fontSize: "0.85em", fontWeight: 400 }}>#{r.tagLine}</span></span>
                          </span>
                        </SummonerCell>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div>{r.label}</div>
                        <BarTrack>
                          <BarFill $pct={barPct} />
                        </BarTrack>
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
