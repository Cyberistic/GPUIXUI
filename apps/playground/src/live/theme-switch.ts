import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { platformTheme, type PlatformName, type Theme } from "@gpuixui/tokens";
import { paletteIds, palettes, type PaletteId } from "../palettes.js";
import type { Point } from "./frame.js";

export const paletteCycle: ReadonlyArray<PaletteId> = paletteIds;

export const platformCycle: ReadonlyArray<PlatformName> = [
  "default",
  "darwin",
  "linux",
  "win32",
];

export const nextPlatformInCycle: Readonly<Record<PlatformName, PlatformName>> =
  {
    default: "darwin",
    darwin: "linux",
    linux: "win32",
    win32: "default",
  };

export const themeFor = (palette: PaletteId, platform: PlatformName): Theme =>
  platformTheme(palettes[palette], platform);

export const THEME_PAGE = { width: 600, height: 420 } as const;

export const THEME_CARD = { width: 400, height: 160 } as const;

export const THEME_CONTROL_WIDTH = 160;

export const THEME_PAGE_PADDING = 16;

export const THEME_CARD_PADDING = 16;

export const THEME_SAMPLE_INSET = 8;

export const themePagePoint = (page: Smoke.Bounds): Point => ({
  x: page.x + THEME_SAMPLE_INSET,
  y: page.y + page.height - THEME_SAMPLE_INSET,
});

export const themeCardPoint = (card: Smoke.Bounds): Point => ({
  x: card.x + card.width - THEME_SAMPLE_INSET,
  y: card.y + card.height / 2,
});

export const roleColour = (
  theme: Theme,
  role: "background" | "card",
): Option.Option<Pixels.Rgba> =>
  Option.fromNullishOr(Pixels.hexToRgba(theme.colors[role]));

export const sameColour: (left: Pixels.Rgba, right: Pixels.Rgba) => boolean =
  Schema.toEquivalence(Pixels.Rgba);

export const controlHeight = (theme: Theme): number =>
  theme.density.controlHeight.md;

export const themeSwitchReadout = (
  palette: PaletteId,
  platform: PlatformName,
  theme: Theme,
): string =>
  `palette=${palette} platform=${platform} h=${controlHeight(theme)}`;
