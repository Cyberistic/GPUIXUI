/**
 * The window-driven layout rule for the `window-layout` probe.
 *
 * GPUix 0.10.0 has no container query and no `onLayout`, so the window size is
 * the only React-visible breakpoint source: a pane's own width has to come from
 * a `ref` + `renderer.getElementBounds` read instead (plan `184`). This module
 * keeps the rule pure so the boundaries are unit-testable without a window.
 */

/** The width at or above which the shell shows its sidebar. */
export const WIDE_MIN = 1200;
/** The sidebar's width in the wide layout. */
export const SIDEBAR_WIDTH = 240;
/** The toolbar strip's height; the body gets the rest of the window. */
export const TOOLBAR_HEIGHT = 36;

/** The window's paintable size in logical pixels. */
export interface WindowSize {
  readonly width: number;
  readonly height: number;
}

/** Which of the two shell layouts the window width selects. */
export type WindowMode = "wide" | "compact";

/** The layout a window size selects. */
export interface WindowLayout {
  /** `wide` at or above {@link WIDE_MIN}, otherwise `compact`. */
  readonly mode: WindowMode;
  /** The sidebar width, or `0` when the layout has no sidebar. */
  readonly sidebar: number;
  /** How many toolbar actions the layout shows. */
  readonly actions: number;
}

/**
 * The shell layout for `size`.
 *
 * Width-only by design: a short, wide window and a tall, narrow one answer
 * differently, and a non-positive width is never `wide`.
 */
export const layoutFor = (size: WindowSize): WindowLayout => {
  const wide = size.width >= WIDE_MIN;
  return {
    mode: wide ? "wide" : "compact",
    sidebar: wide ? SIDEBAR_WIDTH : 0,
    actions: wide ? 6 : 3,
  };
};
