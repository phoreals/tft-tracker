"use client";

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ViewToggle } from "./ViewToggle";
import { PlayerTableView } from "./PlayerTableView";
import { PlayerCardView } from "./PlayerCardView";
import { usePlayerRows } from "@/hooks/usePlayerRows";
import { SET_START, SET_END } from "@/lib/utils";
import type { PlayerRowInput } from "@/hooks/usePlayerRows";

// ── Styled ──────────────────────────────────────────────────────

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap-reverse;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  justify-content: flex-end;
  flex-basis: 100%;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    flex-basis: auto;
  }
`;

const DayStepper = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  background: ${({ theme }) => theme.semantic.color.borderDim};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  padding: 2px;
`;

const StepBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: calc(${({ theme }) => theme.semantic.radius.element} - 2px);
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.semantic.color.textMuted};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const StepLabel = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  min-width: 52px;
  text-align: center;
  white-space: nowrap;
  user-select: none;
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
  const [dayOffset, setDayOffset] = useState<number | null>(null);

  const isSet = selectedTab === "set";
  const win = useMemo(() =>
    isSet
      ? { start: SET_START, end: SET_END }
      : (weeks[selectedTab as number] ?? weeks[weeks.length - 1]),
    [isSet, selectedTab, weeks],
  );

  const periodDays = Math.ceil((Math.min(win.end, Date.now()) - win.start) / DAY_MS);
  const endOverride = dayOffset !== null
    ? Math.min(win.start + (dayOffset + 1) * DAY_MS, win.end)
    : undefined;

  useEffect(() => { setDayOffset(null); }, [selectedTab]);

  const { sortedRows, sortKey, sortDir, toggleSort, isSet: hookIsSet } = usePlayerRows(
    players,
    selectedTab,
    weeks,
    endOverride,
  );

  const effectiveIsSet = dayOffset !== null ? false : hookIsSet;

  const stepLeft = () =>
    setDayOffset((d) => Math.max((d ?? periodDays - 1) - 1, 0));

  const stepRight = () =>
    setDayOffset((d) => {
      if (d === null) return null;
      return d >= periodDays - 1 ? null : d + 1;
    });

  const headerAction = (
    <HeaderActions>
      <DayStepper>
        <StepBtn
          disabled={dayOffset === 0}
          onClick={stepLeft}
          aria-label="Previous day"
        >
          <ChevronLeft size={14} />
        </StepBtn>
        <StepLabel>
          {dayOffset !== null
            ? fmtDate(win.start + dayOffset * DAY_MS)
            : "All"}
        </StepLabel>
        <StepBtn
          disabled={dayOffset === null}
          onClick={stepRight}
          aria-label="Next day"
        >
          <ChevronRight size={14} />
        </StepBtn>
      </DayStepper>
      <ViewToggle views={VIEW_OPTIONS} value={view} onChange={setView} />
    </HeaderActions>
  );

  return (
    <GlassCard title="Player Performance" titleExtra={periodTag} headerAction={headerAction} prominent>
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
