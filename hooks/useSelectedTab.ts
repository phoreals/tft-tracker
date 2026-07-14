"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getSetWeeks, type TftSet } from "@/lib/utils";

function parseTab(tabParam: string | null, viewedSet: TftSet): "set" | number {
  const ws = getSetWeeks(viewedSet);
  if (tabParam === "set") return "set";
  if (tabParam !== null) {
    const n = parseInt(tabParam, 10);
    if (!isNaN(n)) {
      // Clamp out-of-range week indices (e.g. after switching to a set with
      // fewer weeks) back to the whole-set overview.
      return n >= 0 && n < ws.length ? n : "set";
    }
  }
  const now = Date.now();
  let idx = 0;
  for (let i = 0; i < ws.length; i++) {
    if (ws[i].start <= now) idx = i;
  }
  return idx;
}

/**
 * URL-aware tab state, scoped to the viewed set. Local React state is the
 * immediate source of truth for instant UI updates; the URL (`?tab=`) is synced
 * as a side effect for persistence across navigation. URL changes (browser
 * back/forward) and set changes sync back into state.
 */
export function useSelectedTab(viewedSet: TftSet): [
  "set" | number,
  (tab: "set" | number) => void,
] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedTab, setSelectedTabState] = useState<"set" | number>(
    () => parseTab(searchParams.get("tab"), viewedSet),
  );

  // Sync from URL when it changes externally, or when the viewed set changes.
  useEffect(() => {
    setSelectedTabState(parseTab(searchParams.get("tab"), viewedSet));
  }, [searchParams, viewedSet]);

  const setSelectedTab = useCallback((tab: "set" | number) => {
    setSelectedTabState(tab); // immediate UI update
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(tab));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return [selectedTab, setSelectedTab];
}
