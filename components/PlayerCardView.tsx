"use client";

import React from "react";
import styled from "styled-components";
import Link from "next/link";
import { User } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";
import { getRankColor } from "@/lib/utils";
import { SortChevron } from "./SortChevron";
import { PlaytimeDisplay } from "./PlaytimeDisplay";
import type { PlayerRowData, SortKey } from "@/hooks/usePlayerRows";

// ── Styled ───────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.md};
  }
`;

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  padding: ${({ theme }) => theme.primitive.spacing.xs};
  background: ${({ theme }) => theme.semantic.color.borderDim};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    padding: ${({ theme }) => theme.primitive.spacing.md};
  }
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
    background: ${({ theme }) => theme.component.table.rowHoverBg};
    box-shadow: ${({ theme }) => theme.semantic.shadow.glowGold};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.component.glassCard.bg};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const PlayerInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const PlayerName = styled.div`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlayerTag = styled.span`
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
`;

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.semantic.color.borderDefault};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const StatValue = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const StatLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: 8px;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  white-space: nowrap;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  padding: ${({ theme }) => theme.primitive.spacing["2xl"]};
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

const SortBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
`;

const SortPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  background: ${({ $active, theme }) => $active ? theme.semantic.color.accentBgHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  letter-spacing: 0.04em;
  cursor: pointer;
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
`;

// ── RankEmblem ───────────────────────────────────────────────────

function RankEmblem({ tier, color }: { tier: string; color: string }) {
  const [failed, setFailed] = React.useState(false);
  const size = ICON_SIZE.sm;
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

interface PlayerCardViewProps {
  rows: PlayerRowData[];
  isSet: boolean;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: SortKey) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rankLP",    label: "Rank"    },
  { key: "games",     label: "Games"   },
  { key: "top4Rate",  label: "Top 4%"  },
  { key: "firstRate", label: "Win%"    },
  { key: "time",      label: "Playtime" },
];

export function PlayerCardView({ rows, isSet, sortKey, sortDir, toggleSort }: PlayerCardViewProps) {
  return (
    <>
      <SortBar role="group" aria-label="Sort players">
        {SORT_OPTIONS.map(({ key, label }) => {
          const isActive = sortKey === key;
          const dir = isActive ? sortDir : "desc";
          return (
            <SortPill
              key={key}
              type="button"
              $active={isActive}
              aria-pressed={isActive}
              aria-label={`Sort by ${label} ${dir === "desc" ? "descending" : "ascending"}`}
              onClick={() => toggleSort(key)}
            >
              {label}
              <SortChevron direction={dir} />
            </SortPill>
          );
        })}
      </SortBar>
      <Grid>
      {rows.length === 0 ? (
        <EmptyState>No players tracked yet. Add players to get started.</EmptyState>
      ) : (
        rows.map((row) => (
          <Card key={row.puuid} href={`/player/${row.puuid}`}>
            <PlayerHeader>
              <Avatar>
                {row.profileIconId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${row.profileIconId}.jpg`}
                    alt=""
                    width={40}
                    height={40}
                    style={{ display: "block" }}
                  />
                ) : (
                  <User size={ICON_SIZE.md} />
                )}
              </Avatar>
              <PlayerInfo>
                <PlayerName>
                  {row.gameName}
                  <PlayerTag>#{row.tagLine}</PlayerTag>
                </PlayerName>
                <RankRow>
                  {row.tier && (
                    <RankEmblem tier={row.tier} color={getRankColor(row.tier)} />
                  )}
                  <span style={{ color: getRankColor(row.tier), fontSize: 11 }}>
                    {row.rankAbbr}
                  </span>
                </RankRow>
              </PlayerInfo>
            </PlayerHeader>

            <Divider />

            <StatsGrid>
              <Stat>
                <StatValue>{isSet ? row.totalGames : row.scopedGames}</StatValue>
                <StatLabel>GAMES</StatLabel>
              </Stat>
              <Stat>
                <StatValue>{row.top4Rate}%</StatValue>
                <StatLabel>TOP 4</StatLabel>
              </Stat>
              <Stat>
                <StatValue>{row.firstRate}%</StatValue>
                <StatLabel>1ST</StatLabel>
              </Stat>
              <Stat>
                <StatValue style={{ fontSize: 11 }}>
                  <PlaytimeDisplay seconds={isSet ? row.totalDurationSec : row.scopedDurationSec} variant="hours" />
                </StatValue>
                <StatLabel>TIME</StatLabel>
              </Stat>
            </StatsGrid>
          </Card>
        ))
      )}
    </Grid>
    </>
  );
}
