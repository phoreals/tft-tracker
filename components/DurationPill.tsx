"use client";

import styled from "styled-components";

export const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderHover};
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.accent};
  flex-shrink: 0;
`;
