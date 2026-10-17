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
}

/**
 * The side with room for the layer: below when it fits, else above when it
 * fits, else the side with more room. An exact fit counts as fitting.
 */
export const decideVerticalSide = ({
  triggerTop,
  triggerBottom,
  layerHeight,
  viewportHeight,
  margin,
}: PlacementRequest): VerticalSide => {
  const below = viewportHeight - margin - triggerBottom;
  const above = triggerTop - margin;
  if (layerHeight <= below) return "bottom";
  if (layerHeight <= above) return "top";
  return below >= above ? "bottom" : "top";
};
