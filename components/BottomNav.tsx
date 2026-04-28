"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Calendar, Search } from "lucide-react";

const Nav = styled.nav`
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${({ theme }) => theme.component.bottomNav.height};
  background: ${({ theme }) => theme.component.bottomNav.bg};
  backdrop-filter: blur(24px);
  border-top: 1px solid ${({ theme }) => theme.semantic.color.borderSubtle};
  align-items: center;
  justify-content: space-around;
  padding: 0 ${({ theme }) => theme.primitive.spacing.md};
  z-index: 100;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  transition: color 0.2s;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textMuted};
`;

const NavLabel = styled.span`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: 8px;
`;

const navItems = [
  { href: "/", icon: Calendar, label: "Weekly" },
  { href: "/players", icon: Search, label: "Players" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <Nav>
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <NavLink key={href} href={href} $active={active}>
            <Icon size={20} />
            <NavLabel>{label}</NavLabel>
          </NavLink>
        );
      })}
    </Nav>
  );
}
