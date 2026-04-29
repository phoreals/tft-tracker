"use client";

import React from "react";
import styled from "styled-components";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: ${({ theme }) => theme.component.sidebar.width};
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 0 ${({ theme }) => theme.primitive.spacing.sm};
  padding-bottom: calc(${({ theme }) => theme.component.bottomNav.height} + ${({ theme }) => theme.primitive.spacing.md});
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    padding: 0 ${({ theme }) => theme.primitive.spacing.xl};
    padding-bottom: ${({ theme }) => theme.primitive.spacing.xl};
  }
`;

export function NavigationShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <Sidebar />
      <Main>
        <Content>{children}</Content>
      </Main>
      <BottomNav />
    </Shell>
  );
}
