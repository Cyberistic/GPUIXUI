/**
 * Which side of its trigger a floating layer opens on.
 *
 * GPUix's `FloatingLayer` defaults to `side="bottom"` and `fit="snap"`, and
 * `snap` **clamps the layer into the window without flipping it** (measured,
 * plan `156` §8): a select near the bottom edge opened its list *over* the
 * trigger. The runtime will not move the layer to the other side, so a
 * component that must stay readable has to choose the side itself.
 *
 * Pure, so the rule is provable without a renderer: `Select` passes the trigger
 * box it measured and the list height it derived from its own styles.
 */

/** The vertical sides a layer can open on. */
export type VerticalSide = "top" | "bottom";

/**
 * The gap the runtime's floating layer keeps from the window edge.
 *
 * `FloatingLayer` calls it `collisionPadding` and defaults it to 8; a component
 * that decides a side passes this same number down, so the decision and the
 * runtime's clamp cannot disagree.
 */
export const FLOATING_MARGIN = 8;

/** What the decision needs: the trigger, the layer and the window, in pixels. */
export interface PlacementRequest {
  /** The trigger's top edge, in window coordinates. */
  readonly triggerTop: number;
  /** The trigger's bottom edge, in window coordinates. */
  readonly triggerBottom: number;
  /** The layer's expected height. */
  readonly layerHeight: number;
  /** The window's height. */
  readonly viewportHeight: number;
  /** The gap kept between the layer and the window edge. */
  readonly margin: number;
  /** The side to keep when it has room. Defaults to `bottom`. */
  readonly preferred?: VerticalSide;
}

/**
 * The side with room for the layer: the preferred side when the layer fits
 * there, else the other side when it fits there, else the roomier side. An
 * exact fit counts as fitting.
 */
export const decideVerticalSide = ({
  triggerTop,
  triggerBottom,
  layerHeight,
  viewportHeight,
  margin,
  preferred = "bottom",
}: PlacementRequest): VerticalSide => {
  const below = viewportHeight - margin - triggerBottom;
  const above = triggerTop - margin;
  const preferredSpace = preferred === "bottom" ? below : above;
  const otherSpace = preferred === "bottom" ? above : below;
  const other = preferred === "bottom" ? "top" : "bottom";
  if (layerHeight <= preferredSpace) return preferred;
  if (layerHeight <= otherSpace) return other;
  return preferredSpace >= otherSpace ? preferred : other;
};
