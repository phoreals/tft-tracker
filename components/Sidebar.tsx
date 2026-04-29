"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Calendar, Search } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";

const Aside = styled.aside`
  display: none;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  width: ${({ theme }) => theme.component.sidebar.width};
  background: ${({ theme }) => theme.component.sidebar.bg};
  backdrop-filter: blur(48px);
  border-right: 1px solid ${({ theme }) => theme.component.sidebar.borderColor};
  z-index: 60;
  padding: ${({ theme }) => theme.primitive.spacing.xl} 0;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: flex;
  }
`;

const Brand = styled.div`
  padding: 0 ${({ theme }) => theme.primitive.spacing.lg};
  margin-bottom: 40px;
`;

const BrandTitle = styled.h1`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.black};
  color: ${({ theme }) => theme.semantic.color.accent};
  text-transform: uppercase;
  font-style: italic;
  letter-spacing: -0.025em;
`;

const BrandSub = styled.p`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: 10px;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-top: 4px;
`;

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  padding: ${({ theme }) => theme.primitive.spacing.md} ${({ theme }) => theme.primitive.spacing.lg};
  width: 100%;
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textSecondary};
  background: ${({ $active }) =>
    $active ? "rgba(229, 197, 135, 0.1)" : "transparent"};
  border-right: ${({ $active }) =>
    $active ? "4px solid var(--accent)" : "4px solid transparent"};

  --accent: ${({ theme }) => theme.semantic.color.accent};

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active }) =>
      $active ? "rgba(229, 197, 135, 0.1)" : "rgba(255, 255, 255, 0.05)"};
  }
`;

const NavLabel = styled.span`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 12px;
`;

const Footer = styled.div`
  padding: 0 ${({ theme }) => theme.primitive.spacing.lg};
  margin-top: auto;
`;

const FooterText = styled.p`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: 9px;
  color: rgba(208, 197, 181, 0.3);
`;

const navItems = [
  { href: "/", icon: Calendar, label: "Weekly Stats" },
  { href: "/players", icon: Search, label: "Manage Players" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <Aside>
      <Brand>
        <BrandTitle>TFT Tracker</BrandTitle>
        <BrandSub>Squad Performance</BrandSub>
      </Brand>

      <Nav>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <NavLink key={href} href={href} $active={active}>
              <Icon size={ICON_SIZE.nav} />
              <NavLabel>{label}</NavLabel>
            </NavLink>
          );
        })}
      </Nav>

      <Footer>
        <FooterText>Data provided by Riot Games.</FooterText>
      </Footer>
    </Aside>
  );
}
