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

**Radius**: 4px (`sm`) through 12px (`xl`)

**Breakpoints**: `md` 768px, `lg` 1024px

### Semantic Layer
Maps primitives to UI roles. This is what components reference.

**Surfaces**: `bgPrimary` (page), `bgElevated` (sidebar), `bgCard` (glass cards), `bgHover`, `bgInput`

**Text hierarchy**: `textPrimary` → `textSecondary` → `textMuted` → `textDisabled`

**Accent system**: `accent` (gold), `accentDark`, `accentHover`

**Feedback**: `info` (cyan), `success` (green), `danger` (red), `highlight` (purple)

**Borders**: `borderSubtle` (10% opacity) → `borderDefault` (20%) → `borderHover` (40%)

**Shadows**: `glassInset` (card inner glow), `glowGold`, `glowCyan`, `buttonGold`

**Typography presets** (spread into styled-components):
- `heading`: display font, bold, uppercase, tight tracking
- `label`: display font, 12px, bold, uppercase, wide tracking (0.15em)
- `data`: display font, 14px, medium, slight tracking
- `body`: body font, regular

### Component Layer
Pre-composed values for specific UI patterns:
- `glassCard`: bg, border, shadow, radius, padding (24px desktop), backdrop blur. Cards use 16px padding on mobile, switching to the token value at the `md` breakpoint.
- `sidebar`: width (224px), bg, border color
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
| Rank indicators | Gold dot (ranked) or gray dot (unranked) | `accentDark` / `textDisabled` |
| Elite player borders | Gold 20% → 50% on hover | `borderDefault` / `borderHover` |
| Normal player borders | White 5% → cyan 30% on hover | `borderDim` / `borderInfo` |

## Body Background

The page has two subtle radial gradients on top of the dark navy:
- Top-left: gold at 5% opacity
- Bottom-right: cyan at 3% opacity

This creates a faint warm-cool diagonal that adds depth without distraction.

## Custom Scrollbar

Styled to match the theme: gold thumb (20% opacity, 40% on hover) on a dark track. Width: 6px.

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
| Muted caption | 9-11px | Regular | Display | Uppercase |

## Styled-Components Integration

All components use the theme via `${({ theme }) => theme.semantic.color.accent}`. The `ThemeProvider` wraps the app in `StyledComponentsRegistry`, which also handles SSR style injection for Next.js App Router.

Type safety is provided by `styles/styled.d.ts` which augments `DefaultTheme` with the full `Theme` type.
