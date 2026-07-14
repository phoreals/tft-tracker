"use client";

import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { CustomSelect } from "@/components/CustomSelect";
import type { TftSet } from "@/lib/utils";
import { useFullBleedSticky, useScrollFade } from "@/hooks/useTabNavigation";

// ── Types ───────────────────────────────────────────────────────

export type SetWeek = {
  label: string;
  start: number;
  end: number;
  weekNumber: number;
};

interface TabNavigationProps {
  selectedTab: "set" | number;
  onTabChange: (tab: "set" | number) => void;
  weeks: SetWeek[];
  selectedSet: TftSet;
  sets: TftSet[];          // browsable sets, newest first
  activeSetNumber: number; // the live set (others are archived)
  onSetChange: (setNumber: number) => void;
}

// ── Helpers ─────────────────────────────────────────────────────

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Styled ──────────────────────────────────────────────────────

const StickyTabWrap = styled.div<{ $isSticky: boolean }>`
  position: sticky;
  top: 0;
  z-index: 20;
  transition: box-shadow 0.2s, border-color 0.2s;
  ${({ $isSticky, theme }) =>
    $isSticky
      ? `-webkit-backdrop-filter: blur(${theme.semantic.blur.standard}); backdrop-filter: blur(${theme.semantic.blur.standard});`
      : ""}
  border-bottom: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  box-shadow: ${({ $isSticky, theme }) =>
    $isSticky
      ? `0 4px 16px ${theme.semantic.color.accentBgSubtle}`
      : "none"};
  --full-bleed: calc(var(--content-padding) + (100cqw - 100%) / 2);
  margin-left: calc(-1 * var(--full-bleed));
  margin-right: calc(-1 * var(--full-bleed));
  padding: ${({ theme }) => theme.primitive.spacing.xs} var(--full-bleed);
`;

const TabBar = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  display: none;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    display: flex;
    align-items: stretch;
    gap: ${({ theme }) => theme.primitive.spacing.xs};
    overflow-x: auto;
    mask-image: ${({ $fadeLeft, $fadeRight }) => {
      if ($fadeLeft && $fadeRight)
        return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft)
        return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight)
        return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
      return "none";
    }};
    -webkit-mask-image: ${({ $fadeLeft, $fadeRight }) => {
      if ($fadeLeft && $fadeRight)
        return "linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent 100%)";
      if ($fadeLeft)
        return "linear-gradient(to right, transparent, black 48px)";
      if ($fadeRight)
        return "linear-gradient(to right, black calc(100% - 48px), transparent 100%)";
      return "none";
    }};

    &::-webkit-scrollbar {
      height: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: ${({ theme }) => theme.semantic.radius.pill};
      transition: background 0.2s;
    }
    &:hover::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.semantic.color.borderDefault};
    }
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  padding: ${({ theme }) => theme.primitive.spacing.xs}
    ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.semantic.color.borderHover : "transparent"};
  background: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accentHover : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.semantic.color.accentHover
        : theme.semantic.color.borderDim};
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

const MobileSelectWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xs};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    display: none;
  }
`;

// Desktop row: set select (parent scope) sits left of the week tab bar.
const DesktopRow = styled.div`
  display: none;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    display: flex;
    align-items: stretch;
    gap: ${({ theme }) => theme.primitive.spacing.sm};
    min-width: 0;
  }
`;

const DesktopSetSelect = styled.div`
  flex-shrink: 0;
  width: 180px;
`;

// ── Component ───────────────────────────────────────────────────

export function TabNavigation({
  selectedTab,
  onTabChange,
  weeks,
  selectedSet,
  sets,
  activeSetNumber,
  onSetChange,
}: TabNavigationProps) {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { stickyRef, isSticky } = useFullBleedSticky();
  const { fadeLeft, fadeRight } = useScrollFade(tabBarRef);

  useEffect(() => {
    const bar = tabBarRef.current;
    const active = bar?.querySelector<HTMLElement>("[data-active='true']");
    if (!bar || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < bar.scrollLeft) bar.scrollLeft = left - 8;
    else if (right > bar.scrollLeft + bar.offsetWidth) bar.scrollLeft = right - bar.offsetWidth + 8;
  }, [selectedTab]);

  // Only show a set switcher when more than one set is browsable (i.e. once a new
  // set has started and the previous one is archived).
  const showSetSwitcher = sets.length > 1;
  const setOptions = sets.map((s) => ({
    value: String(s.number),
    label: s.label,
    sublabel: s.number === activeSetNumber ? "Current" : "Archived",
  }));

  return (
    <StickyTabWrap ref={stickyRef} $isSticky={isSticky}>
      <MobileSelectWrap>
        {showSetSwitcher && (
          <CustomSelect
            value={String(selectedSet.number)}
            onChange={(v) => onSetChange(parseInt(v, 10))}
            options={setOptions}
          />
        )}
        <CustomSelect
          value={selectedTab === "set" ? "set" : String(selectedTab)}
          onChange={(v) =>
            onTabChange(v === "set" ? "set" : parseInt(v, 10))
          }
          options={[
            { value: "set", label: selectedSet.label, sublabel: `${formatShortDate(selectedSet.start)}\u2009\u2013\u2009${formatShortDate(selectedSet.end)}` },
            ...weeks.map((w, i) => ({
              value: String(i),
              label: w.label,
              sublabel: `${formatShortDate(w.start)}\u2009\u2013\u2009${formatShortDate(w.end)}`,
            })),
          ]}
        />
      </MobileSelectWrap>

      <DesktopRow>
        {showSetSwitcher && (
          <DesktopSetSelect>
            <CustomSelect
              value={String(selectedSet.number)}
              onChange={(v) => onSetChange(parseInt(v, 10))}
              options={setOptions}
            />
          </DesktopSetSelect>
        )}
        <TabBar
          ref={tabBarRef}
          role="tablist"
          $fadeLeft={fadeLeft}
          $fadeRight={fadeRight}
        >
          <Tab
            type="button"
            role="tab"
            aria-selected={selectedTab === "set"}
            $active={selectedTab === "set"}
            data-active={selectedTab === "set" ? "true" : undefined}
            onClick={() => onTabChange("set")}
          >
            {selectedSet.label}
          </Tab>
          {weeks.map((w, i) => (
            <Tab
              key={i}
              type="button"
              role="tab"
              aria-selected={selectedTab === i}
              $active={selectedTab === i}
              data-active={selectedTab === i ? "true" : undefined}
              onClick={() => onTabChange(i)}
            >
              {w.label}
            </Tab>
          ))}
        </TabBar>
      </DesktopRow>
    </StickyTabWrap>
  );
}
