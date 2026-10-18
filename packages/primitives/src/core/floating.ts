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

/**
 * Which of two sides keeps the layer off its trigger.
 *
 * The preferred side wins when the layer fits there, or when it fits nowhere
 * and the preferred side is the roomier one; otherwise the other side wins. An
 * exact fit counts as fitting. Both axes differ only in how their free space is
 * measured, so both decisions share this one order.
 */
const chooseSide = <Side extends string>(
  preferred: Side,
  other: Side,
  extent: number,
  preferredSpace: number,
  otherSpace: number,
): Side =>
  extent <= preferredSpace ||
  (extent > otherSpace && preferredSpace >= otherSpace)
    ? preferred
    : other;

/** What the vertical decision needs: the trigger, the layer and the window. */
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
  return preferred === "bottom"
    ? chooseSide(preferred, "top", layerHeight, below, above)
    : chooseSide(preferred, "bottom", layerHeight, above, below);
};

/** What the horizontal decision needs: the trigger, the layer and the window. */
export interface HorizontalPlacementRequest {
  /** The trigger's left edge, in window coordinates. */
  readonly triggerLeft: number;
  /** The trigger's right edge, in window coordinates. */
  readonly triggerRight: number;
  /** The layer's expected width. */
  readonly layerWidth: number;
  /** The window's width. */
  readonly viewportWidth: number;
  /** The gap kept between the layer and the window edge. */
  readonly margin: number;
  /** The side to keep when it has room. Defaults to `right`. */
  readonly preferred?: HorizontalSide;
}

/**
 * The side with room for the layer: the preferred side when the layer fits
 * there, else the other side when it fits there, else the roomier side. An
 * exact fit counts as fitting.
 *
 * The runtime's `fit="snap"` clamps a layer into the window **without flipping
 * it**, so a side that cannot fit paints the layer over its own trigger
 * (measured, plan `335`). This turns the requested horizontal side into the one
 * that actually has room.
 */
export const decideHorizontalSide = ({
  triggerLeft,
  triggerRight,
  layerWidth,
  viewportWidth,
  margin,
  preferred = "right",
}: HorizontalPlacementRequest): HorizontalSide => {
  const after = viewportWidth - margin - triggerRight;
  const before = triggerLeft - margin;
  return preferred === "right"
    ? chooseSide(preferred, "left", layerWidth, after, before)
    : chooseSide(preferred, "right", layerWidth, before, after);
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

/**
 * The pixels a layer can use on its own horizontal axis, on `side`.
 *
 * A layer above or below its trigger starts at the trigger's left edge
 * (`align="start"`); a layer on the left ends at the trigger, and one on the
 * right starts at its right edge. The side decision subtracts the same numbers,
 * so the width cap and the chosen side agree (plan `379`).
 */
export const availableWidth = (
  request: Pick<
    HorizontalPlacementRequest,
    "triggerLeft" | "triggerRight" | "viewportWidth" | "margin"
  >,
  side: LayerSide,
): number =>
  side === "left"
    ? request.triggerLeft - request.margin
    : side === "right"
      ? request.viewportWidth - request.margin - request.triggerRight
      : request.viewportWidth - request.margin - request.triggerLeft;

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
