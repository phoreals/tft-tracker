"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { LayoutList, LayoutGrid } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ViewToggle } from "./ViewToggle";
import { PlayerTableView } from "./PlayerTableView";
import { PlayerCardView } from "./PlayerCardView";
import { usePlayerRows } from "@/hooks/usePlayerRows";
import { useScrollFade } from "@/hooks/useTabNavigation";
import { SET_START, SET_END } from "@/lib/utils";
import type { PlayerRowInput } from "@/hooks/usePlayerRows";

// ── Styled ──────────────────────────────────────────────────────

const DayStrip = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  mask-image: ${({ $fadeLeft, $fadeRight }) => {
    if ($fadeLeft && $fadeRight)
      return "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)";
    if ($fadeLeft)  return "linear-gradient(to right, transparent, black 32px)";
    if ($fadeRight) return "linear-gradient(to right, black calc(100% - 32px), transparent)";
    return "none";
  }};
  -webkit-mask-image: ${({ $fadeLeft, $fadeRight }) => {
    if ($fadeLeft && $fadeRight)
      return "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)";
    if ($fadeLeft)  return "linear-gradient(to right, transparent, black 32px)";
    if ($fadeRight) return "linear-gradient(to right, black calc(100% - 32px), transparent)";
    return "none";
  }};
`;

const DayPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accentBgHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s, background 0.15s;

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
    background: ${({ theme }) => theme.semantic.color.accentBgActive};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

// ── Types ────────────────────────────────────────────────────────

type ViewMode = "table" | "card";

const VIEW_OPTIONS = [
  { id: "table" as ViewMode, icon: LayoutList, label: "Table view" },
  { id: "card"  as ViewMode, icon: LayoutGrid, label: "Card view"  },
];

const DAY_MS = 86_400_000;

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface PlayerTableProps {
  players: PlayerRowInput[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number; weekNumber: number }[];
  periodTag?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────

export function PlayerTable({ players, selectedTab, weeks, periodTag }: PlayerTableProps) {
  const [view, setView] = useState<ViewMode>("table");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const { fadeLeft, fadeRight } = useScrollFade(stripRef);

  const isSet = selectedTab === "set";
  const win = useMemo(() =>
    isSet
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]),
    [isSet, selectedTab, weeks],
  );

  const periodDays = Math.ceil((Math.min(win.end, Date.now()) - win.start) / DAY_MS);

  const startOverride = selectedDay !== null
    ? win.start + selectedDay * DAY_MS
    : undefined;
  const endOverride = selectedDay !== null
    ? Math.min(win.start + (selectedDay + 1) * DAY_MS, win.end)
    : undefined;

  useEffect(() => { setSelectedDay(null); }, [selectedTab]);

  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>("[data-active='true']");
    if (!strip || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left - 8;
    else if (right > strip.scrollLeft + strip.offsetWidth) strip.scrollLeft = right - strip.offsetWidth + 8;
  }, [selectedDay]);

  const { sortedRows, sortKey, sortDir, toggleSort, isSet: hookIsSet } = usePlayerRows(
    players,
    selectedTab,
    weeks,
    startOverride,
    endOverride,
  );

  const effectiveIsSet = selectedDay !== null ? false : hookIsSet;

  const days = useMemo(
    () => Array.from({ length: periodDays }, (_, i) => i),
    [periodDays],
  );

  return (
    <GlassCard
      title="Player Performance"
      titleExtra={periodTag}
      headerAction={<ViewToggle views={VIEW_OPTIONS} value={view} onChange={setView} />}
      prominent
    >
      {!isSet && days.length > 1 && (
        <DayStrip ref={stripRef} $fadeLeft={fadeLeft} $fadeRight={fadeRight} role="group" aria-label="Filter by day">
          <DayPill
            type="button"
            $active={selectedDay === null}
            data-active={selectedDay === null ? "true" : undefined}
            onClick={() => setSelectedDay(null)}
          >
            {isSet ? "This Set" : "This Week"}
          </DayPill>
          {days.map((i) => (
            <DayPill
              key={i}
              type="button"
              $active={selectedDay === i}
              data-active={selectedDay === i ? "true" : undefined}
              onClick={() => setSelectedDay(i)}
            >
              {fmtDate(win.start + i * DAY_MS)}
            </DayPill>
          ))}
        </DayStrip>
      )}

      {view === "table" ? (
        <PlayerTableView
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          isSet={effectiveIsSet}
        />
      ) : (
        <PlayerCardView
          rows={sortedRows}
          isSet={effectiveIsSet}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      )}
    </GlassCard>
  );
}
