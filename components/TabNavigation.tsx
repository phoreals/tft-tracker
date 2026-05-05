"use client";

import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { CustomSelect } from "@/components/CustomSelect";
import { SET_LABEL, SET_START, SET_END } from "@/lib/utils";
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
  ${({ $isSticky }) =>
    $isSticky
      ? "-webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);"
      : ""}
  border-bottom: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  box-shadow: ${({ $isSticky, theme }) =>
    $isSticky
      ? `0 4px 16px ${theme.semantic.color.accentBgSubtle}`
      : "none"};
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  margin-right: -${({ theme }) => theme.primitive.spacing.sm};
  padding: ${({ theme }) => theme.primitive.spacing.xs}
    ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: calc(
      -${({ theme }) => theme.primitive.spacing.xl} - var(--bleed-extra, 0px)
    );
    margin-right: calc(
      -${({ theme }) => theme.primitive.spacing.xl} - var(--bleed-extra, 0px)
    );
    padding: ${({ theme }) => theme.primitive.spacing.xs}
      calc(
        ${({ theme }) => theme.primitive.spacing.xl} + var(--bleed-extra, 0px)
      );
  }
`;

const TabBar = styled.div<{ $fadeLeft: boolean; $fadeRight: boolean }>`
  display: none;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
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
      border-radius: ${({ theme }) => theme.primitive.radius.full};
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
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
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
  display: block;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

// ── Component ───────────────────────────────────────────────────

export function TabNavigation({
  selectedTab,
  onTabChange,
  weeks,
}: TabNavigationProps) {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { stickyRef, isSticky } = useFullBleedSticky();
  const { fadeLeft, fadeRight } = useScrollFade(tabBarRef);

  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector(
      "[data-active='true']",
    ) as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedTab]);

  return (
    <StickyTabWrap ref={stickyRef} $isSticky={isSticky}>
      <MobileSelectWrap>
        <CustomSelect
          value={selectedTab === "set" ? "set" : String(selectedTab)}
          onChange={(v) =>
            onTabChange(v === "set" ? "set" : parseInt(v, 10))
          }
          options={[
            { value: "set", label: SET_LABEL, sublabel: `${formatShortDate(SET_START)}\u2009\u2013\u2009${formatShortDate(SET_END)}` },
            ...weeks.map((w, i) => ({
              value: String(i),
              label: w.label,
              sublabel: `${formatShortDate(w.start)}\u2009\u2013\u2009${formatShortDate(w.end)}`,
            })),
          ]}
        />
      </MobileSelectWrap>

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
          {SET_LABEL}
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
    </StickyTabWrap>
  );
}
