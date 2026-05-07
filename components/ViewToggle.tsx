"use client";

import React from "react";
import styled from "styled-components";

// ── Styled ───────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  background: ${({ theme }) => theme.semantic.color.borderDim};
  border-radius: ${({ theme }) => theme.semantic.radius.element};
  padding: 2px;
`;

const Btn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: calc(${({ theme }) => theme.semantic.radius.element} - 2px);
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.component.glassCard.bg : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    color: ${({ $active, theme }) =>
      $active ? theme.semantic.color.accent : theme.semantic.color.textPrimary};
  }

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;

// ── Component ────────────────────────────────────────────────────

export interface ViewOption<T extends string = string> {
  id: T;
  icon: React.ElementType;
  label?: string;
}

interface ViewToggleProps<T extends string = string> {
  views: ViewOption<T>[];
  value: T;
  onChange: (v: T) => void;
  iconSize?: number;
}

export function ViewToggle<T extends string>({
  views,
  value,
  onChange,
  iconSize = 14,
}: ViewToggleProps<T>) {
  return (
    <Wrap>
      {views.map((v) => {
        const Icon = v.icon;
        return (
          <Btn
            key={v.id}
            $active={value === v.id}
            onClick={() => onChange(v.id)}
            title={v.label ?? v.id}
            aria-label={v.label ?? v.id}
            aria-pressed={value === v.id}
          >
            <Icon size={iconSize} />
          </Btn>
        );
      })}
    </Wrap>
  );
}
