"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
// recharts removed — bar chart not currently used
import { ArrowLeft, User } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import {
  getSetWeeks,
  SET_START,
  SET_END,
  SET_LABEL,
  computePlayerStats,
  SUPERLATIVE_CATEGORIES,
  findLeader,
  type PlayerStatInput,
} from "@/lib/utils";
import { theme, ICON_SIZE } from "@/styles/theme";

// ── Constants ────────────────────────────────────────────────────

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
  transition: color 0.2s;

  &:hover { color: ${({ theme }) => theme.semantic.color.accent}; }
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
  transition: backdrop-filter 0.2s, box-shadow 0.2s, border-color 0.2s;
  backdrop-filter: ${({ $isSticky }) => $isSticky ? "blur(16px)" : "none"};
  border-bottom: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  box-shadow: ${({ $isSticky }) => $isSticky ? "0 4px 16px rgba(229, 197, 135, 0.06)" : "none"};
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

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.md};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ $active, theme }) => $active ? theme.semantic.color.borderHover : "transparent"};
  background: ${({ $active, theme }) => $active ? theme.semantic.color.accentHover : "transparent"};
  color: ${({ $active, theme }) => $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active, theme }) => $active ? theme.semantic.color.accentHover : theme.semantic.color.borderDim};
  }
`;


const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${({ theme }) => theme.primitive.spacing.md};
`;

const Thead = styled.thead`
  th {
    ${({ theme }) => theme.semantic.typography.label};
    font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
    color: ${({ theme }) => theme.semantic.color.textMuted};
    text-align: left;
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
  }
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
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
    font-family: ${({ theme }) => theme.semantic.font.display};
    font-size: ${({ theme }) => theme.primitive.fontSize.sm};
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }
`;

const RankBadge = styled.span<{ $isLead?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  background: ${({ $isLead }) => $isLead ? "rgba(229, 197, 135, 0.12)" : "rgba(208, 197, 181, 0.06)"};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ $isLead, theme }) => $isLead ? theme.semantic.color.accent : theme.semantic.color.textMuted};
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

const SummonerLink = styled(Link)`
  text-decoration: none;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  transition: color 0.15s;

  &:hover { color: ${({ theme }) => theme.semantic.color.accent}; }
`;

const BarFill = styled.div<{ $pct: number }>`
  height: 4px;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.semantic.color.accent};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  margin-top: 4px;
`;

const LeaderRow = styled.tr`
  background: rgba(229, 197, 135, 0.06) !important;
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

export default function SuperlativeDrilldownPage() {
  const { category: slug } = useParams<{ category: string }>();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const cat = SUPERLATIVE_CATEGORIES.find((c) => c.slug === slug);

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

  const stats = useMemo(() => {
    if (players.length === 0) return [];
    return computePlayerStats(players, win);
  }, [players, win]);

  const ranked = useMemo(() => {
    if (!cat) return [];
    return [...stats]
      .filter(cat.filter)
      .sort((a, b) => {
        const av = a[cat.key] as number | null;
        const bv = b[cat.key] as number | null;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });
  }, [stats, cat]);

  const leader = cat ? findLeader(stats, cat) : null;
  const maxVal = ranked.length > 0 ? Math.max(...ranked.map((r) => Math.abs((r[cat!.key] as number) ?? 0))) : 1;

  if (!cat) return <LoadingText>Category not found.</LoadingText>;

  return (
    <Page>
      <BackLink href={`/?tab=${selectedTab}`}>
        <ArrowLeft size={ICON_SIZE.sm} />
        BACK TO HOME
      </BackLink>

      <div>
        <PageTitle>{cat.title}</PageTitle>
        <PageSubtitle>
          {isSet
            ? `Leaderboard · ${SET_LABEL} · ${formatShortDate(SET_START)}\u2009\u2013\u2009${formatShortDate(SET_END)}`
            : (() => {
                const w = weeks[selectedTab as number];
                return w ? `Leaderboard · ${w.label} · ${formatShortDate(w.start)}\u2009\u2013\u2009${formatShortDate(w.end)}` : "Leaderboard";
              })()}
        </PageSubtitle>
      </div>

      <StickyTabWrap ref={stickyRef} $isSticky={isSticky}>
        <TabSelect
          value={selectedTab === "set" ? "set" : String(selectedTab)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedTab(v === "set" ? "set" : parseInt(v, 10));
          }}
        >
          <option value="set">{SET_LABEL}</option>
          {weeks.map((w, i) => (
            <option key={i} value={String(i)}>
              {`${w.label} (${formatShortDate(w.start)}\u2009\u2013\u2009${formatShortDate(w.end)})`}
            </option>
          ))}
        </TabSelect>

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
      ) : ranked.length === 0 ? (
        <LoadingText>No data for this time period.</LoadingText>
      ) : (
        <>
          <GlassCard title="Rankings" prominent>
            <Table>
              <Thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Summoner</th>
                  <th style={{ textAlign: "right" }}>{cat.label(isSet, weeks[selectedTab as number]?.weekNumber)}</th>
                </tr>
              </Thead>
              <Tbody>
                {ranked.map((r, i) => {
                  const val = (r[cat.key] as number) ?? 0;
                  const isLead = leader?.player.puuid === r.player.puuid;
                  const Row = isLead ? LeaderRow : "tr";
                  return (
                    <Row key={r.player.puuid}>
                      <td>
                        <RankBadge $isLead={isLead}>{i + 1}</RankBadge>
                      </td>
                      <td>
                        <SummonerCell>
                          <SummonerIcon>
                            {r.player.profileIconId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${r.player.profileIconId}.jpg`}
                                alt=""
                                width={32}
                                height={32}
                                style={{ display: "block" }}
                              />
                            ) : (
                              <User size={ICON_SIZE.md} />
                            )}
                          </SummonerIcon>
                          <SummonerLink href={`/player/${r.player.puuid}`}>
                            {r.player.gameName}#{r.player.tagLine}
                          </SummonerLink>
                        </SummonerCell>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div>{cat.format(val)}</div>
                        <BarFill $pct={maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0} />
                      </td>
                    </Row>
                  );
                })}
              </Tbody>
            </Table>
          </GlassCard>
        </>
      )}
    </Page>
  );
}
