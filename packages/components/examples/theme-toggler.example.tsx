/**
 * ThemeToggler example: the control re-provides the theme it reports.
 *
 * The toggler owns no theme; the screen does. The first control is the shipped
 * arrangement — a press reports the other mode and the screen provides that
 * theme, so the whole surface below it repaints. The second is the same control
 * at `lg` with its entrance removed, for a toolbar that should not move when the
 * pointer reaches it.
 */

import { useState } from "react";
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
  useTheme,
} from "../src/internal/theme.js";
import { ThemeToggler } from "../src/theme-toggler.js";
import type { ThemeMode } from "../src/theme-toggler/logic.js";

/** The surface a press repaints: it reads the theme the screen provides. */
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

/** A theme switch that repaints the surface it controls. */
export const ThemeTogglerExample = () => {
  const [mode, setMode] = useState<ThemeMode>("dark");

  return (
    <ThemeProvider theme={mode === "dark" ? darkTheme : lightTheme}>
      <Surface mode={mode} onChange={setMode} />
    </ThemeProvider>
  );
};
