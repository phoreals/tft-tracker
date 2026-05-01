"use client";

import React from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";
import { SortChevron } from "./SortChevron";
import { getRankColor } from "@/lib/utils";
import { PlaytimeDisplay } from "./PlaytimeDisplay";
import type { PlayerRowData, SortKey } from "@/hooks/usePlayerRows";

// ── Styled ───────────────────────────────────────────────────────

const TableWrap = styled.div`
  overflow-x: auto;
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
`;

const Table = styled.table`
  width: 100%;
  text-align: left;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  letter-spacing: 0.02em;
  border-collapse: collapse;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
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
    font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.semantic.color.textDisabled};

    @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
      padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
      font-size: 12px;
    }
  }
`;

// SortIcon must be defined before SortTh so SortTh can reference it as a selector.
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
`;

// Layout only — no hover logic here.
const SortThInner = styled.span`
  display: inline-flex;
  align-items: center;
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

    @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
      padding: 20px ${({ theme }) => theme.primitive.spacing.lg};
    }
  }
`;

const SummonerChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.xs};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  text-decoration: none;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  transition: background 0.2s;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
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
`;

const SummonerIcon = styled.div`
  width: ${ICON_SIZE.avatar}px;
  height: ${ICON_SIZE.avatar}px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  letter-spacing: 0.05em;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.md};
  }
`;

const RankFull = styled.span`
  display: none;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: inline;
  }
`;

const RankAbbr = styled.span`
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const CenterCell = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const FirstCell = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.info};
`;

const TimeCell = styled.td`
  text-align: right;
  font-size: 12px;
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  white-space: nowrap;
  display: none;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: table-cell;
  }
`;

const TimeSortTh = styled(SortTh)`
  display: none !important;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: table-cell !important;
  }
`;

const RankEmblemMobile = styled.span`
  display: inline-flex;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const RankEmblemDesktop = styled.span`
  display: none;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: inline-flex;
  }
`;

const RankText = styled.span`
  font-size: 10px;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: 12px;
  }
`;

const EmptyCell = styled.td`
  padding: ${({ theme }) => theme.primitive.spacing["2xl"]} ${({ theme }) => theme.primitive.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

// ── RankEmblem ───────────────────────────────────────────────────

function RankEmblem({ tier, size, color }: { tier: string; size: number; color: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 2,
          background: color,
          opacity: 0.85,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}_tft.svg`}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Component ────────────────────────────────────────────────────

interface PlayerTableViewProps {
  rows: PlayerRowData[];
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: SortKey) => void;
  isSet: boolean;
}

export function PlayerTableView({ rows, sortKey, sortDir, toggleSort, isSet }: PlayerTableViewProps) {
  const renderSortLabel = (key: SortKey, label: string) => {
    const isActive = sortKey === key;
    // For inactive columns: show "desc" chevron on hover — previewing what the first click will do.
    // For active columns: show current direction.
    const direction = isActive ? sortDir : "desc";
    return (
      <SortThInner>
        {label}
        <SortIcon $active={isActive} data-active={isActive ? "true" : undefined}>
          <SortChevron direction={direction} />
        </SortIcon>
      </SortThInner>
    );
  };

  return (
    <TableWrap>
      <Table>
        <Thead>
          <tr>
            <SortTh $active={sortKey === "name"} onClick={() => toggleSort("name")}>
              {renderSortLabel("name", "Summoner")}
            </SortTh>
            <SortTh $active={sortKey === "rankLP"} onClick={() => toggleSort("rankLP")}>
              {renderSortLabel("rankLP", "Rank")}
            </SortTh>
            <SortTh $active={sortKey === "games"} style={{ textAlign: "center" }} onClick={() => toggleSort("games")}>
              {renderSortLabel("games", "Games")}
            </SortTh>
            <SortTh $active={sortKey === "top4Rate"} style={{ textAlign: "center" }} onClick={() => toggleSort("top4Rate")}>
              {renderSortLabel("top4Rate", "Top 4%")}
            </SortTh>
            <SortTh $active={sortKey === "firstRate"} style={{ textAlign: "center" }} onClick={() => toggleSort("firstRate")}>
              {renderSortLabel("firstRate", "Win%")}
            </SortTh>
            <TimeSortTh $active={sortKey === "time"} style={{ textAlign: "right" }} onClick={() => toggleSort("time")}>
              {renderSortLabel("time", "Playtime")}
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
                          style={{ display: "block" }}
                        />
                      ) : (
                        <User size={ICON_SIZE.md} />
                      )}
                    </SummonerIcon>
                    <SummonerName>{row.name}</SummonerName>
                  </SummonerChip>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    {row.tier && (
                      <>
                        <RankEmblemMobile>
                          <RankEmblem tier={row.tier} size={12} color={getRankColor(row.tier)} />
                        </RankEmblemMobile>
                        <RankEmblemDesktop>
                          <RankEmblem tier={row.tier} size={14} color={getRankColor(row.tier)} />
                        </RankEmblemDesktop>
                      </>
                    )}
                    <RankText style={{ color: getRankColor(row.tier) }}>
                      <RankFull>{row.rank}</RankFull>
                      <RankAbbr>{row.rankAbbr}</RankAbbr>
                    </RankText>
                  </div>
                </td>
                <CenterCell>{isSet ? row.totalGames : row.scopedGames}</CenterCell>
                <CenterCell>{row.top4Rate}%</CenterCell>
                <FirstCell>{row.firstRate}%</FirstCell>
                <TimeCell><PlaytimeDisplay seconds={isSet ? row.totalDurationSec : row.scopedDurationSec} variant="hours" /></TimeCell>
              </tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
