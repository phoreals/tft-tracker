"use client";

import React from "react";

// Stroke-based sort indicator sized to sit flush with small table-header text.
// direction="none"  → two stacked chevrons (sortable affordance)
// direction="asc"   → single up chevron (active ascending)
// direction="desc"  → single down chevron (active descending)
//
// size controls the rendered height in px; width is derived (≈ 0.75 × size).

interface SortChevronProps {
  direction: "asc" | "desc" | "none";
  size?: number;
}

export function SortChevron({ direction, size = 8 }: SortChevronProps) {
  const h = size;
  const w = Math.round(size * 0.75);

  const shared = {
    width: w,
    height: h,
    viewBox: "0 0 6 8",
    fill: "none" as const,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    display: "block" as const,
  };

  if (direction === "asc") {
    return (
      <svg {...shared} strokeWidth="1.6">
        <polyline points="0.5,6.5 3,1.5 5.5,6.5" />
      </svg>
    );
  }

  if (direction === "desc") {
    return (
      <svg {...shared} strokeWidth="1.6">
        <polyline points="0.5,1.5 3,6.5 5.5,1.5" />
      </svg>
    );
  }

  // "none" — two small stacked chevrons
  return (
    <svg {...shared} strokeWidth="1.4">
      <polyline points="0.5,3.5 3,1 5.5,3.5" />
      <polyline points="0.5,4.5 3,7 5.5,4.5" />
    </svg>
  );
}
