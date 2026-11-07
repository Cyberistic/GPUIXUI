/** @jsxImportSource react */
import { createContext, useContext, type ReactNode } from "react";
import { lightTheme, type Theme } from "./theme.js";

const ThemeContext = createContext<Theme | undefined>(undefined);

export interface ThemeProviderProps {
  readonly theme: Theme;

  readonly children?: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext) ?? lightTheme;
}

export function useThemePresence(): boolean {
  return useContext(ThemeContext) !== undefined;
}
