"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "motion/react";
import { ICON_SIZE } from "@/styles/theme";

const Card = styled(motion.div)<{ $spaceBetween?: boolean; $prominent?: boolean }>`
  background: ${({ theme }) => theme.component.glassCard.bg};
  border: 1px solid ${({ theme }) => theme.component.glassCard.border};
  border-radius: ${({ theme }) => theme.component.glassCard.radius};
  padding: ${({ $prominent, theme }) =>
    $prominent
      ? `${theme.primitive.spacing.md} ${theme.primitive.spacing.sm}`
      : theme.primitive.spacing.sm};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  display: flex;
  flex-direction: column;
  justify-content: ${({ $spaceBetween }) => $spaceBetween ? "space-between" : "flex-start"};
  gap: ${({ theme }) => theme.primitive.spacing.md};
  position: relative;
  overflow: hidden;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    padding: ${({ $prominent, theme }) =>
      $prominent
        ? `${theme.primitive.spacing.lg} ${theme.component.glassCard.padding}`
        : theme.component.glassCard.padding};
    gap: ${({ theme }) => theme.primitive.spacing.lg};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const Title = styled.h3<{ $prominent?: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ $prominent, theme }) =>
    $prominent ? theme.primitive.fontSize.base : theme.primitive.fontSize.sm};
  color: ${({ $prominent, theme }) =>
    $prominent ? theme.semantic.color.textPrimary : theme.semantic.color.textMuted};
  display: flex;
  flex-direction: ${({ $prominent }) => $prominent ? "row" : "column"};
  align-items: ${({ $prominent }) => $prominent ? "center" : "flex-start"};
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  min-width: 0;
  flex: 1;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    flex-direction: row;
    align-items: center;
    gap: ${({ theme }) => theme.primitive.spacing.sm};
  }
`;

const IconWrapper = styled.span`
  color: ${({ theme }) => theme.semantic.color.accent};
  display: flex;
  flex-shrink: 0;
  width: ${ICON_SIZE.md}px;
  height: ${ICON_SIZE.md}px;
`;

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
  titleExtra?: React.ReactNode;
  icon?: React.ElementType;
  headerAction?: React.ReactNode;
  prominent?: boolean;
  spaceBetween?: boolean;
}

export function GlassCard({
  children,
  style,
  title,
  titleExtra,
  icon: Icon,
  headerAction,
  prominent,
  spaceBetween,
}: GlassCardProps) {
  return (
    <Card
      $spaceBetween={spaceBetween}
      $prominent={prominent}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={style}
    >
      {(title || Icon || headerAction) && (
        <Header>
          {title && (
            <Title $prominent={prominent}>
              {Icon && <IconWrapper><Icon size={ICON_SIZE.md} /></IconWrapper>}
              {title}
              {titleExtra}
            </Title>
          )}
          {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
        </Header>
      )}
      {children}
    </Card>
  );
}
