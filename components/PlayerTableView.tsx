"use client";

import React, { useRef } from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";
import { SortChevron } from "./SortChevron";
import { getRankColor } from "@/lib/utils";
import { ResponsiveEmblem, RankText } from "@/components/RankDisplay";
import { PlaytimeDisplay } from "./PlaytimeDisplay";
import { useScrollFade } from "@/hooks/useTabNavigation";
import type { PlayerRowData, SortKey } from "@/hooks/usePlayerRows";

// ── Styled ───────────────────────────────────────────────────────

/* Outer: positions fade overlays above the scroll content but not the scrollbar. */
const TableFade = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  margin-left: -${({ theme }) => theme.primitive.spacing.md};
  margin-right: -${({ theme }) => theme.primitive.spacing.md};
  position: relative;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    margin-left: -${({ theme }) => theme.primitive.spacing.lg};
    margin-right: -${({ theme }) => theme.primitive.spacing.lg};
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 0;
    /* Stop above the scrollbar (3px track) */
    bottom: 3px;
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
`;

/* Inner: scrollable container with hidden scrollbar that appears on hover. */
const TableWrap = styled.div`
  overflow-x: auto;
  padding-left: ${({ theme }) => theme.primitive.spacing.md};
  padding-right: ${({ theme }) => theme.primitive.spacing.md};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    padding-left: ${({ theme }) => theme.primitive.spacing.lg};
    padding-right: ${({ theme }) => theme.primitive.spacing.lg};
  }

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: ${({ theme }) => theme.semantic.radius.pill};
  }
  &:hover::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.semantic.color.borderDefault};
  }

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  &:hover {
    scrollbar-color: ${({ theme }) => theme.semantic.color.borderDefault} transparent;
  }
`;

const Table = styled.table`
  width: 100%;
  text-align: left;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  border-collapse: collapse;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.md};
  }
`;

const Thead = styled.thead`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
  }
  th {
    padding: ${({ theme }) => theme.primitive.spacing.xs};
    font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
    font-size: ${({ theme }) => theme.primitive.fontSize.xs};
    color: ${({ theme }) => theme.semantic.color.textDisabled};

    @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
      padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
      font-size: ${({ theme }) => theme.primitive.fontSize.sm};
    }
  }
`;

// SortIcon must be defined before SortTh so SortTh can reference it as a selector.
const SortIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
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
    $active ? theme.semantic.color.accent : theme.semantic.color.textDisabled} !important;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary} !important;
  }

  /* Show the sort indicator on hover of the full cell, not just the label text. */
  &:hover ${SortIcon} {
    opacity: 0.5;
  }

  /* Keep active indicators fully visible on hover. */
  &:hover ${SortIcon}[data-active="true"] {
    opacity: 1;
  }

  &:active {
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

// Layout only — no hover logic here.
const SortThInner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid ${({ theme }) => theme.component.table.borderColor};
    transition: background 0.2s;
    &:hover {
      background: ${({ theme }) => theme.component.table.rowHoverBg};
    }
  }
  td {
    padding: ${({ theme }) => theme.primitive.spacing.xs};

    @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
      padding: 20px ${({ theme }) => theme.primitive.spacing.lg};
    }
  }
`;

const SummonerChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.xs};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  text-decoration: none;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  transition: background 0.2s;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    margin-left: -${({ theme }) => theme.primitive.spacing.xs};
  }

  &:hover {
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
  }

  @media (hover: none) {
    &:hover {
      background: none;
    }
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgActive};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const SummonerIcon = styled.div`
  width: ${ICON_SIZE.md}px;
  height: ${ICON_SIZE.md}px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  -webkit-backdrop-filter: blur(${({ theme }) => theme.semantic.blur.subtle});
  backdrop-filter: blur(${({ theme }) => theme.semantic.blur.subtle});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  overflow: hidden;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    width: ${ICON_SIZE.avatar}px;
    height: ${ICON_SIZE.avatar}px;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.base};
  }
`;

const SummonerTag = styled.span`
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  }
`;

const RightCell = styled.td`
  text-align: right;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const FirstCell = styled.td`
  text-align: right;
  color: ${({ theme }) => theme.semantic.color.info};
`;

const TimeCell = styled.td`
  text-align: right;
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  white-space: nowrap;
  display: none;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    display: table-cell;
  }
`;

const TimeSortTh = styled(SortTh)`
  display: none !important;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    display: table-cell !important;
  }
`;

const RankTextWrap = styled.span`
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  }
`;

const EmptyCell = styled.td`
  padding: ${({ theme }) => theme.primitive.spacing["2xl"]} ${({ theme }) => theme.primitive.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

// ── Component ────────────────────────────────────────────────────

interface PlayerTableViewProps {
  rows: PlayerRowData[];
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: SortKey) => void;
  isSet: boolean;
}

