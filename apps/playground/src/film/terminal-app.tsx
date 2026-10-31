/**
 * The film's terminal app: the Settings block in the dark Linux look.
 * The terminal maps one pixel to one layout unit, so the theme is magnified 2×
 * for a HiDPI frame. `terminal-take.ts` runs this inside a pty and decodes the frames it paints.
 */
import { darkTheme, lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState } from "react";
import { magnify } from "./magnify.js";
import { Settings, type Look } from "@gpuixui/blocks/settings";

/** The theme the terminal paints in: the Linux look, magnified 2×. */
export const terminalTheme = (dark: boolean) =>
  magnify(platformTheme(dark ? darkTheme : lightTheme, "linux"), 2);

export const TerminalSettings = () => {
  const [look, setLook] = useState<Look>("linux");
  const [dark, setDark] = useState(true);
  return (
    <ThemeProvider
      theme={magnify(platformTheme(dark ? darkTheme : lightTheme, look), 2)}
    >
      <Settings
        look={look}
        onLookChange={setLook}
        dark={dark}
        onDarkChange={setDark}
      />
    </ThemeProvider>
  );
};
