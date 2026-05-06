"use client";

import styled from "styled-components";

export const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.accent};
  flex-shrink: 0;
`;
