import {
  getTheme,
  intervalTimer,
  paletteMode,
  paletteToTokens,
  systemThemePollMs,
  watchSystemTheme,
  type SystemPalette,
  type SystemThemeTimer,
  type Theme,
} from "./index.js";

export const nightPalette: SystemPalette = {
  background: "#1B1B1F",
  foreground: "#E4E4E7",
  accent: "#B49CFF",
  muted: "#26262C",
  border: "#3A3A42",
  danger: "#E5484D",
  selection: "#B49CFF3D",
};

export const paperPalette: SystemPalette = {
  background: "#F4F1EA",
  foreground: "#1F1D1A",
  accent: "#6A45F0",
  muted: "#E8E3D8",
  border: "#CFC8B8",
  danger: "#B3261E",
  selection: "#6A45F03D",
};

export const followPalette = (palette: SystemPalette): Theme =>
  paletteToTokens(palette, getTheme(paletteMode(palette) ?? "light"));

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

export const followDesktop = (
  read: () => SystemPalette | undefined,
  onChange: (theme: Theme) => void,
  {
    base = getTheme("light"),
    timer = intervalTimer,
  }: {
    readonly base?: Theme;
    readonly timer?: SystemThemeTimer;
  } = {},
): (() => void) =>
  watchSystemTheme({
    read,
    base,
    baseFor: (palette) => getTheme(paletteMode(palette) ?? base.mode),
    onChange,
    every: systemThemePollMs,
    timer,
  });
