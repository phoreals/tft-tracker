"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Check, ChevronDown } from "lucide-react";

// ── Styled ───────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

// Trigger: transparent enough to show the StickyTabWrap's blur through it.
// backdrop-filter intentionally omitted — the parent StickyTabWrap handles it.
const Trigger = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  width: 100%;
  min-height: 44px;
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
  background: ${({ $open, theme }) =>
    $open ? theme.semantic.color.accentBgHover : "rgba(12, 20, 30, 0.4)"};
  border: 1px solid ${({ $open, theme }) =>
    $open ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }
`;

const ChevronIcon = styled.span<{ $open: boolean }>`
  display: flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.semantic.color.accent};
  transition: transform 0.2s;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
`;

// OptionList renders via portal to document.body so it escapes any parent
// stacking context (sticky + backdrop-filter), allowing its own blur to work.
const OptionList = styled.ul<{ $top: number; $left: number; $width: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  z-index: 9999;
  margin: 0;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} 0;
  list-style: none;
  background: rgba(12, 20, 30, 0.6);
  -webkit-backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  max-height: 280px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.semantic.color.borderDefault};
    border-radius: ${({ theme }) => theme.semantic.radius.pill};
  }
`;

const OptionItem = styled.li<{ $selected: boolean; $focused: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  min-height: 44px;
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
  cursor: pointer;
  color: ${({ $selected, theme }) =>
    $selected ? theme.semantic.color.accent : theme.semantic.color.textPrimary};
  background: ${({ $focused, theme }) =>
    $focused ? theme.semantic.color.bgHover : "transparent"};
  transition: background 0.1s;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgHover};
  }
`;

const CheckIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const BoldLabel = styled.strong`
  color: ${({ theme }) => theme.semantic.color.accent};
`;

const Sublabel = styled.span`
  color: ${({ theme }) => theme.semantic.color.textMuted};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.regular};
`;

// ── Component ────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CustomSelect({ options, value, onChange, className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [listRect, setListRect] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = options[selectedIndex];
  const selectedLabel = selectedOption?.label ?? value;
  const selectedSublabel = selectedOption?.sublabel;

  // Measure trigger position for the fixed-position portal
  const measureTrigger = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setListRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  const handleOpen = () => {
    measureTrigger();
    setOpen((o) => !o);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inList = listRef.current?.contains(target);
      if (!inWrapper && !inList) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Re-measure on scroll/resize so the portal stays aligned
  useEffect(() => {
    if (!open) return;
    const update = () => measureTrigger();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Scroll selected into view on open
  useEffect(() => {
    if (open && selectedIndex >= 0) {
      setFocusedIndex(selectedIndex);
      requestAnimationFrame(() => {
        itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
      });
    }
  }, [open, selectedIndex]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      measureTrigger();
      setOpen(true);
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0) {
        onChange(options[focusedIndex].value);
        setOpen(false);
      }
    }
  };

  // Keep focus in list when navigating
  useEffect(() => {
    if (open && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, open]);

  const list = open ? (
    <OptionList
      ref={listRef}
      role="listbox"
      aria-label="Select option"
      $top={listRect.top}
      $left={listRect.left}
      $width={listRect.width}
      onKeyDown={handleListKeyDown}
    >
      {options.map((opt, i) => {
        const isSelected = opt.value === value;
        const isFocused = i === focusedIndex;
        return (
          <OptionItem
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            $selected={isSelected}
            $focused={isFocused}
            tabIndex={isFocused ? 0 : -1}
            ref={(el) => { itemRefs.current[i] = el; }}
            onMouseEnter={() => setFocusedIndex(i)}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            <span><BoldLabel>{opt.label}</BoldLabel>{opt.sublabel && <Sublabel>{"\u2002·\u2002"}{opt.sublabel}</Sublabel>}</span>
            {isSelected && (
              <CheckIcon>
                <Check size={14} />
              </CheckIcon>
            )}
          </OptionItem>
        );
      })}
    </OptionList>
  ) : null;

  return (
    <Wrapper ref={wrapperRef} className={className}>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <span><BoldLabel>{selectedLabel}</BoldLabel>{selectedSublabel && <Sublabel>{"\u2002·\u2002"}{selectedSublabel}</Sublabel>}</span>
        <ChevronIcon $open={open}>
          <ChevronDown size={14} />
        </ChevronIcon>
      </Trigger>

      {typeof document !== "undefined" && createPortal(list, document.body)}
    </Wrapper>
  );
}
