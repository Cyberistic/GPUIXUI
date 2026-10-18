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

/** The sides whose layer sits above or below its trigger. */
export type VerticalSide = "top" | "bottom";

/** The sides whose layer sits beside its trigger. */
export type HorizontalSide = "left" | "right";

/** Every side a layer can open on — the runtime's own set. */
export type LayerSide = VerticalSide | HorizontalSide;

/** Whether the side places the layer beside its trigger rather than above/below. */
export const isHorizontalSide = (side: LayerSide): side is HorizontalSide =>
  side === "left" || side === "right";

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

/**
 * The pixels between the trigger and the window margin on `side`.
 *
 * A layer taller than this would be clamped by the runtime with no way to reach
 * the far end, so it becomes a capped scroll container at exactly this height.
 * The side decision uses the same subtraction, so both agree (plan 068).
 *
 * A layer beside its trigger is constrained by the window on its **height**, not
 * by the trigger: the runtime's `align="start"` places its top edge on the
 * trigger's, so the free space runs from there to the bottom margin (measured,
 * plan 098). Its horizontal axis decides width, not height.
 */
export const availableOn = (
  request: Pick<
    PlacementRequest,
    "triggerTop" | "triggerBottom" | "viewportHeight" | "margin"
  >,
  side: LayerSide,
): number =>
  side === "top"
    ? request.triggerTop - request.margin
    : side === "bottom"
      ? request.viewportHeight - request.margin - request.triggerBottom
      : request.viewportHeight - request.margin - request.triggerTop;

/** The alignment values the runtime accepts, on either axis. */
export type LayerAlign = "start" | "center" | "end";

/** The boxes a true centre is derived from. */
export interface AlignRequest {
  readonly side: LayerSide;
  readonly align: LayerAlign;
  /** The anchor's painted width. */
  readonly triggerWidth: number;
  /** The anchor's painted height. */
  readonly triggerHeight: number;
  /** The layer's painted width. */
  readonly layerWidth: number;
  /** The layer's painted height. */
  readonly layerHeight: number;
}

/** The runtime's `align` plus the offset that makes it the requested one. */
export interface ResolvedAlign {
  readonly align: "start" | "end";
  readonly offset: number;
}

/**
 * Turn the requested alignment into one the runtime places exactly.
 *
 * The runtime's `center` is not usable: it puts the layer's **end** on the
 * anchor's centre line, half a layer off (measured, plans `060` §0 and `323`).
 * Mapping `center` to `start` plus half the difference between the anchor and
 * the layer is the exact placement — and the difference is taken on the layer's
 * **own axis**: a top/bottom layer aligns horizontally, so widths; a left/right
 * layer aligns vertically, so heights (measured, plan `098`). `start` and `end`
 * need no offset on either axis. The caller guards a non-positive measurement,
 * so the arithmetic here is total.
 */
export const resolveAlign = ({
  side,
  align,
  triggerWidth,
  triggerHeight,
  layerWidth,
  layerHeight,
}: AlignRequest): ResolvedAlign =>
  align === "center"
    ? {
        align: "start",
        offset: isHorizontalSide(side)
          ? (triggerHeight - layerHeight) / 2
          : (triggerWidth - layerWidth) / 2,
      }
    : { align, offset: 0 };
