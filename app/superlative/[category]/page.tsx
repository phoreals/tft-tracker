"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, User } from "lucide-react";
import { SortChevron } from "@/components/SortChevron";
import { TabNavigation } from "@/components/TabNavigation";
import { GlassCard } from "@/components/GlassCard";
import { DurationPill } from "@/components/DurationPill";
import {
  getSetWeeks,
  SET_START,
  SET_END,
  SET_LABEL,
  computePlayerStats,
  SUPERLATIVE_CATEGORIES,
  findLeader,
  getLeaderboardColor,
  type PlayerStatInput,
} from "@/lib/utils";
import { useSelectedTab } from "@/hooks/useSelectedTab";
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
  min-height: 44px;
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
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
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
  gap: 3px;
  white-space: nowrap;
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

const RankBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ $color }) => $color};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ $color }) => $color};
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
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  width: 100%;
  background: ${({ theme }) => theme.component.table.borderColor};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
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

const CategoryNav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  flex-wrap: nowrap;

  &::-webkit-scrollbar {
    height: 0;
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
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
  border-radius: ${({ theme }) => theme.primitive.radius.md};
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

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
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
  const [selectedTab, setSelectedTab] = useSelectedTab();

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

      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} weeks={weeks} />

      <CategoryNav aria-label="Superlative categories">
        {SUPERLATIVE_CATEGORIES.map((c) => (
          <CategoryPill
            key={c.slug}
            href={`/superlative/${c.slug}?tab=${selectedTab}`}
            $active={c.slug === slug}
          >
            {c.title}
          </CategoryPill>
        ))}
      </CategoryNav>

      {loading ? (
        <LoadingText>Loading...</LoadingText>
      ) : ranked.length === 0 ? (
        <LoadingText>No data for this time period.</LoadingText>
      ) : (
        <>
          <GlassCard title="Rankings" titleExtra={<DurationPill>{period}</DurationPill>} prominent>
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
                      <SortIcon $active={sortCol === "value"} data-active={sortCol === "value" || undefined}>
                        <SortChevron direction={sortCol === "value" ? sortDir : "desc"} />
                      </SortIcon>
                      {cat.title}
                    </SortThInner>
                  </SortTh>
                </tr>
              </Thead>
              <Tbody>
                {sortedRanked.map((r, i) => {
                  const val = (r[cat.key] as number) ?? 0;
                  const naturalRank = ranked.indexOf(r) + 1;
                  const isLead = naturalRank === 1;
                  const Row = isLead ? LeaderRow : "tr";
                  return (
                    <Row key={r.player.puuid}>
                      <td>
                        <RankBadge $color={getLeaderboardColor(naturalRank, ranked.length)}>{i + 1}</RankBadge>
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
