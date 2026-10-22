/**
 * Following a system palette.
 *
 * A desktop application is expected to wear the colours the reader already
 * chose for their desktop — the way a native app follows the system theme
 * instead of asking the reader to pick a second one. The platform hands those
 * colours over as a small palette (a page, an ink, an accent, a border and a
 * couple of states), not as a `Theme`: the mapping from one to the other is
 * this module.
 *
 * Three rules keep the mapping honest.
 *
 * It **names roles it was given**. A palette role maps to the semantic role of
 * the same name, except `accent`, which is what a platform calls the fill our
 * components call `primary`, and `danger`, which is our `destructive`. Every
 * role the palette does not name keeps the base theme's value, so a palette of
 * two colours produces a page and an ink rather than a half-built theme.
 *
 * It **never invents a fill**. The one choice the mapper makes is which of the
 * palette's own inks reads on a filled role, and it makes it by measurement
 * (`contrastRatio`), never by mixing a new colour. A palette whose ink cannot
 * read on its own accent is a palette the gate reports, not one this function
 * quietly repairs.
 *
 * It **restates a selection colour at the theme's share**, because `selection` is
 * the one role that is a wash rather than a fill: it is composited behind the run
 * the reader selected, and the run keeps its own text role. A desktop paints
 * selected text as a filled pair — Omarchy's `selection_background`, macOS's
 * selected-content colour, Windows' highlight — so a palette decoded from one is
 * opaque, and handed over unchanged it covers the page: measured on the example
 * night palette, the body ink reads **1.81:1** on the page and eight selection
 * placements fail. The hue is the platform's and the share is the theme's, so an
 * opaque value takes the base theme's own share and the wash clears the contract.
 *
 * The base theme still matters: the surfaces a palette does not name (a card, a
 * modal, a wash) come from it, so the reader who wants a coherent look follows
 * the platform's page with {@link paletteMode} and hands the matching built-in
 * theme to {@link paletteToTokens}. Whether the result is shippable is
 * `auditTheme`'s question, and the catalogue says to run it.
 *
 * The runtime pins no file watcher, so the follow is a documented poll:
 * {@link watchSystemTheme} takes a reader the caller decodes its platform's
 * theme file into and a timer the caller can replace, and re-applies only when
 * the palette it reads actually changed.
 */

