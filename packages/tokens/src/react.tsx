/** @jsxImportSource react */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { mixThemes } from "./crossfade.js";
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

export function useThemeCrossfade(theme: Theme, durationMs = 450): Theme {
  const from = useRef(theme);
  const [current, setCurrent] = useState(theme);
  useEffect(() => {
    if (from.current === theme) return;
    const start = from.current;
    const began = performance.now();
    const omega = (Math.PI * 2) / (durationMs / 1000);
    const timer = setInterval(() => {
      const elapsed = (performance.now() - began) / 1000;
      const k = 1 - (1 + omega * elapsed) * Math.exp(-omega * elapsed);
      const done = elapsed * 1000 >= durationMs * 2;
      from.current = done ? theme : from.current;
      setCurrent(done ? theme : mixThemes(start, theme, k));
      if (done) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [theme, durationMs]);
  return current;
}
