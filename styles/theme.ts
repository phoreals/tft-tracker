import { primitive, semantic, component } from "./tokens";

export const theme = { primitive, semantic, component } as const;

export type Theme = typeof theme;

// Icon size scale — numeric values for Lucide `size` props and CSS px values.
// Use these instead of hardcoded numbers so all icon sizes stay relational.
export const ICON_SIZE = {
  xs:     12, // tiny inline indicators
  sm:     14, // compact contexts: back button, drilldown stat cards
  md:     16, // standard: stat cards, card headers, buttons, table cells
  nav:    20, // navigation items: sidebar, bottom nav, delete button
  lg:     24, // display: lock screen, large standalone icons
  avatar: 32, // profile picture container (SummonerIcon in table)
} as const;
