"use client";

import React from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";
import { SortChevron } from "./SortChevron";
import { getRankColor } from "@/lib/utils";
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
    background: ${({ theme }) => theme.component.table.headerBg};
  }
  th {
    padding: ${({ theme }) => theme.primitive.spacing.xs};
    font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
    font-size: 8px;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.semantic.color.textDisabled};

    @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
      padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
      font-size: ${({ theme }) => theme.primitive.fontSize.xs};
    }
  }
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
`;

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

const SortThInner = styled.span`
  display: inline-flex;
  align-items: center;

  &:hover ${SortIcon} {
    opacity: 0.4;
  }

  &:hover ${SortIcon}[data-active="true"] {
    opacity: 1;
  }
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
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const SummonerName = styled(Link)`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: color 0.2s;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.md};
  }

  &:hover {
    color: ${({ theme }) => theme.semantic.color.accent};
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
    const direction = isActive ? sortDir : "none";
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
              {renderSortLabel("games", isSet ? "Total Games" : "Games This Week")}
            </SortTh>
            <SortTh $active={sortKey === "top4Rate"} style={{ textAlign: "center" }} onClick={() => toggleSort("top4Rate")}>
              {renderSortLabel("top4Rate", "Top 4%")}
            </SortTh>
            <SortTh $active={sortKey === "firstRate"} style={{ textAlign: "center" }} onClick={() => toggleSort("firstRate")}>
              {renderSortLabel("firstRate", "1st%")}
            </SortTh>
            <SortTh $active={sortKey === "time"} style={{ textAlign: "right" }} onClick={() => toggleSort("time")}>
              {renderSortLabel("time", "Time Played")}
            </SortTh>
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
                  <SummonerCell>
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
                    <SummonerName href={`/player/${row.puuid}`}>{row.name}</SummonerName>
                  </SummonerCell>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    {row.tier && (
                      <RankEmblem tier={row.tier} size={ICON_SIZE.md} color={getRankColor(row.tier)} />
                    )}
                    <span style={{ fontSize: 12, color: getRankColor(row.tier) }}>
                      <RankFull>{row.rank}</RankFull>
                      <RankAbbr>{row.rankAbbr}</RankAbbr>
                    </span>
                  </div>
                </td>
                <CenterCell>{isSet ? row.totalGames : row.scopedGames}</CenterCell>
                <CenterCell>{row.top4Rate}%</CenterCell>
                <FirstCell>{row.firstRate}%</FirstCell>
                <TimeCell>{isSet ? row.totalTime : row.scopedTime}</TimeCell>
              </tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
