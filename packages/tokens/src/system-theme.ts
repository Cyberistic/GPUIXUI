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
 * It **carries the mode the desktop states**. A platform that says `dark` has
 * answered the question a page's lightness only approximates, so a stated mode
 * wins over the page; a palette that states none — or states a name this release
 * does not ship, which a consumer's own decoder can write — is read by
 * lightness, the one question a page can answer without naming a mode.
 * {@link paletteMode} is total on the name for the reason every paint seam is:
 * the documented call site hands its answer straight to `getTheme`, which
 * refuses a mode it does not know.
 *
 * It **never invents a fill**. The one choice the mapper makes is which of the
 * palette's own inks reads on a filled role, and it makes it by measurement
 * (`contrastRatio`), never by mixing a new colour. A palette whose ink cannot
 * read on its own accent is a palette the gate reports, not one this function
 * quietly repairs. The base answers that question when the palette names no ink
 * at all, and a base restored from storage that lost its whole colour group is
 * read as the identity theme of its own mode and variant rather than throwing on
 * the first tick (see {@link paletteToTokens}).
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

import { alpha, alphaOf, themeColors, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { pageMode } from "./luminance.js";
import {
  extendTheme,
  getTheme,
  isThemeMode,
  themeContrastOf,
  themeModeOf,
  type Theme,
  type ThemeMode,
} from "./theme.js";

/**
 * The colours a system theme offers, in the terms a theme uses.
 *
 * Every field is optional: a platform names what it names, and a role it omits
 * keeps the base theme's value. The shape is deliberately small — a system
 * palette is the page, the ink and a handful of accents, not forty roles.
 *
 * A consumer decodes its own platform's file into this shape at the boundary;
 * Omarchy's `colors.toml` reader ships as `decodeOmarchyPalette` in
 * `./omarchy.js`, while a macOS appearance and a Windows accent still have their
 * own reader, because this package names the semantic shape rather than every
 * platform's file format.
 */
export interface SystemPalette {
  /**
   * The mode the desktop states, when it states one.
   *
   * A theme file that says `light` or `dark` has answered a question its page's
   * lightness only approximates — a mid-grey page is neither — so a stated mode
   * is what {@link paletteMode} returns. Omit it and the page decides; state a
   * name this release does not ship and the page decides too, because a decoder
   * that writes the palette is a boundary where the value is still unknown.
   */
  readonly mode?: ThemeMode;
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
 * The base theme's roles, with the library's own value for one a store lost.
 *
 * A base is a theme a consumer holds — a brand, often one restored from
 * storage — so it can arrive with no `colors` group at all: JSON keeps `null`
 * where a theme carried nothing, and reading a role straight off the group threw
 * `TypeError: Cannot read properties of null (reading 'foreground')` out of
 * {@link paletteToTokens} and out of a {@link watchSystemTheme} tick. The two
 * questions this module asks the base — which ink reads on a fill, and the share
 * an opaque selection colour takes — are answered by the identity theme of the
 * base's own mode and contrast variant when the base cannot answer, the rule
 * `textStyle` and `nativeTextTheme` follow: a role a brand carries still wins,
 * and no colour is invented. A base whose own group survived is returned as it
 * is, so every caller's palette lands on exactly the roles it always did.
 */
const baseRoles = (base: Theme): ThemeColors => ({
  ...getTheme(themeModeOf(base), themeContrastOf(base)).colors,
  ...themeColors(base),
});

/**
 * The ink that reads on a fill: the palette's own page or body ink, whichever
 * measures further from the fill.
 *
 * The base's page and ink are used only when the palette names neither — a
 * palette that names a fill but no ink still gets a readable on-colour rather
 * than an invented one, and a base a store truncated answers with the identity
 * theme's pair for its mode rather than throwing (see {@link baseRoles}). A pair
 * neither can serve is not repaired here; `auditTheme` reports it.
 */
const inkOn = (
  fill: string,
  palette: SystemPalette,
  roles: ThemeColors,
): string => {
  const measured = [palette.foreground, palette.background].filter(
    (candidate): candidate is string => candidate !== undefined,
  );
  const candidates =
    measured.length > 0 ? measured : [roles.foreground, roles.background];
  return candidates.reduce((best, candidate) =>
    (contrastRatio(candidate, fill) ?? 0) > (contrastRatio(best, fill) ?? 0)
      ? candidate
      : best,
  );
};

/**
 * The mode a palette states, or the one its own page implies.
 *
 * A palette that carries a mode this release ships has answered the question —
 * the desktop said so — and that answer is returned unchanged, even when the
 * page's lightness would classify it the other way (a mid-grey page is neither
 * light nor dark). A mode this release does **not** ship is the same input as a
 * stored role or size: a consumer's own decoder writes the `SystemPalette`, and
 * a desktop file that says `Dark`, a release's old name or a `null` a JSON store
 * kept is a name before it is a union. It is read from the page, the rule
 * {@link themeModeOf} follows for a theme, because the documented call site hands
 * this answer straight to `getTheme`, which refuses a mode it does not know — the
 * example palette threw `\`Dark\` is not a theme mode` instead of following the
 * desktop.
 *
 * A palette that names no page, or a page in a colour form the measurement
 * dialect cannot resolve, has no mode at all.
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
  const { background, mode } = palette;
  return isThemeMode(mode) ? mode : pageMode(background);
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
 * question. A base a store truncated takes the identity theme's share for its
 * mode and variant (see {@link baseRoles}), so a restored brand still follows
 * the desktop. A value no colour grammar reads is returned unchanged, the rule
 * `alpha` follows, and the gate reports it.
 *
 * A desktop's `selection_foreground` cannot be honoured: the runtime paints the
 * wash behind a run that keeps the text role it already had.
 */
const selectionWash = (selection: string, roles: ThemeColors): string =>
  alphaOf(selection) < 1
    ? selection
    : alpha(selection, alphaOf(roles.selection));

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
 * **A base a store truncated is read through the library's own.** The base is
 * asked two questions — which ink reads on a filled role the palette names no
 * ink for, and the share an opaque selection colour takes — and a base restored
 * from storage can arrive with no `colors` group at all (`null` in JSON). Both
 * answers read through `themeColors` and fall back to the identity theme of the
 * base's own mode and contrast variant, so a follow that starts over a restored
 * brand applies its first palette instead of throwing on the tick. The roles the
 * palette names still land, and the roles neither carries stay absent for
 * `auditTheme` to report.
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
  // The two questions this seam asks the base — which ink reads on a fill and
  // the share an opaque selection takes — read through the colour seam, so a
  // base a store truncated answers with the identity theme's roles for its own
  // mode and variant instead of throwing on `null` (see `baseRoles`).
  const roles = baseRoles(base);
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
          mutedForeground: inkOn(palette.muted, palette, roles),
        }),
    ...(palette.border === undefined ? {} : { border: palette.border }),
    ...(palette.accent === undefined
      ? {}
      : {
          primary: palette.accent,
          primaryForeground: inkOn(palette.accent, palette, roles),
        }),
    ...(palette.danger === undefined
      ? {}
      : {
          destructive: palette.danger,
          destructiveForeground: inkOn(palette.danger, palette, roles),
        }),
    ...(palette.selection === undefined
      ? {}
      : { selection: selectionWash(palette.selection, roles) }),
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

