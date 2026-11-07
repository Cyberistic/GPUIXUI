/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
  useTheme,
} from "../src/internal/theme.js";
import { ThemeToggler } from "../src/theme-toggler.js";
import type { ThemeMode } from "../src/theme-toggler/logic.js";

const Surface = ({
  mode,
  onChange,
}: {
  readonly mode: ThemeMode;
  readonly onChange: (mode: ThemeMode) => void;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        color: theme.colors.cardForeground,
      }}
    >
      <ThemeToggler mode={mode} onChange={onChange} />
      <text style={{ color: theme.colors.cardForeground }}>{mode} theme</text>
      <ThemeToggler mode={mode} onChange={onChange} size="lg" level="none" />
    </div>
  );
};

export const ThemeTogglerExample = () => {
  const [mode, setMode] = useState<ThemeMode>("dark");

  return (
    <ThemeProvider theme={mode === "dark" ? darkTheme : lightTheme}>
      <Surface mode={mode} onChange={setMode} />
    </ThemeProvider>
  );
};
