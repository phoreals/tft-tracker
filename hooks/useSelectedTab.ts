"use client";

import { useCallback } from "react";
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
 * URL-aware tab state. Reads and writes `?tab=` in the query string so tab
 * selection survives client-side navigation between pages.
 */
export function useSelectedTab(): [
  "set" | number,
  (tab: "set" | number) => void,
] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedTab = parseTab(searchParams.get("tab"));

  const setSelectedTab = useCallback((tab: "set" | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(tab));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return [selectedTab, setSelectedTab];
}
