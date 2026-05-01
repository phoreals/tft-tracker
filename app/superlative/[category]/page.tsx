"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
// recharts removed — bar chart not currently used
import { ArrowLeft, User } from "lucide-react";
import { SortChevron } from "@/components/SortChevron";
import { CustomSelect } from "@/components/CustomSelect";
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
  box-shadow: ${({ $isSticky, theme }) => $isSticky ? `0 4px 16px ${theme.semantic.color.accentBgSubtle}` : "none"};
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

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }
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
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.sm};
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
  }
  th:first-child {
    padding-left: ${({ theme }) => theme.primitive.spacing.xs};
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
`;

// SortIcon must be defined before SortTh for selector interpolation.
const SortIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  margin-left: 3px;
  flex-shrink: 0;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : "currentColor"};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
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
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.sm};
    font-family: ${({ theme }) => theme.semantic.font.display};
    font-size: ${({ theme }) => theme.primitive.fontSize.sm};
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }
  td:first-child {
    padding-left: ${({ theme }) => theme.primitive.spacing.xs};
    padding-right: ${({ theme }) => theme.primitive.spacing.xs};
  }
`;

const RankBadge = styled.span<{ $isLead?: boolean }>`
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

  &:active { opacity: 0.7; }
`;

const TagSpan = styled.span`
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
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

// Centered bar for categories where values can be negative (LP gain, LP/game)
const BiBarTrack = styled.div`
  position: relative;
  height: 4px;
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  margin-top: 4px;
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
  const [sortCol, setSortCol] = useState<"name" | "value">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
    // sort by name
    return [...ranked].sort((a, b) => {
      const an = a.player.gameName.toLowerCase();
      const bn = b.player.gameName.toLowerCase();
      return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }, [ranked, sortCol, sortDir]);

  const leader = cat ? findLeader(stats, cat) : null;
  const maxVal = ranked.length > 0 ? Math.max(...ranked.map((r) => Math.abs((r[cat!.key] as number) ?? 0))) : 1;
  const hasNegative = ranked.some((r) => ((r[cat!.key] as number) ?? 0) < 0);

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
      ) : ranked.length === 0 ? (
        <LoadingText>No data for this time period.</LoadingText>
      ) : (
        <>
          <GlassCard title="Rankings" prominent>
            <Table>
              <Thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <SortTh $active={sortCol === "name"} onClick={() => toggleSort("name")}>
                    <SortThInner>
                      Summoner
                      <SortIcon $active={sortCol === "name"} data-active={sortCol === "name" || undefined}>
                        <SortChevron direction={sortCol === "name" ? sortDir : "desc"} />
                      </SortIcon>
                    </SortThInner>
                  </SortTh>
                  <SortTh $active={sortCol === "value"} onClick={() => toggleSort("value")} style={{ textAlign: "right" }}>
                    <SortThInner style={{ justifyContent: "flex-end" }}>
                      {cat.label(isSet, weeks[selectedTab as number]?.weekNumber)}
                      <SortIcon $active={sortCol === "value"} data-active={sortCol === "value" || undefined}>
                        <SortChevron direction={sortCol === "value" ? sortDir : "desc"} />
                      </SortIcon>
                    </SortThInner>
                  </SortTh>
                </tr>
              </Thead>
              <Tbody>
                {sortedRanked.map((r, i) => {
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
                            {r.player.gameName}<TagSpan>#{r.player.tagLine}</TagSpan>
                          </SummonerLink>
                        </SummonerCell>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div>{cat.format(val)}</div>
                        {hasNegative ? (
                          <BiBarTrack>
                            <BiBarCenter />
                            <BiBarFill
                              $pct={maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0}
                              $positive={val >= 0}
                            />
                          </BiBarTrack>
                        ) : (
                          <BarTrack><BarFill $pct={maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0} /></BarTrack>
                        )}
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
