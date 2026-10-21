/**
 * The positioning contract (plan `839`).
 *
 * The bug being guarded: `position` appears in 146 shipped and scenario call
 * sites and it is the basis of every overlay in the library, yet no scenario
 * asserted a rule. `apply_styles` maps `fixed` onto `absolute` because taffy has
 * no viewport-fixed position, an absolute box is contained by its **direct
 * parent's** padding box rather than the nearest positioned ancestor, and paint
 * order is tree order — positioned or not. A runtime that resolved an absolute
 * box against a positioned ancestor, placed it from the wrong edge, let a
 * declared size lose to an inset, or painted it above a later sibling passes the
 * whole suite while every menu, veil and rail lands in the wrong place.
 *
 * This module owns the arithmetic the scenario asserts: the containing block,
 * the inset rules, the flow slot a `relative` box keeps, and the static
 * position. Insets come from `box-inset-model.ts`, so the two probes share one
 * vocabulary.
 */
import type { Insets, ReportedBox } from "./box-inset-model.js";

/** A point in window coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A box in window coordinates, as `bounds` reports one. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The four insets a positioned box declares, plus an optional size. */
export interface Placement {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly width?: number;
  readonly height?: number;
}

/**
 * One axis' input: the containing extent, the declared inset and size, and the
 * static fallback.
 *
 * The optional keys mirror `StyleDesc`, which is an external boundary shape
 * (`width?: number` and friends); the model has to stay total over that shape,
 * so "absent" is an omitted key here rather than an `Option`, and every branch
 * that reads one distinguishes a declared `0` from a missing value.
 */
export interface AxisInput {
  /** The containing block's extent along this axis. */
  readonly extent: number;
  /** The declared size along this axis, when the box has one. */
  readonly size?: number;
  readonly leading?: number;
  readonly trailing?: number;
  /** Where the box would sit in flow, relative to the containing block. */
  readonly staticStart: number;
  /** The size the box gets from its content when it declares none. */
  readonly autoSize: number;
}

/** Where one axis places the box and how long it makes it. */
export interface Axis {
  readonly start: number;
  readonly size: number;
}

/**
 * The padding box origin of a reported box: the absolute containing block.
 *
 * The report is the content origin with the padding-box size (plan `835`), so
 * the border is already excluded and only the padding is subtracted.
 */
export const paddingBoxOrigin = (
  parent: ReportedBox,
  insets: Insets,
): Point => ({ x: parent.x - insets.left, y: parent.y - insets.top });

/**
 * Place one axis of a positioned box.
 *
 * The runtime's rules, measured in plan `839`: a declared size plus its leading
 * inset wins; a declared size with only a trailing inset places from the far
 * edge; both insets and no size stretch between them; and with no inset the box
 * keeps its static position.
 */
export const placeAxis = (input: AxisInput): Axis => {
  const { extent, size, leading, trailing, staticStart, autoSize } = input;
  if (size !== undefined) {
    if (leading !== undefined) return { start: leading, size };
    if (trailing !== undefined) {
      return { start: extent - trailing - size, size };
    }
    return { start: staticStart, size };
  }
  if (leading !== undefined && trailing !== undefined) {
    return { start: leading, size: extent - leading - trailing };
  }
  if (leading !== undefined) return { start: leading, size: autoSize };
  if (trailing !== undefined) {
    return { start: extent - trailing - autoSize, size: autoSize };
  }
  return { start: staticStart, size: autoSize };
};

/** Where a `relative` box paints: its flow origin plus its offset. */
export const relativePaint = (flow: Point, offset: Point): Point => ({
  x: flow.x + offset.x,
  y: flow.y + offset.y,
});

/** The flow origin of the sibling that follows a box `height` tall. */
export const flowNext = (origin: Point, height: number): Point => ({
  x: origin.x,
  y: origin.y + height,
});

/** Whether `child` lies outside `parent` on any side. */
export const outsideOf = (parent: Rect, child: Rect): boolean =>
  child.x < parent.x ||
  child.y < parent.y ||
  child.x + child.width > parent.x + parent.width ||
  child.y + child.height > parent.y + parent.height;

/** A box placed from a containing block, as the scenario reads it. */
export interface Placed {
  readonly origin: Point;
  readonly size: { readonly width: number; readonly height: number };
}

/**
 * The absolute placement of a box inside `basis` (the containing block's
 * padding box), answering both axes from one rule set.
 */
export const placeIn = (
  basis: Point,
  extent: { readonly width: number; readonly height: number },
  placement: Placement,
  staticOrigin: Point,
  autoSize: { readonly width: number; readonly height: number },
): Placed => {
  const horizontal = placeAxis({
    extent: extent.width,
    size: placement.width,
    leading: placement.left,
    trailing: placement.right,
    staticStart: staticOrigin.x - basis.x,
    autoSize: autoSize.width,
  });
  const vertical = placeAxis({
    extent: extent.height,
    size: placement.height,
    leading: placement.top,
    trailing: placement.bottom,
    staticStart: staticOrigin.y - basis.y,
    autoSize: autoSize.height,
  });
  return {
    origin: { x: basis.x + horizontal.start, y: basis.y + vertical.start },
    size: { width: horizontal.size, height: vertical.size },
  };
};
