"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { X, Copy, Check, RefreshCw } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";

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

// ── Styled ──────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.primitive.spacing.lg};
  right: ${({ theme }) => theme.primitive.spacing.lg};
  z-index: 9000;
  max-width: 420px;
  width: calc(100% - ${({ theme }) => theme.primitive.spacing.lg} * 2);

  @media (max-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    left: ${({ theme }) => theme.primitive.spacing.md};
    right: ${({ theme }) => theme.primitive.spacing.md};
    width: auto;
    max-width: none;
  }
`;

const Card = styled.div<{ $tone: "muted" | "warn" | "error" }>`
  background: rgba(12, 20, 30, 0.85);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  border: 1px solid ${({ $tone, theme }) =>
    $tone === "error"
      ? theme.semantic.color.danger
      : $tone === "warn"
        ? theme.semantic.color.borderHover
        : theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.lg};
  box-shadow: ${({ theme }) => theme.semantic.shadow.glassInset},
    0 8px 32px rgba(0, 0, 0, 0.4);
  padding: ${({ theme }) => theme.primitive.spacing.md};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const SpinnerIcon = styled(RefreshCw)`
  color: ${({ theme }) => theme.semantic.color.accent};
  animation: spin 1s linear infinite;
  flex-shrink: 0;
  margin-top: 2px;
`;

const Message = styled.p<{ $tone: "muted" | "warn" | "error" }>`
  flex: 1;
  margin: 0;
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  line-height: 1.4;
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
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
  flex-shrink: 0;
  margin-top: 1px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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
`;

// ── Component ───────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;

export function SyncOverlay({ status, syncing, onDismiss }: SyncOverlayProps) {
  const [copied, setCopied] = useState(false);

  // Auto-dismiss success messages after 5s
  useEffect(() => {
    if (!status || syncing) return;
    if (status.tone === "error") return; // errors persist
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

  if (!status || typeof document === "undefined") return null;

  const showDismiss = !syncing;
  const showCopy = status.tone === "error";

  return createPortal(
    <Backdrop>
      <Card $tone={status.tone}>
        {syncing && <SpinnerIcon size={ICON_SIZE.sm} />}
        <Message $tone={status.tone}>{status.message}</Message>
        <Actions>
          {showCopy && (
            <IconButton
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy error"}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          )}
          {showDismiss && (
            <IconButton onClick={onDismiss} title="Dismiss">
              <X size={14} />
            </IconButton>
          )}
        </Actions>
      </Card>
    </Backdrop>,
    document.body,
  );
}
