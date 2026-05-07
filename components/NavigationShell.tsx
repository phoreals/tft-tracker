"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  position: relative;
`;

const Main = styled.main<{ $sidebarOpen: boolean }>`
  container-type: inline-size;
  container-name: content;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s ease;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    margin-left: ${({ $sidebarOpen, theme }) =>
      $sidebarOpen ? theme.component.sidebar.width : theme.component.sidebar.collapsedWidth};
  }
`;

const Content = styled.div`
  --content-padding: ${({ theme }) => theme.primitive.spacing.sm};
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 var(--content-padding);
  padding-bottom: calc(${({ theme }) => theme.component.bottomNav.height} + ${({ theme }) => theme.primitive.spacing.md});
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    --content-padding: ${({ theme }) => theme.primitive.spacing.xl};
    padding-bottom: ${({ theme }) => theme.primitive.spacing.xl};
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    --content-padding: ${({ theme }) => theme.primitive.spacing["2xl"]};
    padding-bottom: ${({ theme }) => theme.primitive.spacing["2xl"]};
  }
`;

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Shell>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onOpen={() => setSidebarOpen(true)}
      />
      <Main $sidebarOpen={sidebarOpen}>
        <Content>{children}</Content>
      </Main>
      <BottomNav />
    </Shell>
  );
}
