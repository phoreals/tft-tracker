"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { X, Copy, Check } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

export interface SyncStatus {
  tone: "muted" | "warn" | "error";
  message: string;
}

interface SyncOverlayProps {
  status: SyncStatus | null;
  syncing: boolean;
  onDismiss: () => void;
}

// ── Animations ──────────────────────────────────────────────────

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// ── Styled ──────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.primitive.spacing.lg};
  right: ${({ theme }) => theme.primitive.spacing.lg};
  z-index: 9000;
  max-width: 420px;
  width: calc(100% - ${({ theme }) => theme.primitive.spacing.lg} * 2);
  animation: ${slideIn} 0.2s ease-out;

  @media (max-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    left: ${({ theme }) => theme.primitive.spacing.md};
    right: ${({ theme }) => theme.primitive.spacing.md};
    width: auto;
    max-width: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Card = styled.div<{ $tone: "muted" | "warn" | "error" }>`
  background: ${({ theme }) => theme.component.glassCard.bg};
  -webkit-backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  border: 1px solid ${({ $tone, theme }) =>
    $tone === "error"
      ? `${theme.semantic.color.danger}66`
      : $tone === "warn"
        ? theme.semantic.color.accent
        : theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.lg};
  box-shadow: ${({ theme }) => theme.semantic.shadow.glassInset},
    ${({ $tone, theme }) =>
      $tone === "error"
        ? `0 0 15px ${theme.semantic.color.danger}26`
        : $tone === "warn"
          ? theme.semantic.shadow.glowGold
          : "none"};
  /* icon is 14px inside a 28px button → 7px inset per side;
     subtract that from the base padding so the icon's visual edge
     aligns with the text's left edge */
  padding: ${({ theme }) => theme.primitive.spacing.md};
  padding-right: calc(${({ theme }) => theme.primitive.spacing.md} - (28px - 14px) / 2);
  min-height: 36px;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const MessageWrap = styled.div`
  flex: 1;
  min-width: 0;
  max-height: 200px;
  overflow-y: auto;
`;

const Message = styled.p<{ $tone: "muted" | "warn" | "error"; $isError: boolean }>`
  margin: 0;
  font-family: ${({ $isError, theme }) =>
    $isError ? "monospace" : theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  line-height: 1.5;
  color: ${({ $tone, theme }) =>
    $tone === "error"
      ? theme.semantic.color.danger
      : $tone === "warn"
        ? theme.semantic.color.accent
        : theme.semantic.color.textMuted};
  white-space: pre-line;
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  flex-shrink: 0;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.semantic.color.textMuted};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.semantic.color.borderDim};
    color: ${({ theme }) => theme.semantic.color.textPrimary};
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    min-height: 28px;
    min-width: 28px;
  }
`;

// ── Component ───────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;

export function SyncOverlay({ status, syncing, onDismiss }: SyncOverlayProps) {
  const [copied, setCopied] = useState(false);

  // Auto-dismiss success messages after 5s
  useEffect(() => {
    if (!status || syncing) return;
    if (status.tone === "error") return;
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [status, syncing, onDismiss]);

  // Reset copied state when message changes
  useEffect(() => {
    setCopied(false);
  }, [status?.message]);

  const handleCopy = useCallback(() => {
    if (!status) return;
    navigator.clipboard.writeText(status.message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [status]);

  // Only show overlay for final results, not while syncing
  if (!status || syncing || typeof document === "undefined") return null;

  const showCopy = status.tone === "error";
  const isError = status.tone === "error";

  return createPortal(
    <Backdrop>
      <Card $tone={status.tone}>
        <MessageWrap>
          <Message $tone={status.tone} $isError={isError}>
            {status.message}
          </Message>
        </MessageWrap>
        <Actions>
          {showCopy && (
            <IconButton
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy error"}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          )}
          <IconButton onClick={onDismiss} title="Dismiss">
            <X size={14} />
          </IconButton>
        </Actions>
      </Card>
    </Backdrop>,
    document.body,
  );
}
