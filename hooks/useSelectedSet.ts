"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { resolveSet, type TftSet } from "@/lib/utils";

/**
 * URL-aware selected-set state, backed by the `?set=` query param. Mirrors
 * useSelectedTab: local state is the immediate source of truth for instant UI
 * updates, and the URL is synced as a side effect so the selection persists
 * across navigation and deep links. Defaults to the active set.
 *
 * Switching sets also resets `?tab=` to the whole-set overview, so browsing an
 * archived set lands predictably rather than on a stale week index.
 */
export function useSelectedSet(): [TftSet, (setNumber: number) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedSet, setSelectedSetState] = useState<TftSet>(
    () => resolveSet(searchParams.get("set")),
  );

  // Sync from URL when it changes externally (browser back/forward, links).
  useEffect(() => {
    setSelectedSetState(resolveSet(searchParams.get("set")));
  }, [searchParams]);

  const setSelectedSet = useCallback((setNumber: number) => {
    setSelectedSetState(resolveSet(String(setNumber))); // immediate UI update
    const params = new URLSearchParams(searchParams.toString());
    params.set("set", String(setNumber));
    params.set("tab", "set"); // reset week selection on set change
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return [selectedSet, setSelectedSet];
}
