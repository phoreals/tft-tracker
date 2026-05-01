"use client";

import { useState } from "react";
import { getSetWeeks } from "@/lib/utils";

/**
 * URL-aware tab state. Reads `?tab=` from the query string on mount;
 * falls back to the current week index.
 */
export function useSelectedTab(): [
  "set" | number,
  (tab: "set" | number) => void,
] {
  const [selectedTab, setSelectedTab] = useState<"set" | number>(() => {
    const tabParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null;
    if (tabParam === "set") return "set";
    if (tabParam !== null) {
      const n = parseInt(tabParam, 10);
      if (!isNaN(n)) return n;
    }
    const now = Date.now();
    const ws = getSetWeeks();
    let idx = 0;
    for (let i = 0; i < ws.length; i++) {
      if (ws[i].start <= now) idx = i;
    }
    return idx;
  });

  return [selectedTab, setSelectedTab];
}
