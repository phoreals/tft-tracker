"use client";

import { CustomSelect } from "@/components/CustomSelect";
import { DurationPill } from "@/components/DurationPill";
import type { TftSet } from "@/lib/utils";

interface SetTagProps {
  selectedSet: TftSet;
  sets: TftSet[];          // browsable sets, newest first
  activeSetNumber: number; // the live set (others are archived)
  onSetChange: (setNumber: number) => void;
}

/**
 * Low-emphasis set selector rendered inline in a page subtitle. Appears as a
 * tag (matching DurationPill), not a dropdown control — no chevron — because
 * switching sets is rare. When only one set is browsable there is nothing to
 * switch to, so it renders as a static pill.
 */
export function SetTag({ selectedSet, sets, activeSetNumber, onSetChange }: SetTagProps) {
  const isArchived = selectedSet.number !== activeSetNumber;

  if (sets.length <= 1) {
    return <DurationPill>{selectedSet.label}</DurationPill>;
  }

  const options = sets.map((s) => ({
    value: String(s.number),
    label: s.label,
    sublabel: s.number === activeSetNumber ? "Current" : "Archived",
  }));

  return (
    <CustomSelect
      variant="tag"
      // Archived sets read as de-emphasized (muted) and say so in the tag itself.
      tone={isArchived ? "muted" : "accent"}
      triggerSublabel={isArchived ? "Archived" : undefined}
      aria-label="Select set"
      value={String(selectedSet.number)}
      onChange={(v) => onSetChange(parseInt(v, 10))}
      options={options}
    />
  );
}
