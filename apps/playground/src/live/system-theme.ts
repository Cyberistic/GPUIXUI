/**
 * The system-palette follow `system-theme-follow` measures in a window.
 *
 * `@gpuixui/tokens` ships `paletteToTokens` and `watchSystemTheme`: a desktop
 * hands over a small palette, the mapper turns it into an ordinary theme, and a
 * poll re-applies it when the palette changes because the pinned runtime has no
 * file watcher. `system-theme.test.ts` proves the mapping and the poll's
 * arithmetic without a clock or a window; what no suite could show is the thing
 * a consumer actually relies on — that a **running window repaints** when the
 * desktop theme changes, and that it does so without remounting the tree.
 *
 * The probe owns both halves a window needs. The palette the poll reads is
 * module state here, because the decoder of a platform's file is the
 * **consumer's** (`colors.toml`, a macOS appearance, a Windows accent): the
 * probe stands in for it exactly where a real application would, and the steps
 * change the state the way `omarchy-theme-set` changes the file. The view then
 * mounts the applied theme and paints one page and one accent box, so a
 * capture can read the repaint rather than infer it from a readout.
 *
 * What this does **not** prove is a Linux window following Omarchy: this host
 * is macOS and the platform's file is not read here. The measurement is the
 * follow's paint half, and the README says so beside the probe.
 */
import * as Option from "effect/Option";
import {
  paletteToTokens,
  type SystemPalette,
  type Theme,
} from "@gpuixui/tokens";
import { palettes } from "../palettes.js";

/** The ids the view and the steps share. */
export const SYSTEM_THEME_IDS = {
  probe: "system-theme-probe",
  swatch: "system-theme-swatch",
  page: "system-theme-page",
  mounts: "system-theme-mounts",
} as const;

/** The desktop palette the probe starts from: the catalogue's example night. */
export const nightPalette: SystemPalette = {
  background: "#1B1B1F",
  foreground: "#E4E4E7",
  accent: "#B49CFF",
  muted: "#26262C",
  border: "#3A3A42",
  danger: "#E5484D",
  selection: "#B49CFF3D",
};

/** The palette the desktop switches to: a paper page with a deep accent. */
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
 * The application's own theme: what the window wears before the first read and
 * after the desktop theme is deleted.
 */
export const baseTheme: Theme = palettes.dark;

/** The theme a palette produces over the application's own. */
export const followedTheme = (palette: SystemPalette): Theme =>
  paletteToTokens(palette, baseTheme);

/**
 * The palette the poll reads, as the desktop last handed it over.
 *
 * A missing file is `None`, which is how `watchSystemTheme`'s reader says the
 * desktop theme is gone.
 */
let desktop: Option.Option<SystemPalette> = Option.some(nightPalette);

/**
 * The decoder stand-in: whatever the desktop last handed over.
 *
 * The `undefined` is `watchSystemTheme`'s own reader contract — it is how a
 * deleted desktop theme is reported — so this function's shape is the seam's,
 * not a nullable field the probe works around.
 */
export const readSystemPalette = (): SystemPalette | undefined =>
  Option.getOrUndefined(desktop);
/** The desktop theme changing — `omarchy-theme-set`, in a file. */
export const setSystemPalette = (palette: SystemPalette): void => {
  desktop = Option.some(palette);
};

/** The desktop theme's file going away. */
export const clearSystemPalette = (): void => {
  desktop = Option.none();
};

/** Back to the palette the probe opens with. */
export const resetSystemPalette = (): void => {
  desktop = Option.some(nightPalette);
};

/** The page role a palette paints; `None` is the application's own theme. */
export const pageOf = (palette: Option.Option<SystemPalette>): string =>
  Option.match(palette, {
    onNone: () => baseTheme.colors.background,
    onSome: (some) => followedTheme(some).colors.background,
  });

/** The accent box's role for a palette; `None` is the application's own theme. */
export const swatchOf = (palette: Option.Option<SystemPalette>): string =>
  Option.match(palette, {
    onNone: () => baseTheme.colors.primary,
    onSome: (some) => followedTheme(some).colors.primary,
  });

/** The page the probe opens on: the night desktop's own. */
export const NIGHT_PAGE = pageOf(Option.some(nightPalette));

/** The accent the probe opens on. */
export const NIGHT_SWATCH = swatchOf(Option.some(nightPalette));

/** The page after the desktop switches. */
export const PAPER_PAGE = pageOf(Option.some(paperPalette));

/** The accent after the desktop switches. */
export const PAPER_SWATCH = swatchOf(Option.some(paperPalette));

/** The page the window returns to when the desktop theme is deleted. */
export const BASE_PAGE = pageOf(Option.none());

/** The accent the window returns to when the desktop theme is deleted. */
export const BASE_SWATCH = swatchOf(Option.none());

/** How often the probe polls while it is open; the window run is a test. */
export const SYSTEM_THEME_POLL_MS = 25;

/**
 * Mounts since the module loaded.
 *
 * A follow that re-rendered the app under a new `key` would look identical in a
 * readout and cost every control its state, so the probe publishes this count
 * and the steps hold it across the change.
 */
let mountings = 0;

/** Records one mount of the probe's view. */
export const recordMount = (): number => ++mountings;

/** How many times the view has mounted. */
export const mountCount = (): number => mountings;

/** The probe's root box, in logical pixels from the window's corner. */
export const PROBE_BOX = { width: 560, height: 320 } as const;

/** The accent box the capture samples. */
export const SWATCH_BOX = { x: 24, y: 24, width: 240, height: 120 } as const;

/** The accent box's centre. */
export const swatchPoint = {
  x: SWATCH_BOX.x + SWATCH_BOX.width / 2,
  y: SWATCH_BOX.y + SWATCH_BOX.height / 2,
} as const;

/**
 * A page point clear of the accent box and of every readout line.
 *
 * The root's padding is 24 and its readouts sit under the swatch on the left,
 * so the bottom-right corner is the page's own paint at every palette.
 */
export const pagePoint = {
  x: PROBE_BOX.width - 40,
  y: PROBE_BOX.height - 40,
} as const;

/**
 * How many checks the probe asserts: one capture-scale read, the applied page,
 * the two paints it opens on, the change and its surviving mount, its two
 * paints, the difference between the two themes, and the deleted palette's
 * page and paint.
 */
export const SYSTEM_THEME_CHECKS = 12;
