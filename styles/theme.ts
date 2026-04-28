import { primitive, semantic, component } from "./tokens";

export const theme = { primitive, semantic, component } as const;

export type Theme = typeof theme;