/**
 * The pace an unusable `every` is read as, in milliseconds — the cadence every
 * example in this package shows.
 *
 * A pace is configuration as often as a literal: an application reads it from a
 * settings row or an environment variable, which is a string before it is a
 * number, so `Number(...)` hands `NaN` over as readily as `2000`. `setInterval`
 * honours a delay from 1 to 2 147 483 647 ms and silently runs every other one
 * at its 1 ms floor, so an unreadable pace would read and decode the platform's
 * theme file a thousand times a second while the window looked correct. A pace
 * outside that range — `NaN`, `0`, a negative delay, a sub-millisecond one, or
 * one past the timer's 32-bit limit — reads as this one instead.
 */
export const systemThemePollMs = 2000;

/** The longest delay `setInterval` honours, in milliseconds. */
const maxTimerMs = 2 ** 31 - 1;

/**
 * The pace a watch runs at: the caller's `every` when the platform's timer can
 * honour it — a finite number of milliseconds from 1 through
 * {@link maxTimerMs} — and {@link systemThemePollMs} otherwise.
 */
const paceOf = (every: number): number =>
  Number.isFinite(every) && every >= 1 && every <= maxTimerMs
    ? every
    : systemThemePollMs;

/** What {@link watchSystemTheme} needs. */
export interface WatchSystemThemeOptions {
  /**
   * Read and decode the platform's palette. `undefined` means there is none —
   * the file is gone or names nothing — and the base theme is applied.
   */
  readonly read: () => SystemPalette | undefined;
  /** The theme the palette is mapped onto; its mode and variant are kept. */
  readonly base: Theme;
  /**
   * The base for a palette that needs a different one, such as a desktop that
   * switched from a dark theme to a light one.
   *
   * Without it every palette is mapped onto `base`, which is right for a desktop
   * that only moves its colours and wrong across a mode switch: a light page on
   * the dark base's surfaces is exactly the mix `auditTheme` reports. The
   * function is called per palette, so it can choose by
   * `getTheme(paletteMode(palette) ?? base.mode)`.
   */
  readonly baseFor?: (palette: SystemPalette) => Theme;
  /** Called with a new theme whenever the palette changes. */
  readonly onChange: (theme: Theme) => void;
  /**
   * Milliseconds between polls. The runtime has no file watcher to subscribe to.
   * A pace outside the 1 – 2 147 483 647 ms range `setInterval` honours reads as
   * {@link systemThemePollMs}, because the timer reads every other delay as its
   * 1 ms floor and would read the platform's file in a loop.
   */
  readonly every: number;
  /** Poll mechanism; `setInterval` unless the caller supplies its own. */
  readonly timer?: SystemThemeTimer;
}

