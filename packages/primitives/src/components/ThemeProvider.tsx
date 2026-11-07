/** @jsxImportSource @gpuix/react */
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
  readonly theme: PrimitiveTheme;

  readonly density?: Density | null;

  readonly messages?: MessagesSource | null;
  readonly children: ReactNode;
}

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

export const useTheme = (): PrimitiveTheme => {
  const theme = useTokensTheme();
  if (!useThemePresence()) throw new MissingThemeProviderError();
  return theme;
};
