"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "motion/react";
import { ICON_SIZE } from "@/styles/theme";

const Card = styled(motion.div)`
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  border: 1px solid ${({ theme }) => theme.component.glassCard.border};
  border-radius: ${({ theme }) => theme.component.glassCard.radius};
  padding: ${({ theme }) => theme.primitive.spacing.sm};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    padding: ${({ theme }) => theme.component.glassCard.padding};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  margin-bottom: ${({ theme }) => theme.primitive.spacing.md};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-bottom: ${({ theme }) => theme.primitive.spacing.lg};
  }
`;

const Title = styled.h3<{ $prominent?: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ $prominent, theme }) =>
    $prominent ? theme.primitive.fontSize.md : "12px"};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  min-width: 0;
  flex: 1;
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
  icon?: React.ElementType;
  headerAction?: React.ReactNode;
  prominent?: boolean;
}

export function GlassCard({
  children,
  style,
  title,
  icon: Icon,
  headerAction,
  prominent,
}: GlassCardProps) {
  return (
    <Card
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
            </Title>
          )}
          {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
        </Header>
      )}
      {children}
    </Card>
  );
}
