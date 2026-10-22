/**
 * The theme-switch measurement: what a **window** does when the provider's value
 * changes.
 *
 * The headless theme gallery proves the token layer through the runtime's style
 * report. A window's renderer reports no style, so the only evidence of a switch
 * is the frame plus the layout: a role's fill read at a point nothing else
 * paints, and the height of an `md` control, which the theme's density owns.
 *
 * The probe walks the three palettes and every platform style. The palette
 * proves the repaint and the platform proves the **re-layout** — compact 28px,
 * comfortable 32px, spacious 36px — which is the half a colour-only theme
 * switch would miss. `applyStyle` reserves a high-contrast base's palette while
 * still applying the look's density, so the probe switches platform with the
 * high-contrast palette selected and expects the height to move and the page
 * not to.
 *
 * The palette cycle is the shell's own (`../palettes.ts`), so the probe cannot
 * prove a switch the playground never offers.
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { platformTheme, type PlatformName, type Theme } from "@gpuixui/tokens";
import { paletteIds, palettes, type PaletteId } from "../palettes.js";
import type { Point } from "./frame.js";

/** The thread a palette press walks, starting at the shell's default. */
export const paletteCycle: ReadonlyArray<PaletteId> = paletteIds;

/**
 * The platforms a press walks, starting at the default look.
 *
 * `platformNames` is the tokens table's own order; this cycle visits the
 * default first because that is the frame the app opens in, then the three
 * looks. `theme-switch.test.ts` holds it to `platformNames`, so a platform the
 * library gains fails here until the probe covers it.
 */
export const platformCycle: ReadonlyArray<PlatformName> = [
  "default",
  "darwin",
  "linux",
  "win32",
];

/** The next platform a press selects, as one closed cycle. */
export const nextPlatformInCycle: Readonly<Record<PlatformName, PlatformName>> =
  {
    default: "darwin",
    darwin: "linux",
    linux: "win32",
    win32: "default",
  };

/** The theme a switch paints: the palette wearing the platform's look. */
export const themeFor = (palette: PaletteId, platform: PlatformName): Theme =>
  platformTheme(palettes[palette], platform);

/**
 * The page the probe paints, in logical pixels.
 *
 * Fixed so the sampled point is the same role in every state: a page that
 * resized with its content could move the point onto a child and pass by
 * accident.
 */
export const THEME_PAGE = { width: 600, height: 420 } as const;

/** The card inside the page, sized so the sampled point sits in its padding. */
export const THEME_CARD = { width: 400, height: 160 } as const;

/** The `md` control whose height the theme's density owns. */
export const THEME_CONTROL_WIDTH = 160;

/** The page's own padding, so a sample at its edge stays on the page. */
export const THEME_PAGE_PADDING = 16;

/** The card's own padding, so a sample at its edge stays on the card. */
export const THEME_CARD_PADDING = 16;

/** How far a sample sits inside the surface it reads. */
export const THEME_SAMPLE_INSET = 8;

/**
 * The page point a frame is sampled at: inside the bottom padding.
 *
 * The card and the toolbar are laid out in the content box, so the bottom
 * padding is page paint at every state.
 */
export const themePagePoint = (page: Smoke.Bounds): Point => ({
  x: page.x + THEME_SAMPLE_INSET,
  y: page.y + page.height - THEME_SAMPLE_INSET,
});

/**
 * The card point a frame is sampled at: the right padding, at mid height.
 *
 * Mid height keeps the point off the rounded corners at every platform radius
 * (4–8px), and the right padding is clear of the label and the control.
 */
export const themeCardPoint = (card: Smoke.Bounds): Point => ({
  x: card.x + card.width - THEME_SAMPLE_INSET,
  y: card.y + card.height / 2,
});

/** The colour a role paints, or `None` when it is not a value the frame can hold. */
export const roleColour = (
  theme: Theme,
  role: "background" | "card",
): Option.Option<Pixels.Rgba> =>
  Option.fromNullishOr(Pixels.hexToRgba(theme.colors[role]));

/** Whether two sampled pixels are the same colour, channel for channel. */
export const sameColour: (left: Pixels.Rgba, right: Pixels.Rgba) => boolean =
  Schema.toEquivalence(Pixels.Rgba);

/** The `md` control height a theme's density asks for. */
export const controlHeight = (theme: Theme): number =>
  theme.density.controlHeight.md;

/** The readout a state paints, so a check names the state it read. */
export const themeSwitchReadout = (
  palette: PaletteId,
  platform: PlatformName,
  theme: Theme,
): string =>
  `palette=${palette} platform=${platform} h=${controlHeight(theme)}`;
