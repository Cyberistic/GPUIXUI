/**
 * The title bar's geometry, as a pure function.
 *
 * macOS draws the traffic lights over the app's own bar when the window opens
 * with `titlebarTransparent`, so the bar has to leave them room. The inset is
 * the lights' own box plus the gap the platform leaves around them: 68 for the
 * three 12px lights at 20px from the edge, plus 10 of breathing room.
 */

/** The room the three traffic lights occupy, measured from the leading edge. */
export const TRAFFIC_LIGHT_INSET = 78;

/** The bar's height at each density step. macOS titles are 38 points. */
export const TITLE_BAR_HEIGHT = { compact: 32, comfortable: 38 } as const;

/** A density the bar knows a height for. */
export type TitleBarDensity = keyof typeof TITLE_BAR_HEIGHT;

/**
 * The padding a title bar gives its content.
 *
 * The leading side reserves the lights when the window is transparent-chrome,
 * and falls back to the bar's own inset when the app paints a normal titlebar
 * (or runs on a platform without traffic lights).
 */
export const titleBarPadding = (
  controls: "native" | "none",
  density: TitleBarDensity = "comfortable",
): { paddingLeft: number; paddingRight: number; height: number } => ({
  paddingLeft: controls === "native" ? TRAFFIC_LIGHT_INSET : 12,
  paddingRight: 12,
  height: TITLE_BAR_HEIGHT[density],
});

/**
 * What the window did with a picked set of paths.
 *
 * A picker the reader cancels answers `null` from the runtime, which is the
 * absence of a choice rather than an empty folder list; the label keeps the two
 * apart so a caller cannot report "0 files" for a cancel.
 */
export type PickedPaths =
  | { readonly _tag: "Cancelled" }
  | { readonly _tag: "Picked"; readonly paths: ReadonlyArray<string> };

/** The outcome of a path prompt, as the absence of a choice or a choice. */
export const pickedPaths = (
  paths: ReadonlyArray<string> | null | undefined,
): PickedPaths =>
  paths == null || paths.length === 0
    ? { _tag: "Cancelled" }
    : { _tag: "Picked", paths };
