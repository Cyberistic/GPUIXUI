/**
 * What `overflow` clips, as data (plan `820`).
 *
 * A scrollable surface relies on one rule: a viewport with `overflow` set
 * paints only inside its box, and a press outside that box never reaches the
 * clipped child. GPUix 0.10.0 resolves the answer per axis, with CSS
 * precedence, in `renderer.rs` (`build_host_container` for `scroll`,
 * `apply_styles` for `hidden`): an axis-specific value overrides the
 * shorthand, `scroll` and `hidden` clip, `auto` and `visible` do not.
 *
 * The rule lives here so a component can ask "which axes does this style clip"
 * instead of restating the precedence, and so the probe's after-scroll
 * expectation is derived rather than hard-coded.
 */

/** The three overflow fields `StyleDesc` publishes. */
export interface OverflowStyle {
  readonly overflow?: "visible" | "hidden" | "scroll" | "auto";
  readonly overflowX?: "visible" | "hidden" | "scroll" | "auto";
  readonly overflowY?: "visible" | "hidden" | "scroll" | "auto";
}

/** The axes a style clips. */
export type ClippedAxes = "both" | "x" | "y" | "none";

const clips = (value: OverflowStyle["overflow"]): boolean =>
  value === "scroll" || value === "hidden";

/** Which axes a style clips, with the runtime's axis-over-shorthand precedence. */
export const clippedAxes = (style: OverflowStyle): ClippedAxes => {
  const x = clips(style.overflowX ?? style.overflow);
  const y = clips(style.overflowY ?? style.overflow);
  return x && y ? "both" : x ? "x" : y ? "y" : "none";
};

/**
 * Which axes a style clips **paint** on.
 *
 * Measured in the frame (plan `820`): a one-axis `scroll` container still clips
 * the other axis — the wheel is restricted to the declared axis
 * (`restrict_scroll_to_axis`), the paint clip is not. `hidden` keeps its
 * declared axes. A component that needs a strip to leak on one axis cannot get
 * that from `scroll`.
 */
export const paintClip = (style: OverflowStyle): ClippedAxes =>
  style.overflow === "scroll" ||
  style.overflowX === "scroll" ||
  style.overflowY === "scroll"
    ? "both"
    : clippedAxes(style);

/**
 * The strip a point inside a scrolled list shows.
 *
 * `offset` is the renderer's scroll offset (negative once scrolled down), so a
 * point `localY` into the viewport reads the content position `localY - offset`.
 * The result clamps at the first strip; a point past the content's end is not a
 * question this probe asks.
 */
export const stripIndexAt = (
  stripHeight: number,
  offset: number,
  localY: number,
): number =>
  stripHeight > 0
    ? Math.max(0, Math.floor((localY - offset) / stripHeight))
    : 0;
