/** @jsxImportSource react */
/**
 * The React binding: a context provider and the hooks that read it.
 *
 * The pragma above is deliberate. A consumer that compiles this file from source
 * with its own `jsxImportSource` — the component packages compile their JSX
 * through `@gpuix/react` — would otherwise resolve *this* file's JSX runtime from
 * that package, which they have and this package does not. The pragma pins the
 * file to React's runtime wherever it is compiled, so no consumer needs a path
 * mapping or a hoisted copy.
 */

import { createContext, useContext, type ReactNode } from "react";
import { lightTheme, type Theme } from "./theme.js";

/**
 * The nearest theme, or `undefined` when nothing supplies one. The absence is
 * what {@link useThemePresence} reads: a default of `lightTheme` would make a
 * provider passing the light theme indistinguishable from no provider at all.
 */
const ThemeContext = createContext<Theme | undefined>(undefined);

/** Props for {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** The resolved theme for this subtree. */
  readonly theme: Theme;
  /** The subtree that reads the theme. */
  readonly children?: ReactNode;
}

/**
 * Supply a theme to descendant hooks. Nested providers scope a brand theme to
 * a subtree. Without a provider, {@link useTheme} returns the light theme.
 *
 * There is no OS appearance detection: GPUix exposes no appearance query, so
 * the application owns the mode switch and passes the resolved theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** Read the nearest theme, or the light theme when no provider exists. */
export function useTheme(): Theme {
  return useContext(ThemeContext) ?? lightTheme;
}

/**
 * Whether a {@link ThemeProvider} is above this hook.
 *
 * {@link useTheme} has a usable fallback, so a consumer that falls back cannot
 * tell a caller's light theme from no provider at all. A package with its own
 * fail-loud rule — `@gpuixui/primitives` refuses to paint a default palette —
 * reads this instead and can accept a token provider as satisfying it.
 *
 * @example
 * ```tsx
 * const provided = useThemePresence();
 * if (!provided) throw new MissingThemeProviderError();
 * ```
 */
export function useThemePresence(): boolean {
  return useContext(ThemeContext) !== undefined;
}