export function PlayerTableView({ rows, sortKey, sortDir, toggleSort, isSet }: PlayerTableViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { fadeLeft, fadeRight } = useScrollFade(wrapRef);

  const sortKeyDown = (key: SortKey) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSort(key); }
  };
  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  const renderSortLabel = (key: SortKey, label: string, iconLeft = false) => {
    const isActive = sortKey === key;
    // For inactive columns: show "desc" chevron on hover — previewing what the first click will do.
    // For active columns: show current direction.
    const direction = isActive ? sortDir : "desc";
    const icon = (
      <SortIcon $active={isActive} data-active={isActive ? "true" : undefined}>
        <SortChevron direction={direction} />
      </SortIcon>
    );
    return (
      <SortThInner>
        {iconLeft && icon}
        {label}
        {!iconLeft && icon}
      </SortThInner>
    );
  };

  return (
    <TableFade $fadeLeft={fadeLeft} $fadeRight={fadeRight}>
    <TableWrap ref={wrapRef}>
      <Table>
        <Thead>
          <tr>
            <SortTh $active={sortKey === "name"} aria-sort={ariaSort("name")} tabIndex={0} onClick={() => toggleSort("name")} onKeyDown={sortKeyDown("name")}>
              {renderSortLabel("name", "Summoner")}
            </SortTh>
            <SortTh $active={sortKey === "rankLP"} aria-sort={ariaSort("rankLP")} tabIndex={0} onClick={() => toggleSort("rankLP")} onKeyDown={sortKeyDown("rankLP")}>
              {renderSortLabel("rankLP", "Rank")}
            </SortTh>
            <SortTh $active={sortKey === "games"} aria-sort={ariaSort("games")} tabIndex={0} style={{ textAlign: "right" }} onClick={() => toggleSort("games")} onKeyDown={sortKeyDown("games")}>
              {renderSortLabel("games", "Games", true)}
            </SortTh>
            <SortTh $active={sortKey === "top4Rate"} aria-sort={ariaSort("top4Rate")} tabIndex={0} style={{ textAlign: "right" }} onClick={() => toggleSort("top4Rate")} onKeyDown={sortKeyDown("top4Rate")}>
              {renderSortLabel("top4Rate", "Top 4%", true)}
            </SortTh>
            <SortTh $active={sortKey === "firstRate"} aria-sort={ariaSort("firstRate")} tabIndex={0} style={{ textAlign: "right" }} onClick={() => toggleSort("firstRate")} onKeyDown={sortKeyDown("firstRate")}>
              {renderSortLabel("firstRate", "Win%", true)}
            </SortTh>
            <TimeSortTh $active={sortKey === "time"} aria-sort={ariaSort("time")} tabIndex={0} style={{ textAlign: "right" }} onClick={() => toggleSort("time")} onKeyDown={sortKeyDown("time")}>
              {renderSortLabel("time", "Playtime", true)}
            </TimeSortTh>
          </tr>
        </Thead>
        <Tbody>
          {rows.length === 0 ? (
            <tr>
              <EmptyCell colSpan={6}>No players tracked yet. Add players to get started.</EmptyCell>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.puuid}>
                <td>
                  <SummonerChip href={`/player/${row.puuid}`}>
                    <SummonerIcon>
                      {row.profileIconId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${row.profileIconId}.jpg`}
                          alt=""
                          width={32}
                          height={32}
                          style={{ display: "block", width: "100%", height: "100%" }}
                        />
                      ) : (
                        <User size={ICON_SIZE.md} />
                      )}
                    </SummonerIcon>
                    <SummonerName>{row.gameName}<SummonerTag>#{row.tagLine}</SummonerTag></SummonerName>
                  </SummonerChip>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    {row.tier && (
                      <ResponsiveEmblem tier={row.tier} color={getRankColor(row.tier)} />
                    )}
                    <RankTextWrap style={{ color: getRankColor(row.tier) }}>
                      <RankText full={row.rank} abbr={row.rankAbbr} />
                    </RankTextWrap>
                  </div>
                </td>
                <RightCell>{isSet ? row.totalGames : row.scopedGames}</RightCell>
                <RightCell>{row.top4Rate}%</RightCell>
                <FirstCell>{row.firstRate}%</FirstCell>
                <TimeCell><PlaytimeDisplay seconds={isSet ? row.totalDurationSec : row.scopedDurationSec} variant="hours" /></TimeCell>
              </tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableWrap>
    </TableFade>
  );
}
