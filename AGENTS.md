<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Coding Rules

## Before making changes
- Read the relevant `docs/` file before modifying any feature. The docs describe design intent, not just implementation.
- Read the file you are editing before suggesting changes. Do not assume structure.

## Styling
- Never hardcode colors, spacing, font sizes, or radii in components. Use theme tokens exclusively: `${({ theme }) => theme.semantic.color.accent}`.
- Token hierarchy: **primitive → semantic → component**. Components use semantic or component layer — never primitive directly.
- Recharts does not support theme functions. Import `theme` from `@/styles/theme` and use a `CHART` constants block.
- Transient styled-components props must use `$prefix` (e.g. `$active`, `$isLead`) to avoid DOM forwarding.

## React
- All hooks must be called before any early `return`. Never place `useMemo`, `useEffect`, or `useState` after a conditional return.
- Page components are `"use client"`. They fetch data via `useEffect` on mount — no server-side data fetching in page files.

## Data
- Always use `SET_START`, `SET_END`, `SET_LABEL` from `lib/utils.ts`. Never hardcode dates or set numbers.
- LP/superlative computation must go through `computePlayerStats` from `lib/utils.ts`. Do not duplicate the logic.

## Safety
- Do not modify `isMockMode()` in `lib/mock.ts`. The `NODE_ENV !== "production"` guard must stay.
- Do not remove `export const maxDuration = 60` from `api/sync/route.ts` or `api/cron/route.ts`.
- Do not increase the `slice(0, 30)` match processing cap in sync without verifying the function stays under 60s.

## Commits
- Run `npx next build` from the project root before committing. Fix all type errors and build warnings.
- Update the relevant `docs/` file in the same commit as any UX, API, or design change.
