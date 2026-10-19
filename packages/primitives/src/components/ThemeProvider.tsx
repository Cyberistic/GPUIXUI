/**
 * The theme context: where a primitive gets the values it draws with.
 *
 * There is deliberately **no default theme**. A component that silently invents
 * a palette is how two design systems end up in one application, and the second
 * one is always wrong in dark mode. So a primitive without a provider above it
 * fails with an error that names the provider, at the moment it renders.
 *
 * `@gpuixui/components` reads `@gpuixui/tokens/react`'s separate context, so an
 * app composing both packages mounts both providers with the same theme — see
 * "Composing with `@gpuixui/components`" in this package's README. The provider
 * also mounts the native-focus tracker (`native-focus.tsx`): the pinned runtime
 * moves focus without dispatching the events a ring is painted from (plan
 * `583`), so every primitive under one provider samples the renderer instead
 * (plan `590`).
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Density, PrimitiveTheme } from "../core/index.js";
import { withDensity } from "./internal.js";
import { NativeFocusProvider } from "./native-focus.js";

const ThemeContext = createContext<PrimitiveTheme | null>(null);

/** Thrown when a primitive renders outside a `ThemeProvider`. */
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
 * Provide the theme to every primitive below it.
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
  <ThemeContext.Provider value={withDensity(theme, density)}>
    <NativeFocusProvider>{children}</NativeFocusProvider>
  </ThemeContext.Provider>
);

/** The active theme. Fails loudly when there is no provider. */
export const useTheme = (): PrimitiveTheme => {
  const theme = useContext(ThemeContext);
  if (theme === null) throw new MissingThemeProviderError();
  return theme;
};
