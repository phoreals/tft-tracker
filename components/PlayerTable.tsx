"use client";

import React, { useState } from "react";
import { LayoutList, LayoutGrid } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ViewToggle } from "./ViewToggle";
import { PlayerTableView } from "./PlayerTableView";
import { PlayerCardView } from "./PlayerCardView";
import { usePlayerRows } from "@/hooks/usePlayerRows";
import type { PlayerRowInput } from "@/hooks/usePlayerRows";

// ── Types ────────────────────────────────────────────────────────

type ViewMode = "table" | "card";

const VIEW_OPTIONS = [
  { id: "table" as ViewMode, icon: LayoutList, label: "Table view" },
  { id: "card"  as ViewMode, icon: LayoutGrid, label: "Card view"  },
];

interface PlayerTableProps {
  players: PlayerRowInput[];
  selectedTab: "set" | number;
  weeks: { label: string; start: number; end: number; weekNumber: number }[];
  periodTag?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────

export function PlayerTable({ players, selectedTab, weeks, periodTag }: PlayerTableProps) {
  const [view, setView] = useState<ViewMode>("table");
  const { sortedRows, sortKey, sortDir, toggleSort, isSet } = usePlayerRows(
    players,
    selectedTab,
    weeks,
  );

  const toggle = (
    <ViewToggle views={VIEW_OPTIONS} value={view} onChange={setView} />
  );

  return (
    <GlassCard title="Player Performance" titleExtra={periodTag} headerAction={toggle} prominent>
      {view === "table" ? (
        <PlayerTableView
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          isSet={isSet}
        />
      ) : (
        <PlayerCardView
          rows={sortedRows}
          isSet={isSet}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      )}
    </GlassCard>
  );
}
