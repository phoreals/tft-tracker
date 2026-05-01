"use client";

import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Check, ChevronDown } from "lucide-react";

// ── Styled ───────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  width: 100%;
  min-height: 44px;
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
  background: ${({ theme }) => theme.component.glassCard.bg};
  border: 1px solid ${({ $open, theme }) =>
    $open ? theme.semantic.color.borderHover : theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.medium};
  letter-spacing: 0.05em;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.semantic.color.borderHover};
  }

  &:active {
    background: rgba(229, 197, 135, 0.04);
  }
`;

const ChevronIcon = styled.span<{ $open: boolean }>`
  display: flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.semantic.color.accent};
  transition: transform 0.2s;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const OptionList = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  margin: 0;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} 0;
  list-style: none;
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  max-height: 280px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.semantic.color.borderDefault};
    border-radius: ${({ theme }) => theme.primitive.radius.full};
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
  letter-spacing: 0.05em;

  &:active {
    background: rgba(229, 197, 135, 0.08);
  }
`;

const CheckIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.semantic.color.accent};
`;

// ── Component ────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = options[selectedIndex]?.label ?? value;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  return (
    <Wrapper ref={wrapperRef} className={className}>
      <Trigger
        type="button"
        $open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedLabel}</span>
        <ChevronIcon $open={open}>
          <ChevronDown size={14} />
        </ChevronIcon>
      </Trigger>

      {open && (
        <OptionList
          ref={listRef}
          role="listbox"
          aria-label="Select option"
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
                <span>{opt.label}</span>
                {isSelected && (
                  <CheckIcon>
                    <Check size={14} />
                  </CheckIcon>
                )}
              </OptionItem>
            );
          })}
        </OptionList>
      )}
    </Wrapper>
  );
}
