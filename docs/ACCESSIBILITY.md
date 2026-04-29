# Accessibility

## Current State

The app has basic accessibility but is not fully audited. This document tracks what exists and what needs improvement.

## What Works

- **Semantic HTML**: tables use `<table>`, `<thead>`, `<tbody>`, `<th>`. Navigation uses `<nav>`, `<aside>`, `<main>`.
- **Form labels**: inputs in the add-player form have visible `<label>` elements.
- **Color contrast**: primary text (#dbe3f2) on dark background (#0c141e) passes WCAG AA for normal text.
- **Focus visible**: browser default focus rings are not suppressed (except on inputs which use `outline: none` with a visible border-bottom change).
- **Link navigation**: sidebar and bottom nav use Next.js `<Link>` with proper `href` attributes.
- **Button semantics**: all clickable elements use `<button>` or `<a>`, not `<div onClick>`.
- **Sidebar toggle**: the collapse button at the bottom of the sidebar has `aria-label` set to "Collapse sidebar" or "Expand sidebar" depending on state.
- **Tab bar button height**: tab bars use `align-items: stretch` on the flex container so all buttons share the same height regardless of sub-label content. Individual buttons center their text with `display: flex; align-items: center; justify-content: center`.
- **Disabled states**: buttons show `opacity: 0.5` and `cursor: not-allowed` when disabled.

## Known Issues

- **Input focus**: the `outline: none` on form inputs removes the default focus ring. The bottom-border color change (gold → cyan) is the only focus indicator. This may be insufficient for keyboard users.
- **Delete button visibility**: the trash icon on player cards is `opacity: 0` until hover. Keyboard-only users cannot see it until they tab to it (need `:focus-visible` styles).
- **Spin animation**: the syncing spinner lacks `aria-label` or status announcement.
- **Chart accessibility**: Recharts SVG charts are not screen-reader friendly. No `aria-label` or data table alternative.
- **Color-only indicators**: the rank dot (gold vs gray) and elite border (gold vs dim) rely on color alone. No shape or text alternative.
- ~~**Motion**: animations cannot be disabled via `prefers-reduced-motion`.~~ Fixed: `globals.css` now includes a `prefers-reduced-motion: reduce` block.
- **Bottom nav z-index**: content can scroll behind the fixed bottom nav on mobile; no padding compensation beyond `pb: 80px`.
- **Sidebar double-click**: double-clicking the sidebar locks it open. This is a non-standard interaction with no keyboard or ARIA equivalent; keyboard users rely solely on the collapse button at the bottom.

## Tap Targets

Touch interactions require larger hit areas than mouse interactions. All tab bar buttons and primary action buttons use `min-height: 44px` (iOS minimum recommended tap target). If adding new interactive elements, ensure they meet this minimum.

## Recommendations

1. ~~Add `prefers-reduced-motion` media query to disable motion animations.~~ Done.
2. Add `:focus-visible` styles to delete buttons and nav links.
3. Add `aria-label` to icon-only buttons (sync, delete, seed).
4. Add a visually-hidden data table as a Recharts chart alternative.
5. Ensure all interactive elements have a visible focus indicator.
6. Add `role="status"` and `aria-live="polite"` to sync status messages.
