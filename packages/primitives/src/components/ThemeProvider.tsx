/** @jsxImportSource @gpuix/react */
/**
 * The theme context: where a primitive gets the values it draws with.
 *
 * The values live in `@gpuixui/tokens/react`'s context, the same one
 * `@gpuixui/components` reads, so a tree that mixes the two packages wraps once
 * and cannot paint two palettes. This module adds the density override, the
 * words seam (`messages`) and the package's fail-loud rule; it owns no palette
 * of its own.
 */

import type { ReactElement, ReactNode } from "react";
import {
  ThemeProvider as TokensThemeProvider,
  useTheme as useTokensTheme,
  useThemePresence,
} from "@gpuixui/tokens/react";
import type { MessagesSource } from "../core/messages.js";
import type { Density, PrimitiveTheme } from "../core/index.js";
import { withDensity } from "./internal.js";
import { MessagesProvider } from "./MessagesProvider.js";

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
   *
   * A stored override is decoded JSON: `null` is the field a settings record
   * never carried, so it is **no override** — the theme's own density stands,
   * rather than being replaced by a hole that painted the library's metrics
   * (and that a consumer reading `theme.density` directly could not read at all).
   */
  readonly density?: Density | null;
  /**
   * The words the controls below announce — a localised interface's copy. A
   * stored table is the shape a settings record holds ([`MessagesSource`]), and
   * a group's rows merge with the table above, so a group left out, written
   * `undefined` or written `null` keeps it; `MessagesProvider` does the merge,
   * so a nested provider can extend a table instead of replacing it.
   */
  readonly messages?: MessagesSource | null;
  readonly children: ReactNode;
}

/**
 * Provide the theme to every primitive below it, and to the shared token
 * context a component in the same tree reads.
 *
 * A component boundary, not domain logic: a missing provider is a programming
 * error (a defect), which is exactly what React's error boundary models, so it
 * throws rather than returning `Option` for every component to unwrap. The
 * words an interface announces ride the same wrapper (`messages`), because a
 * caller wrapping a tree once should not have to wrap it twice for copy.
 */
export const ThemeProvider = ({
  theme,
  density,
  messages,
  children,
}: ThemeProviderProps): ReactElement => (
  <TokensThemeProvider theme={withDensity(theme, density)}>
    <MessagesProvider messages={messages}>{children}</MessagesProvider>
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
