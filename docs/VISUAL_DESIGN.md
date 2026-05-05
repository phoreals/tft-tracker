# Visual Design

## Theme Origin

The visual design is cherry-picked from `tft-tracker-alt`, a Vite+React prototype that used a League of Legends "Hextech" aesthetic. The theme has been ported into a structured styled-components design token system.

## Design Token Architecture

Tokens live in `styles/tokens.ts` and follow a three-layer hierarchy:

```
Primitive → Semantic → Component
```

### Primitive Layer
Raw values with no UI meaning. Never import directly into components.

**Color palette:**
- **Gold ramp**: `gold100` (#fffbf0) through `gold500` (#a68b4b) — primary accent
- **Cyan ramp**: `cyan100` (#ccfefe) through `cyan500` (#00fbfb) — info/secondary accent
- **Purple**: `purple300` (#e4b9ff) — highlights
- **Feedback**: `red400` (#f87171) danger, `green400` (#34d399) success
- **Neutrals**: `neutral0` (#fff) through `neutral1000` (#000) — 12-step dark scale

**Typography:**
- Display: `Space Grotesk` — headings, labels, data values
- Body: `Manrope` — paragraph text, descriptions

**Spacing scale**: 4px (`2xs`) through 64px (`3xl`)

**Radius**: 4px (`sm`) through 12px (`xl`), plus `full` = `9999px` for pill shapes and circular scrollbar thumbs

**Font sizes**: `2xs` 8px, `xs` 10px, `sm` 12px, `md` 14px, `base` 16px, `lg` 18px, `xl` 24px, `2xl` 30px, `3xl` 36px, `4xl` 48px

**Breakpoints**: `sm` 640px, `md` 768px, `lg` 1024px

### Semantic Layer
Maps primitives to UI roles. This is what components reference.

**Surfaces**: `bgPrimary` (page), `bgElevated` (sidebar), `bgCard` (glass cards), `bgHover`, `bgInput`

**Text hierarchy**: `textPrimary` → `textSecondary` → `textMuted` → `textDisabled`

**Accent system**: `accent` (gold), `accentDark`, `accentHover`

**Interactive background layers** (for hover/active states on chips, links, buttons):
- `accentBgSubtle` — 6% gold opacity: ghost button `:active`, leader row highlight, card `:active`
- `accentBgHover` — 8% gold opacity: chip/link hover background
- `accentBgActive` — 12% gold opacity: chip/link `:active` (pressed)

**Feedback**: `info` (cyan), `success` (green), `danger` (red), `highlight` (purple)

**Borders**: `borderSubtle` (10% opacity) → `borderDefault` (20%) → `borderHover` (40%)

**Shadows**: `glassInset` (card inner glow), `glowGold`, `glowCyan`, `buttonGold`

**Chart-specific semantic colors**: `chartGrid` (7% gold), `chartHighlight` (8% gold fill for week reference area), `chartStroke` (25% gold stroke)

**Typography presets** (spread into styled-components):
- `heading`: display font, bold, uppercase, tight tracking
- `label`: display font, 12px, bold, uppercase, wide tracking (0.15em)
- `data`: display font, 14px, medium, slight tracking
- `body`: body font, regular

### Component Layer
Pre-composed values for specific UI patterns:
- `glassCard`: bg, border, shadow, radius, padding (24px desktop), backdrop blur. Cards use 12px padding on mobile (`spacing.sm`), switching to the token value at the `md` breakpoint.
- `sidebar`: width (224px), collapsedWidth (56px), bg, border color
- `bottomNav`: height (64px), bg
- `table`: header bg, row hover bg, border color
- `input`: bg, border color, focus border color
- `progressBar`: track bg, height (4px)

## Glassmorphism Pattern

The signature visual effect. Used by `GlassCard` and navigation:

```css
background: rgba(12, 20, 30, 0.7);       /* semi-transparent dark surface */
backdrop-filter: blur(24px);              /* blur content behind */
border: 1px solid rgba(229, 197, 135, 0.2); /* subtle gold border */
box-shadow: inset 0 0 20px rgba(229, 197, 135, 0.05); /* warm inner glow */
```

The sticky tab bar uses a lighter variant — no background color, `backdrop-filter: blur(16px)`, a gold `border-bottom`, and a `box-shadow: 0 4px 16px rgba(229, 197, 135, 0.06)` glow. This lets page content show through while remaining visually distinct.

## Color Usage Rules

| Context | Color | Token |
|---------|-------|-------|
| Page background | Dark navy #0c141e | `semantic.color.bgPrimary` |
| Card background | Translucent dark | `semantic.color.bgCard` |
| Primary text | Light blue-white #dbe3f2 | `semantic.color.textPrimary` |
| Labels & headings | Same as primary but uses `label` preset | `semantic.typography.label` |
| Muted/secondary text | Warm gray 60% opacity | `semantic.color.textMuted` |
| Primary accent | Gold #e5c587 | `semantic.color.accent` |
| Data highlights | Cyan #00fbfb | `semantic.color.info` |
| Errors / delete | Red #f87171 | `semantic.color.danger` |
| Progress bars | Gold fill on dark track | `accent` on `progressBar.trackBg` |
| Rank text (table) | Per-tier color (10 distinct values) | `getRankColor(tier)` from `lib/utils.ts` |
| Profile icon border (player cards) | Per-tier color at 40% opacity | `getRankColor(tier)` |
| Profile icon border (drilldown header) | Per-tier color at 40% opacity | `getRankColor(tier)` |
| Player card row borders | Uniform dim border, gold on hover | `borderDim` / `borderHover` |

## Rank Color Palette

Defined in `RANK_COLORS` in `lib/utils.ts`. Used by `getRankColor(tier?)` which returns the appropriate hex or a muted fallback for unranked. Applied to rank text in the player table, rank badge on the player drilldown page, and diamond border on player cards.

| Tier | Hex | Visual intent |
|------|-----|---------------|
| Iron | `#9badb8` | Cool steel gray |
| Bronze | `#c8865a` | Warm copper |
| Silver | `#aabacb` | Light silver-blue |
| Gold | `#e5c587` | App's primary gold accent |
| Platinum | `#38d5c5` | Teal |
| Emerald | `#3dd490` | Bright green |
| Diamond | `#7ab5f5` | Sky blue |
| Master | `#c084fc` | Purple |
| Grandmaster | `#f07878` | Coral red |
| Challenger | `#88e8f0` | Bright cyan |

All colors are tuned for legibility on the `#0c141e` dark navy background, loosely inspired by Riot's official rank imagery.

## Body Background

The page has two subtle radial gradients on top of the dark navy:
- Top-left: gold at 5% opacity
- Bottom-right: cyan at 3% opacity

This creates a faint warm-cool diagonal that adds depth without distraction.

## Custom Scrollbar

Styled to match the theme: gold thumb (20% opacity, 40% on hover) on a dark track. Width: 6px.

## Sidebar Brand

The sidebar header displays an inline SVG of the TFT favicon (the 8-point star path defined in `app/icon.tsx`) followed by a brand text block. The SVG path is duplicated in `components/Sidebar.tsx` as `TFT_ICON_PATH`. Brand title is "THE ASYLUM" (uppercase, not italic) in the display font at 14px; subtitle is "TFT Tracker" in `2xs` (8px) muted text.

When the sidebar is expanded (224px wide): icon is 20px, brand text fades in. When collapsed (56px): icon grows to 24px to fill the strip, brand text hides. Navigation icons follow the same pattern — 20px when expanded, 24px when collapsed.

## Scroll Affordance

Horizontally scrollable containers (tab bars, player performance table) use conditional `mask-image` gradients on both left and right edges (48px each) to signal remaining content. The gradients respond to scroll position via a shared `useScrollFade` hook — no left fade when fully scrolled left, no right fade when fully scrolled right. The horizontal scrollbar is invisible by default and only appears on hover (`&:hover::-webkit-scrollbar-thumb`, 3px height, gold thumb at 20% opacity).

## Animation

- **GlassCard mount**: fade in + slide up 16px (via `motion`), duration 0.25s
- **Player card hover**: slide right 4px via CSS `transform`, delete button fades in, diamond border rotates 45deg. All hover effects are wrapped in `@media (hover: hover)` so they only apply on pointer devices.
- **Sync icon**: CSS `spin` animation while syncing
- **Seed icon**: CSS `pulse` animation while seeding
- **Page transitions**: none currently (pages are separate routes)
- **Reduced motion**: `globals.css` includes a `prefers-reduced-motion: reduce` block that sets all `animation-duration` and `transition-duration` to `0.01ms` with `!important`, effectively disabling all animations for users who prefer reduced motion.

## Typography Scale

| Use | Size | Weight | Font | Transform |
|-----|------|--------|------|-----------|
| Page title | 36-48px | Bold | Display | Uppercase |
| Card title / label | 12px | Bold | Display | Uppercase, 0.15em tracking |
| Data value | 14px | Medium | Display | None |
| Stat number | 30-36px | Bold | Display | None |
| Body text | 14px | Regular | Body | None |
| Muted caption | 8-12px | Regular | Display | Uppercase |

## CHART Constants Pattern

Recharts JSX props (stroke, fill, tick objects, contentStyle) are plain object values — they cannot consume styled-components' `({ theme }) => …` injection. To keep chart styling consistent with the design system, each chart file imports the `theme` object directly from `styles/theme.ts` and collects all Recharts styling values into a `CHART` constants block at the top of the file:

```ts
import { theme } from "@/styles/theme";

const CHART = {
  grid:      theme.semantic.color.chartGrid,
  refFill:   theme.semantic.color.chartHighlight,
  refStroke: theme.semantic.color.chartStroke,
  tick: {
    fill:       theme.primitive.color.neutral200,
    fontSize:   parseInt(theme.primitive.fontSize.xs),
    fontFamily: "Space Grotesk",
  },
  tooltip: { bg, border, radius, fontFamily, fontSize, labelColor },
  gold:    theme.primitive.color.gold300,
  cyan:    theme.primitive.color.cyan500,
} as const;
```

This pattern is used in `components/RankChart.tsx` and `app/player/[puuid]/page.tsx`.

## Styled-Components Integration

All components use the theme via `${({ theme }) => theme.semantic.color.accent}`. The `ThemeProvider` wraps the app in `StyledComponentsRegistry`, which also handles SSR style injection for Next.js App Router.

Type safety is provided by `styles/styled.d.ts` which augments `DefaultTheme` with the full `Theme` type.
