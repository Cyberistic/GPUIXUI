/**
 * The theme context: where a primitive gets the values it draws with.
 *
 * The values live in `@gpuixui/tokens/react`'s context, the same one
 * `@gpuixui/components` reads, so a tree that mixes the two packages wraps once
 * and cannot paint two palettes. This module adds the density override and the
 * package's fail-loud rule; it owns no palette of its own.
 */

import type { ReactElement, ReactNode } from "react";
import {
  ThemeProvider as TokensThemeProvider,
  useTheme as useTokensTheme,
  useThemePresence,
} from "@gpuixui/tokens/react";
import type { Density, PrimitiveTheme } from "../core/index.js";
import { withDensity } from "./internal.js";

/** Thrown when a primitive renders with no theme provider above it. */
export class MissingThemeProviderError extends Error {
  constructor() {
    super(
      "useTheme() found no <ThemeProvider>. GPUIxUI primitives never fall back " +
        "to a default palette; wrap the tree in <ThemeProvider theme={theme}> " +
        "from this package or from @gpuixui/tokens/react.",
    );
    this.name = "MissingThemeProviderError";
  }
}

export interface ThemeProviderProps {
  /** The resolved theme. `@gpuixui/tokens` builds these (`lightTheme`, `darkTheme`). */
  readonly theme: PrimitiveTheme;
  /**
   * Resolved density metrics to use instead of `theme.density`. Density moves
   * numbers, never colours; build one with tokens' `extendTheme(theme, { density })`
   * so this package owns no second copy of the presets.
   */
  readonly density?: Density;
  readonly children: ReactNode;
}

/**
 * Provide the theme to every primitive below it, and to the shared token
 * context a component in the same tree reads.
 *
 * A component boundary, not domain logic: a missing provider is a programming
 * error (a defect), which is exactly what React's error boundary models, so it
 * throws rather than returning `Option` for every component to unwrap.
 */
export const ThemeProvider = ({
  theme,
  density,
  children,
}: ThemeProviderProps): ReactElement => (
  <TokensThemeProvider theme={withDensity(theme, density)}>
    {children}
  </TokensThemeProvider>
);

/**
 * The active theme. Fails loudly when no provider is above it.
 *
 * The token package reports presence itself (`useThemePresence`), because its
 * `useTheme` falls back to the light theme: a caller passing that theme on
 * purpose and no provider at all read the same otherwise. Either provider — this
 * one or `@gpuixui/tokens/react`'s — therefore satisfies the rule, which is what
 * lets a tree mixing the two packages wrap once.
 */
export const useTheme = (): PrimitiveTheme => {
  const theme = useTokensTheme();
  if (!useThemePresence()) throw new MissingThemeProviderError();
  return theme;
};
