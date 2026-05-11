"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getSetWeeks } from "@/lib/utils";

function parseTab(tabParam: string | null): "set" | number {
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
}

/**
 * URL-aware tab state. Local React state is the immediate source of truth
 * for instant UI updates; the URL is synced as a side effect for persistence
 * across navigation. URL changes (browser back/forward) sync back into state.
 */
export function useSelectedTab(): [
  "set" | number,
  (tab: "set" | number) => void,
] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedTab, setSelectedTabState] = useState<"set" | number>(
    () => parseTab(searchParams.get("tab")),
  );

  // Sync from URL when it changes externally (browser back/forward, link navigation).
  useEffect(() => {
    setSelectedTabState(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const setSelectedTab = useCallback((tab: "set" | number) => {
    setSelectedTabState(tab); // immediate UI update
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(tab));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return [selectedTab, setSelectedTab];
}
