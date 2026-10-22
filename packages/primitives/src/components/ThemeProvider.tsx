/**
 * The theme context: where a primitive gets the values it draws with.
 *
 * The values live in `@gpuixui/tokens/react`'s context, the same one
 * `@gpuixui/components` reads, so a tree that mixes the two packages wraps once
 * and cannot paint two palettes. This module adds the density override and the
 * package's fail-loud rule; it owns no palette of its own.
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ThemeProvider as TokensThemeProvider,
  useTheme as useTokensTheme,
} from "@gpuixui/tokens/react";
import type { Density, PrimitiveTheme } from "../core/index.js";
import { withDensity } from "./internal.js";

/**
 * Whether this package's provider is above the component.
 *
 * A presence marker, not a second theme: the token provider falls back to the
 * light theme when nothing supplies one, and a primitive must not mistake that
 * fallback for a caller's choice.
 */
const Provided = createContext(false);

/** Thrown when a primitive renders without this package's `ThemeProvider`. */
export class MissingThemeProviderError extends Error {
  constructor() {
    super(
      "useTheme() found no <ThemeProvider>. GPUIxUI primitives never fall back " +
        "to a default palette; wrap the tree in <ThemeProvider theme={theme}>.",
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
    <Provided.Provider value>{children}</Provided.Provider>
  </TokensThemeProvider>
);

/** The active theme. Fails loudly when this package's provider is absent. */
export const useTheme = (): PrimitiveTheme => {
  const theme = useTokensTheme();
  const provided = useContext(Provided);
  if (!provided) throw new MissingThemeProviderError();
  return theme;
};
