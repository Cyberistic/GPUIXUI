/**
 * The mount boundary and the only place this example executes anything.
 *
 * `--terminal` (or `GPUIX_TERMINAL=1`) paints the same tree into kitty/Ghostty;
 * the window options are the shell's native chrome on macOS and the theme's
 * initial appearance. `--dark` / `GPUIX_DARK=1` starts in the dark look.
 */

import { render } from "@gpuix/react";
import { nativeWindowOptions } from "@gpuixui/shell";
import { currentPlatform, darkTheme, lightTheme } from "@gpuixui/tokens";
import { CalculatorApp } from "./App.js";

const argv = process.argv.slice(2);
const dark = argv.includes("--dark") || process.env.GPUIX_DARK === "1";
const terminal =
  argv.includes("--terminal") || process.env.GPUIX_TERMINAL === "1";

render(<CalculatorApp initialDark={dark} />, {
  title: "Slang",
  appName: "Slang",
  width: 1060,
  height: 760,
  minWidth: 860,
  minHeight: 620,
  terminal,
  ...nativeWindowOptions(dark ? darkTheme : lightTheme, currentPlatform),
});
