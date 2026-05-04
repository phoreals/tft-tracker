# Accessibility

## Current State

The app has basic accessibility but is not fully audited. This document tracks what exists and what needs improvement.

## What Works

- **Semantic HTML**: tables use `<table>`, `<thead>`, `<tbody>`, `<th>`. Navigation uses `<nav>`, `<aside>`, `<main>`.
- **Form labels**: inputs in the add-player form have visible `<label>` elements.
- **Color contrast**: primary text (#dbe3f2) on dark background (#0c141e) passes WCAG AA for normal text.
- **Focus visible**: all interactive elements have a consistent gold `outline: 2px solid accent; outline-offset: 2px` on `:focus-visible`. This covers: sort pills, card links, table column headers, tab buttons, view toggle buttons, legend chips, sync/seed/delete buttons, player chips, and superlative card links. Chart SVGs show a gold focus ring on `svg:focus`.
- **Link navigation**: sidebar and bottom nav use Next.js `<Link>` with proper `href` attributes.
- **Button semantics**: all clickable elements use `<button>` or `<a>`, not `<div onClick>`.
- **Sidebar toggle**: the collapse button at the bottom of the sidebar has `aria-label` set to "Collapse sidebar" or "Expand sidebar" depending on state.
- **Tab bar ARIA**: the desktop tab bar has `role="tablist"`, each tab has `role="tab"`, `type="button"`, and `aria-selected`.
- **Table sort ARIA**: sortable table column headers (`<th>`) have `tabIndex={0}`, `aria-sort`, and `onKeyDown` handlers for Enter/Space activation.
- **Delete button**: visible on `:focus-visible` with `opacity: 1` and a danger-colored outline. Has `aria-label="Remove {playerName}"`.
- **Sync overlay**: uses `role="alert"` + `aria-live="assertive"` for errors, `role="status"` + `aria-live="polite"` for success/info. Copy and dismiss buttons have `aria-label`.
- **Rank emblems**: all `<img>` elements for tier emblems have `alt={tier}` (e.g. "DIAMOND").
- **Tab bar button height**: tab bars use `align-items: stretch` on the flex container so all buttons share the same height regardless of sub-label content. Individual buttons center their text with `display: flex; align-items: center; justify-content: center`.
- **Disabled states**: buttons show `opacity: 0.5` and `cursor: not-allowed` when disabled.
- **Reduced motion**: `globals.css` includes a `prefers-reduced-motion: reduce` block.
- **Player chip tooltips**: homepage superlative player chips have `title` attributes showing the full `gameName#tagLine` when text is truncated.

## Touch / Mobile

- **Chart scroll**: all chart containers use `touch-action: pan-y` so vertical page scrolling is not hijacked by chart touch interactions.
- **RankChart tooltip dismissal**: `onTouchEnd` clears tooltip position and hover state when the user lifts their finger.
- **Scatter & pie charts**: use Recharts' built-in tooltip positioning which handles touch tap/dismiss natively.
- **Tap targets**: all tab bar buttons and primary action buttons use `min-height: 44px` (iOS minimum recommended tap target).

## Known Issues

- **Input focus**: the `outline: none` on form inputs removes the default focus ring. The bottom-border color change (gold → cyan) is the only focus indicator. This may be insufficient for keyboard users.
- **Spin animation**: the syncing spinner lacks `aria-label` or status announcement.
- **Chart accessibility**: Recharts SVG charts are not screen-reader friendly. No `aria-label` or data table alternative.
- **Bottom nav z-index**: content can scroll behind the fixed bottom nav on mobile; no padding compensation beyond `pb: 80px`.
- **Sidebar double-click**: double-clicking the sidebar locks it open. This is a non-standard interaction with no keyboard or ARIA equivalent; keyboard users rely solely on the collapse button at the bottom.

## Recommendations

1. Add a visually-hidden data table as a Recharts chart alternative.
2. Add `aria-label` to the syncing spinner for screen reader announcements.
