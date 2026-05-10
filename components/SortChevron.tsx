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
  variant?: "numeric" | "alpha";
  size?: number;
}

export function SortChevron({ direction, variant = "numeric", size = 9 }: SortChevronProps) {
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

  if (variant === "alpha") {
    // "AZ" side by side + arrow between: A↓Z for desc, A↑Z for asc.
    const aw = Math.round(size * 2);
    const ah = size;
    const arrowPath = direction === "asc"
      ? "M8.5,7 L8.5,2 L7,3.5 M8.5,2 L10,3.5"
      : "M8.5,2 L8.5,7 L7,5.5 M8.5,7 L10,5.5";
    return (
      <svg width={aw} height={ah} viewBox="0 0 17 9" display="block" fill="currentColor" stroke="none">
        <text x="0" y="7.5" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif">A</text>
        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d={arrowPath} />
        </g>
        <text x="11.5" y="7.5" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif">Z</text>
      </svg>
    );
  }

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
