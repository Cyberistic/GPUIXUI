import * as Option from "effect/Option";
import {
  paletteToTokens,
  type SystemPalette,
  type Theme,
} from "@gpuixui/tokens";
import { palettes } from "../palettes.js";

export const SYSTEM_THEME_IDS = {
  probe: "system-theme-probe",
  swatch: "system-theme-swatch",
  page: "system-theme-page",
  mounts: "system-theme-mounts",
} as const;

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

export const baseTheme: Theme = palettes.dark;

export const followedTheme = (palette: SystemPalette): Theme =>
  paletteToTokens(palette, baseTheme);

let desktop: Option.Option<SystemPalette> = Option.some(nightPalette);

export const readSystemPalette = (): SystemPalette | undefined =>
  Option.getOrUndefined(desktop);

export const setSystemPalette = (palette: SystemPalette): void => {
  desktop = Option.some(palette);
};

export const clearSystemPalette = (): void => {
  desktop = Option.none();
};

export const resetSystemPalette = (): void => {
  desktop = Option.some(nightPalette);
};

export const pageOf = (palette: Option.Option<SystemPalette>): string =>
  Option.match(palette, {
    onNone: () => baseTheme.colors.background,
    onSome: (some) => followedTheme(some).colors.background,
  });

export const swatchOf = (palette: Option.Option<SystemPalette>): string =>
  Option.match(palette, {
    onNone: () => baseTheme.colors.primary,
    onSome: (some) => followedTheme(some).colors.primary,
  });

export const NIGHT_PAGE = pageOf(Option.some(nightPalette));

export const NIGHT_SWATCH = swatchOf(Option.some(nightPalette));

export const PAPER_PAGE = pageOf(Option.some(paperPalette));

export const PAPER_SWATCH = swatchOf(Option.some(paperPalette));

export const BASE_PAGE = pageOf(Option.none());

export const BASE_SWATCH = swatchOf(Option.none());

export const SYSTEM_THEME_POLL_MS = 25;

let mountings = 0;

export const recordMount = (): number => ++mountings;

export const mountCount = (): number => mountings;

export const PROBE_BOX = { width: 560, height: 320 } as const;

export const SWATCH_BOX = { x: 24, y: 24, width: 240, height: 120 } as const;

export const swatchPoint = {
  x: SWATCH_BOX.x + SWATCH_BOX.width / 2,
  y: SWATCH_BOX.y + SWATCH_BOX.height / 2,
} as const;

export const pagePoint = {
  x: PROBE_BOX.width - 40,
  y: PROBE_BOX.height - 40,
} as const;

export const SYSTEM_THEME_CHECKS = 12;
