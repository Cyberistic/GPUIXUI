import {
  alpha,
  alphaOf,
  namesColour,
  themeColors,
  type ThemeColors,
} from "./color.js";
import { contrastRatio } from "./contrast.js";
import { pageMode } from "./luminance.js";
import {
  isThemeMode,
  themeContrastOf,
  themeModeOf,
  type ThemeMode,
} from "./mode.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";

export interface SystemPalette {
  readonly mode?: unknown;

  readonly background?: string;

  readonly foreground?: string;

  readonly accent?: string;

  readonly muted?: string;

  readonly border?: string;

  readonly danger?: string;

  readonly selection?: string;
}

const baseRoles = (base: Theme): ThemeColors => ({
  ...getTheme(themeModeOf(base), themeContrastOf(base)).colors,
  ...themeColors(base),
});

const inkOn = (
  fill: string,
  inks: ReadonlyArray<string | undefined>,
  roles: ThemeColors,
): string => {
  const measured = inks.filter(namesColour);
  const candidates =
    measured.length > 0 ? measured : [roles.foreground, roles.background];
  return candidates.reduce((best, candidate) =>
    (contrastRatio(candidate, fill) ?? 0) > (contrastRatio(best, fill) ?? 0)
      ? candidate
      : best,
  );
};

const colour = (value: string | undefined): string | undefined =>
  namesColour(value) ? value : undefined;

export function paletteMode(palette: SystemPalette): ThemeMode | undefined {
  const { background, mode } = palette;
  return isThemeMode(mode) ? mode : pageMode(background);
}

const selectionWash = (selection: string, roles: ThemeColors): string =>
  alphaOf(selection) < 1
    ? selection
    : alpha(selection, alphaOf(roles.selection));

export function paletteToTokens(
  palette: SystemPalette,
  base: Theme = getTheme(paletteMode(palette) ?? "light"),
): Theme {
  const roles = baseRoles(base);

  const background = colour(palette.background);
  const foreground = colour(palette.foreground);
  const muted = colour(palette.muted);
  const border = colour(palette.border);
  const accent = colour(palette.accent);
  const danger = colour(palette.danger);
  const selection = colour(palette.selection);

  const inks = [foreground, background] as const;
  const colors: Partial<ThemeColors> = {
    ...(background === undefined ? {} : { background }),
    ...(foreground === undefined ? {} : { foreground }),
    ...(muted === undefined
      ? {}
      : {
          muted,
          mutedForeground: inkOn(muted, inks, roles),
        }),
    ...(border === undefined ? {} : { border }),
    ...(accent === undefined
      ? {}
      : {
          primary: accent,
          primaryForeground: inkOn(accent, inks, roles),
        }),
    ...(danger === undefined
      ? {}
      : {
          destructive: danger,
          destructiveForeground: inkOn(danger, inks, roles),
        }),
    ...(selection === undefined
      ? {}
      : { selection: selectionWash(selection, roles) }),
  };
  return extendTheme(base, { colors });
}

export interface SystemThemeTimer {
  readonly poll: (every: number, tick: () => void) => () => void;
}

export const intervalTimer: SystemThemeTimer = {
  poll: (every, tick) => {
    const handle = setInterval(tick, every);
    return () => clearInterval(handle);
  },
};

export const systemThemePollMs = 2000;

const maxTimerMs = 2 ** 31 - 1;

const paceOf = (every: number): number =>
  Number.isFinite(every) && every >= 1 && every <= maxTimerMs
    ? every
    : systemThemePollMs;

export interface WatchSystemThemeOptions {
  readonly read: () => SystemPalette | undefined;

  readonly base: Theme;

  readonly baseFor?: (palette: SystemPalette) => Theme;

  readonly onChange: (theme: Theme) => void;

  readonly every: number;

  readonly timer?: SystemThemeTimer;
}

const paletteFields = [
  "mode",
  "background",
  "foreground",
  "accent",
  "muted",
  "border",
  "danger",
  "selection",
] as const satisfies readonly (keyof SystemPalette)[];

const samePalette = (
  left: SystemPalette | undefined,
  right: SystemPalette | undefined,
): boolean =>
  left === undefined || right === undefined
    ? left === right
    : paletteFields.every((field) => left[field] === right[field]);

const snapshot = (palette: SystemPalette): SystemPalette =>
  Object.assign({}, palette);

export function watchSystemTheme(options: WatchSystemThemeOptions): () => void {
  const { read, base, baseFor, onChange, timer = intervalTimer } = options;

  const every = paceOf(options.every);
  let delivered = false;
  let applied: SystemPalette | undefined;
  const tick = (): void => {
    const palette = read();
    if (delivered && samePalette(applied, palette)) {
      return;
    }
    onChange(
      palette === undefined
        ? base
        : paletteToTokens(palette, baseFor?.(palette) ?? base),
    );

    applied = palette === undefined ? undefined : snapshot(palette);
    delivered = true;
  };
  tick();
  return timer.poll(every, tick);
}
