"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Home, Users, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ICON_SIZE } from "@/styles/theme";

// Same SVG path used for the app favicon (app/icon.tsx)
const TFT_ICON_PATH =
  "M63.4067 5.29259C63.6283 4.21052 65.1743 4.21064 65.396 5.29259L74.1997 48.3658L87.9458 39.2858C88.6373 38.8289 89.4573 39.6489 89.0005 40.3404L79.9194 54.0856L122.993 62.8893C124.075 63.1106 124.075 64.6582 122.993 64.8795L79.9194 73.6822L89.0005 87.4283C89.4573 88.1198 88.6373 88.9405 87.9458 88.484L74.1997 79.4029L65.396 122.475C65.1747 123.558 63.628 123.558 63.4067 122.475L54.603 79.4029L40.8579 88.484C40.1664 88.9406 39.3456 88.1198 39.8023 87.4283L48.8823 73.6822L5.81007 64.8795C4.72802 64.6579 4.72803 63.1109 5.81007 62.8893L48.8823 54.0856L39.8023 40.3404C39.3461 39.649 40.1666 38.8292 40.8579 39.2858L54.603 48.3649L60.7398 18.3404L63.3618 5.51231V5.51134L63.4067 5.29259ZM21.0523 78.3561C25.5877 91.9477 36.336 102.696 49.9273 107.232L52.7632 121.105C29.8568 116.471 11.8136 98.4277 7.18018 75.5211L21.0523 78.3561ZM121.623 75.5211C116.989 98.4281 98.9456 116.472 76.0386 121.105L78.8735 107.232C92.4657 102.696 103.214 91.9482 107.75 78.3561L121.623 75.5211ZM76.0386 6.6627C98.9452 11.2961 116.988 29.3393 121.622 52.2457L107.749 49.4098C103.212 35.8186 92.4652 25.0702 78.8735 20.5348L76.0386 6.6627ZM49.9273 20.5357C36.3367 25.0717 25.5891 35.8192 21.0532 49.4098L7.18116 52.2447C11.8153 29.3393 29.8576 11.2965 52.7632 6.6627L49.9273 20.5357Z";

function TFTIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <path d={TFT_ICON_PATH} fill="#e5c587" />
    </svg>
  );
}

// ── Styled ───────────────────────────────────────────────────────

const Aside = styled.aside<{ $expanded: boolean }>`
  display: none;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  width: ${({ $expanded, theme }) =>
    $expanded ? theme.component.sidebar.width : theme.component.sidebar.collapsedWidth};
  background: ${({ theme }) => theme.component.sidebar.bg};
  backdrop-filter: blur(48px);
  border-right: 1px solid ${({ theme }) => theme.component.sidebar.borderColor};
  z-index: 60;
  overflow: hidden;
  transition: width 0.2s ease;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: flex;
  }
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  padding: ${({ theme }) => theme.primitive.spacing.xl} ${({ theme }) => theme.primitive.spacing.md};
  flex-shrink: 0;
`;

const BrandIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

const BrandText = styled.div<{ $expanded: boolean }>`
  overflow: hidden;
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  max-width: ${({ $expanded }) => ($expanded ? "160px" : "0")};
  transition: opacity 0.15s ease, max-width 0.2s ease;
  white-space: nowrap;
  min-width: 0;
`;

const BrandTitle = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.black};
  color: ${({ theme }) => theme.semantic.color.accent};
  text-transform: uppercase;
  line-height: 1.1;
`;

const BrandSub = styled.span`
  display: block;
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  margin-top: 3px;
`;

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${ICON_SIZE.lg}px;
  height: ${ICON_SIZE.lg}px;
  flex-shrink: 0;
`;

const NavLink = styled(Link)<{ $active: boolean; $expanded: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  padding: ${({ theme }) => theme.primitive.spacing.md};
  width: 100%;
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
  color: ${({ $active, theme }) =>
    $active ? theme.semantic.color.accent : theme.semantic.color.textSecondary};
  background: ${({ $active }) => ($active ? "rgba(229, 197, 135, 0.1)" : "transparent")};
  border-right: ${({ $active, $expanded }) =>
    $expanded ? ($active ? "4px solid var(--accent)" : "4px solid transparent") : "none"};

  --accent: ${({ theme }) => theme.semantic.color.accent};

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: ${({ $active }) =>
      $active ? "rgba(229, 197, 135, 0.1)" : "rgba(255, 255, 255, 0.05)"};
  }
`;

const NavLabel = styled.span<{ $expanded: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  white-space: nowrap;
  overflow: hidden;
  max-width: ${({ $expanded }) => ($expanded ? "160px" : "0")};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: max-width 0.2s ease, opacity 0.15s ease;
`;

const Footer = styled.div<{ $expanded: boolean }>`
  overflow: hidden;
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  max-height: ${({ $expanded }) => ($expanded ? "40px" : "0")};
  transition: opacity 0.15s ease, max-height 0.2s ease;
  padding: 0 ${({ theme }) => theme.primitive.spacing.lg};
  padding-bottom: ${({ theme }) => theme.primitive.spacing.sm};
`;

const FooterText = styled.p`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: rgba(208, 197, 181, 0.3);
  white-space: nowrap;
`;

const CollapseBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
  width: 100%;
  padding: ${({ theme }) => theme.primitive.spacing.md};
  background: transparent;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.semantic.color.borderSubtle};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.semantic.color.textPrimary};
    background: rgba(255, 255, 255, 0.05);
  }
`;

const CollapseBtnLabel = styled.span<{ $expanded: boolean }>`
  ${({ theme }) => theme.semantic.typography.label};
  overflow: hidden;
  max-width: ${({ $expanded }) => ($expanded ? "120px" : "0")};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: max-width 0.2s ease, opacity 0.15s ease;
`;

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/players", icon: Users, label: "Manage Players" },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

export function Sidebar({ open, onToggle, onOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = open || isHovered;

  return (
    <Aside
      $expanded={isExpanded}
      onMouseEnter={() => { if (!open) setIsHovered(true); }}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => { if (!open) onOpen(); }}
    >
      <BrandRow>
        <BrandIcon>
          <TFTIcon />
        </BrandIcon>
        <BrandText $expanded={isExpanded}>
          <BrandTitle>The Asylum</BrandTitle>
          <BrandSub>TFT Tracker</BrandSub>
        </BrandText>
      </BrandRow>

      <Nav>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <NavLink key={href} href={href} $active={active} $expanded={isExpanded}>
              <NavIcon><Icon size={ICON_SIZE.lg} /></NavIcon>
              <NavLabel $expanded={isExpanded}>{label}</NavLabel>
            </NavLink>
          );
        })}
      </Nav>

      <Footer $expanded={isExpanded}>
        <FooterText>Data provided by Riot Games.</FooterText>
      </Footer>

      <CollapseBtn
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        <NavIcon>
          {open
            ? <PanelLeftClose size={ICON_SIZE.lg} />
            : <PanelLeftOpen size={ICON_SIZE.lg} />
          }
        </NavIcon>
        <CollapseBtnLabel $expanded={isExpanded}>
          {open ? "Collapse" : "Expand"}
        </CollapseBtnLabel>
      </CollapseBtn>
    </Aside>
  );
}
