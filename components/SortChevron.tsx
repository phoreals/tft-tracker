"use client";

import React from "react";

// Stroke-based sort arrows sized to sit flush with small table-header text.
// direction="asc"  → single up arrow (arrowhead + stem)
// direction="desc" → single down arrow (arrowhead + stem)
// direction="none" → two opposing arrows meeting at centre (↕ style)
//
// size controls the rendered height in px; width is derived (≈ 0.67 × size).

interface SortChevronProps {
  direction: "asc" | "desc" | "none";
  size?: number;
}

export function SortChevron({ direction, size = 9 }: SortChevronProps) {
  const h = size;
  const w = Math.round(size * 0.67);

  const shared = {
    width: w,
    height: h,
    viewBox: "0 0 6 9",
    fill: "none" as const,
    stroke: "currentColor",
    strokeLinecap: "butt" as const,
    strokeLinejoin: "miter" as const,
    display: "block" as const,
  };

  if (direction === "asc") {
    // Arrowhead at top, stem runs to bottom.
    return (
      <svg {...shared} strokeWidth="1.5">
        <path d="M0.75,3.75 L3,0.75 L5.25,3.75 M3,0.75 L3,8.25" />
      </svg>
    );
  }

  if (direction === "desc") {
    // Arrowhead at bottom, stem runs to top.
    return (
      <svg {...shared} strokeWidth="1.5">
        <path d="M0.75,5.25 L3,8.25 L5.25,5.25 M3,8.25 L3,0.75" />
      </svg>
    );
  }

  // "none" — two half-arrows meeting at the vertical centre (↕).
  return (
    <svg {...shared} strokeWidth="1.4">
      <path d="M0.75,3.75 L3,1.25 L5.25,3.75 M3,1.25 L3,4.5" />
      <path d="M0.75,5.25 L3,7.75 L5.25,5.25 M3,7.75 L3,4.5" />
    </svg>
  );
}
