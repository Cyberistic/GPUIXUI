/**
 * Following a system palette, as an application does it. Executed by
 * `system-theme.test.ts`, so the call site the catalogue documents is a real
 * one.
 */

import {
  getTheme,
  paletteMode,
  paletteToTokens,
  watchSystemTheme,
  type SystemPalette,
  type SystemThemeTimer,
  type Theme,
} from "./index.js";

/** A dark desktop theme: a near-black page, a pale ink and a violet accent. */
export const nightPalette: SystemPalette = {
  background: "#1B1B1F",
  foreground: "#E4E4E7",
  accent: "#B49CFF",
  muted: "#26262C",
  border: "#3A3A42",
  danger: "#E5484D",
  selection: "#B49CFF3D",
};

/** A paper-coloured desktop theme: a warm page, near-black ink, a deep accent. */
export const paperPalette: SystemPalette = {
  background: "#F4F1EA",
  foreground: "#1F1D1A",
  accent: "#6A45F0",
  muted: "#E8E3D8",
  border: "#CFC8B8",
  danger: "#B3261E",
  selection: "#6A45F03D",
};

/**
 * The theme a palette produces: the built-in theme of the mode the palette's own
 * page implies, wearing the palette's roles.
 */
export const followPalette = (palette: SystemPalette): Theme =>
  paletteToTokens(palette, getTheme(paletteMode(palette) ?? "light"));

/** A timer a caller drives by hand — a test, or an application with its own scheduler. */
export const manualTimer = (): {
  readonly timer: SystemThemeTimer;
  readonly tick: () => void;
  readonly stopped: () => boolean;
} => {
  let tick = (): void => {};
  let stopped = false;
  const timer: SystemThemeTimer = {
    poll: (_every, next) => {
      tick = next;
      return () => {
        stopped = true;
      };
    },
  };
  return {
    timer,
    tick: () => {
      tick();
    },
    stopped: () => stopped,
  };
};

/** An application following the desktop: one call, one applied theme. */
export const followDesktop = (
  read: () => SystemPalette | undefined,
  onChange: (theme: Theme) => void,
): (() => void) =>
  watchSystemTheme({
    read,
    base: getTheme("light"),
    onChange,
    every: 2000,
    timer: manualTimer().timer,
  });
