"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Tracks whether the referenced element is stuck at top: 0 and computes
 * --bleed-extra for edge-to-edge sticky strips on wide viewports.
 */
export function useFullBleedSticky() {
  const [stickyEl, setStickyEl] = useState<HTMLDivElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);

  const stickyRef = useCallback(
    (node: HTMLDivElement | null) => setStickyEl(node),
    [],
  );

  useEffect(() => {
    if (!stickyEl) return;
    const check = () => setIsSticky(stickyEl.getBoundingClientRect().top <= 1);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [stickyEl]);

  useEffect(() => {
    if (!stickyEl) return;
    const main = stickyEl.closest("main");
    if (!main) return;
    const update = () => {
      const extra = Math.max(
        0,
        (main.getBoundingClientRect().width - 1440) / 2,
      );
      stickyEl.style.setProperty("--bleed-extra", `${extra}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    return () => ro.disconnect();
  }, [stickyEl]);

  return { stickyRef, isSticky };
}

/**
 * Returns { fadeLeft, fadeRight } booleans based on scroll position
 * of a horizontally-scrollable element.
 */
export function useScrollFade(ref: React.RefObject<HTMLDivElement | null>) {
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setFadeLeft(el.scrollLeft > 2);
      setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);

  return { fadeLeft, fadeRight };
}