import { alpha, alphaOf, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { extendTheme, getTheme, type Theme, type ThemeMode } from "./theme.js";

/**
 * The colours a system theme offers, in the terms a theme uses.
 *
 * Every field is optional: a platform names what it names, and a role it omits
 * keeps the base theme's value. The shape is deliberately small — a system
 * palette is the page, the ink and a handful of accents, not forty roles.
 *
 * A consumer decodes its own platform's file into this shape at the boundary;
 * Omarchy's `colors.toml`, a macOS appearance and a Windows accent all have
 * their own reader, and the mapping from those files is theirs to own.
 */
export interface SystemPalette {
  /** The window's own page fill. */
  readonly background?: string;
  /** The page's body ink. */
  readonly foreground?: string;
  /** The platform's accent, painted as the `primary` fill. */
  readonly accent?: string;
  /** A quiet surface, painted as the `muted` strip. */
  readonly muted?: string;
  /** A divider or control edge, painted as the decorative `border` role. */
  readonly border?: string;
  /** The platform's error colour, painted as the `destructive` fill. */
  readonly danger?: string;
  /**
   * The colour the desktop paints behind selected text, painted as the
   * `selection` wash. A desktop hands this over as a **fill** (a highlight with
   * its own foreground), while the role is a translucent wash behind text that
   * keeps its own colour, so an opaque value takes the base theme's share — see
   * {@link paletteToTokens}. A share the palette states itself is kept.
   */
  readonly selection?: string;
}

/**
 * The ink that reads on a fill: the palette's own page or body ink, whichever
 * measures further from the fill.
 *
 * The base theme's page and ink are used only when the palette names neither —
 * a palette that names a fill but no ink still gets a readable on-colour rather
 * than an invented one. A pair neither can serve is not repaired here;
 * `auditTheme` reports it.
 */
const inkOn = (fill: string, palette: SystemPalette, base: Theme): string => {
  const measured = [palette.foreground, palette.background].filter(
    (candidate): candidate is string => candidate !== undefined,
  );
  const candidates =
    measured.length > 0
      ? measured
      : [base.colors.foreground, base.colors.background];
  return candidates.reduce((best, candidate) =>
    (contrastRatio(candidate, fill) ?? 0) > (contrastRatio(best, fill) ?? 0)
      ? candidate
      : best,
  );
};

/**
 * The mode a palette's own page implies, or `undefined` when it names no page
 * or a colour that cannot be measured.
 *
 * A page reads as dark when white is the better contrast against it, which is
 * the one lightness question a palette can answer without naming a mode. A
 * reader follows the palette's page rather than an app switch:
 *
 * @example
 * ```ts
 * import { getTheme, paletteMode, paletteToTokens } from "@gpuixui/tokens";
 *
 * const palette = readSystemPalette();
 * const theme = paletteToTokens(
 *   palette,
 *   getTheme(paletteMode(palette) ?? "light"),
 * );
 * ```
 */
export function paletteMode(palette: SystemPalette): ThemeMode | undefined {
  const { background } = palette;
  if (background === undefined) {
    return undefined;
  }
  const onWhite = contrastRatio(background, "#FFFFFF");
  const onBlack = contrastRatio(background, "#000000");
  if (onWhite === undefined || onBlack === undefined) {
    return undefined;
  }
  return onWhite > onBlack ? "dark" : "light";
}

/**
 * A desktop's selection colour as the **wash** this library paints.
 *
 * `selection` is composited behind the run the reader selected, and the run keeps
 * its own text role, so the role is a share rather than a fill. A desktop hands
 * over a filled selection — a highlight with a foreground of its own — so an
 * opaque value would paint that colour over the page and hide the text: measured
 * on the example night palette, the body ink reads **1.81:1** on the page and
 * eight selection placements fail. The share is the theme's (`alphaOf` of the
 * base's own wash, the share the selection contract already measures for that
 * theme) and the hue is the platform's; a palette that states a share keeps it,
 * because a decoder that already knows the role is a wash has answered the
 * question. A value no colour grammar reads is returned unchanged, the rule
 * `alpha` follows, and the gate reports it.
 *
 * A desktop's `selection_foreground` cannot be honoured: the runtime paints the
 * wash behind a run that keeps the text role it already had.
 */
const selectionWash = (selection: string, base: Theme): string =>
  alphaOf(selection) < 1
    ? selection
    : alpha(selection, alphaOf(base.colors.selection));

/**
 * A theme wearing a system palette over a base theme.
 *
 * The palette's page, ink, accent, muted strip, border, danger colour and
 * selection wash replace the base's roles of the same name (`accent` is the
 * `primary` fill; `danger` is `destructive`). A filled role the palette names
 * takes its on-colour from the palette's own page or ink — the one that reads
 * on it — and every unnamed role, including the on-colours of fills the palette
 * does not name, stays the base theme's. A selection colour arrives as a fill and
 * is painted as a wash at the base theme's share (see {@link selectionWash}).
 *
 * The result is an ordinary theme: `extendTheme` it to keep the palette but
 * change a value, and run `auditTheme` to see which pairs the palette cannot
 * serve. None of its colours are new — each is either a palette value or a base
 * theme value.
 *
 * @example
 * ```tsx
 * import { darkTheme, paletteToTokens, type SystemPalette } from "@gpuixui/tokens";
 *
 * const palette: SystemPalette = readSystemPalette();
 * const theme = paletteToTokens(palette, darkTheme);
 *
 * <ThemeProvider theme={theme} />
 * ```
 */
export function paletteToTokens(
  palette: SystemPalette,
  base: Theme = getTheme(paletteMode(palette) ?? "light"),
): Theme {
  const colors: Partial<ThemeColors> = {
    ...(palette.background === undefined
      ? {}
      : { background: palette.background }),
    ...(palette.foreground === undefined
      ? {}
      : { foreground: palette.foreground }),
    ...(palette.muted === undefined
      ? {}
      : {
          muted: palette.muted,
          mutedForeground: inkOn(palette.muted, palette, base),
        }),
    ...(palette.border === undefined ? {} : { border: palette.border }),
    ...(palette.accent === undefined
      ? {}
      : {
          primary: palette.accent,
          primaryForeground: inkOn(palette.accent, palette, base),
        }),
    ...(palette.danger === undefined
      ? {}
      : {
          destructive: palette.danger,
          destructiveForeground: inkOn(palette.danger, palette, base),
        }),
    ...(palette.selection === undefined
      ? {}
      : { selection: selectionWash(palette.selection, base) }),
  };
  return extendTheme(base, { colors });
}

/**
 * How a poll is delivered. The runtime has no file watcher, so the follow is an
 * interval the caller owns; injecting it makes the seam testable without a real
 * clock and lets an application use its own scheduler.
 */
export interface SystemThemeTimer {
  /** Call `tick` every `every` milliseconds and return the cancel. */
  readonly poll: (every: number, tick: () => void) => () => void;
}

/** The default timer: `setInterval`, cleared by the returned cancel. */
export const intervalTimer: SystemThemeTimer = {
  poll: (every, tick) => {
    const handle = setInterval(tick, every);
    return () => clearInterval(handle);
  },
};

/** What {@link watchSystemTheme} needs. */
export interface WatchSystemThemeOptions {
  /**
   * Read and decode the platform's palette. `undefined` means there is none —
   * the file is gone or names nothing — and the base theme is applied.
   */
  readonly read: () => SystemPalette | undefined;
  /** The theme the palette is mapped onto; its mode and variant are kept. */
  readonly base: Theme;
  /** Called with a new theme whenever the palette changes. */
  readonly onChange: (theme: Theme) => void;
  /** Milliseconds between polls. The runtime has no file watcher to subscribe to. */
  readonly every: number;
  /** Poll mechanism; `setInterval` unless the caller supplies its own. */
  readonly timer?: SystemThemeTimer;
}

/** The palette's values in a fixed order, so a tick that reads the same file is not a change. */
const paletteKey = (palette: SystemPalette | undefined): string =>
  palette === undefined
    ? ""
    : [
        palette.background,
        palette.foreground,
        palette.accent,
        palette.muted,
        palette.border,
        palette.danger,
        palette.selection,
      ]
        .map((value) => value ?? "")
        .join("\u0000");

/**
 * Follow a system palette, applying the first read immediately and re-applying
 * only when the palette changes.
 *
 * Returns the stop function; calling it cancels the poll. A `read` that cannot
 * decode the platform's file should answer `undefined` rather than throw — that
 * is how a deleted theme file returns the application to its base theme — and a
 * throw from it is a defect the caller's boundary owns, not something this
 * functions hides.
 *
 * @example
 * ```tsx
 * import { darkTheme, watchSystemTheme } from "@gpuixui/tokens";
 *
 * const stop = watchSystemTheme({
 *   read: () => readSystemPalette(),
 *   base: darkTheme,
 *   onChange: setTheme,
 *   every: 2000,
 * });
 * ```
 */
export function watchSystemTheme(options: WatchSystemThemeOptions): () => void {
  const { read, base, onChange, every, timer = intervalTimer } = options;
  let applied: string | undefined;
  const tick = (): void => {
    const palette = read();
    const key = paletteKey(palette);
    if (key === applied) {
      return;
    }
    applied = key;
    onChange(palette === undefined ? base : paletteToTokens(palette, base));
  };
  tick();
  return timer.poll(every, tick);
}