/**
 * The palette fields the poll watches, in the fixed order it reads them.
 *
 * A field this list omits is one a reader can change without the window
 * noticing — the watch compares these fields, not the object — so the list is
 * exhaustive by test: `system-theme.test.ts` builds a `Record<keyof
 * SystemPalette, string>` table (a new field fails the compile until it is
 * named there) and proves that changing any one field alone re-applies.
 */
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

/**
 * Whether two reads describe the same palette.
 *
 * The fields are compared as values, not through a string they are joined into:
 * a decoder can report a colour as an empty string where the previous read
 * omitted it — a TOML or JSON reader writes an empty value rather than no key —
 * and the two compose differently, because `paletteToTokens` keeps the base's
 * role for an absent field and states the empty one. A joined key wrote both as
 * `""`, so the window kept the theme it had. Comparing field by field also
 * keeps a re-read that allocates a new object with the same values quiet.
 */
const samePalette = (
  left: SystemPalette | undefined,
  right: SystemPalette | undefined,
): boolean =>
  left === undefined || right === undefined
    ? left === right
    : paletteFields.every((field) => left[field] === right[field]);

/**
 * Follow a system palette, applying the first read immediately and re-applying
 * only when the palette changes.
 *
 * Returns the stop function; calling it cancels the poll. A `read` that cannot
 * decode the platform's file should answer `undefined` rather than throw — that
 * is how a deleted theme file returns the application to its base theme — and a
 * throw from it is a defect the caller's boundary owns, not something this
 * functions hides. A desktop that switches between its light and dark themes
 * hands `baseFor` so each palette is mapped onto the matching base; without it
 * every palette keeps the one `base` it was started with.
 *
 * A change is recorded once `onChange` has returned, so a callback that throws
 * does not leave the window on the previous theme with the change marked as
 * delivered: the defect reaches the caller and the palette is offered again on
 * the next tick.
 *
 * Every watched field is compared as its own value, not through a joined key, so
 * a decoder that reports a colour as `""` where it previously omitted it is a
 * change the window sees — the two compose differently (`paletteToTokens` keeps
 * the base's role for the absent field and states the empty one).
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
  const { read, base, baseFor, onChange, timer = intervalTimer } = options;
  // The pace a watch runs at. A delay outside the timer's own 1 … 2^31-1 ms
  // range is the 1 ms floor it reads every other value as, so it is read as the
  // documented pace rather than handed on.
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
    // Recorded after delivery: a callback that throws is retried next tick
    // rather than leaving the window on the theme it already had.
    applied = palette;
    delivered = true;
  };
  tick();
  return timer.poll(every, tick);
}
