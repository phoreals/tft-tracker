"use client";

import React, { useState } from "react";
import styled from "styled-components";

// ── Styled ───────────────────────────────────────────────────────

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

const EmblemMobile = styled.span`
  display: inline-flex;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const EmblemDesktop = styled.span`
  display: none;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: inline-flex;
  }
`;

// ── RankEmblem ───────────────────────────────────────────────────

const EMBLEM_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

export function RankEmblem({ tier, size, color }: { tier: string; size: number; color: string }) {
  const [failed, setFailed] = useState(false);
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
      src={`${EMBLEM_BASE}/${tier.toLowerCase()}_tft.svg`}
      alt={tier}
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// ── RankText ─────────────────────────────────────────────────────

/**
 * Responsive rank text: shows abbreviated rank on mobile, full on desktop.
 */
export function RankText({ full, abbr }: { full: string; abbr: string }) {
  return (
    <>
      <RankFull>{full}</RankFull>
      <RankAbbr>{abbr}</RankAbbr>
    </>
  );
}

/**
 * Responsive rank emblem: smaller on mobile, larger on desktop.
 */
export function ResponsiveEmblem({ tier, color, mobileSize = 12, desktopSize = 14 }: {
  tier: string;
  color: string;
  mobileSize?: number;
  desktopSize?: number;
}) {
  return (
    <>
      <EmblemMobile>
        <RankEmblem tier={tier} size={mobileSize} color={color} />
      </EmblemMobile>
      <EmblemDesktop>
        <RankEmblem tier={tier} size={desktopSize} color={color} />
      </EmblemDesktop>
    </>
  );
}
