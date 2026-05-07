"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import {
  formatPlaytime,
  formatPlaytimeHours,
  formatPlaytimeShort,
  formatPlaytimeFull,
} from "@/lib/utils";
import { theme } from "@/styles/theme";

// ── Tooltip portal ────────────────────────────────────────────────

const TOOLTIP_STYLE: React.CSSProperties = {
  position:    "fixed",
  zIndex:      9999,
  pointerEvents: "none",
  whiteSpace:  "nowrap",
  background:  "rgba(12, 20, 30, 0.92)",
  border:      `1px solid ${theme.semantic.color.borderDefault}`,
  borderRadius: theme.semantic.radius.element,
  padding:     "3px 8px",
  fontFamily:  "Space Grotesk",
  fontSize:    theme.primitive.fontSize.xs,
  color:       theme.semantic.color.textMuted,
};

// ── Wrapper — hides cursor affordance on touch-only devices ───────

const Wrap = styled.span`
  cursor: default;

  /* suppress tooltip interaction on touch-only screens */
  @media (hover: none) {
    pointer-events: none;
  }
`;

// ── Component ────────────────────────────────────────────────────

export type PlaytimeVariant = "full" | "hours" | "short";

interface PlaytimeDisplayProps {
  seconds: number;
  variant?: PlaytimeVariant;
  style?: React.CSSProperties;
  className?: string;
}

export function PlaytimeDisplay({
  seconds,
  variant = "full",
  style,
  className,
}: PlaytimeDisplayProps) {
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  if (seconds <= 0) return <span style={style} className={className}>—</span>;

  const formatted =
    variant === "short" ? formatPlaytimeShort(seconds)
    : variant === "hours" ? formatPlaytimeHours(seconds)
    : formatPlaytime(seconds);

  const tooltipText = formatPlaytimeFull(seconds);

  const TOOLTIP_W = 140;
  const TOOLTIP_H = 26;
  const GAP = 6;

  const tipStyle: React.CSSProperties | null = tipRect ? (() => {
    let left = tipRect.right - TOOLTIP_W;
    let top  = tipRect.top - TOOLTIP_H - GAP;
    if (top < 4) top = tipRect.bottom + GAP;
    left = Math.max(4, Math.min(left, window.innerWidth - TOOLTIP_W - 4));
    return { ...TOOLTIP_STYLE, left, top };
  })() : null;

  return (
    <Wrap
      style={style}
      className={className}
      onMouseEnter={(e) => {
        if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return;
        setTipRect((e.currentTarget as HTMLElement).getBoundingClientRect());
      }}
      onMouseLeave={() => setTipRect(null)}
    >
      {formatted}
      {tipRect && tipStyle && typeof document !== "undefined" && createPortal(
        <div style={tipStyle}>{tooltipText}</div>,
        document.body,
      )}
    </Wrap>
  );
}
