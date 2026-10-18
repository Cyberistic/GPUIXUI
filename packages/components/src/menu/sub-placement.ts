/**
 * Placement for a menu submenu, measured once per open (plan 382).
 *
 * The runtime snaps a surface inside the window but never flips it (plan 323),
 * so a right-edge submenu would be clamped back over its own row. This rule
 * opens it on the left when the right side cannot hold it, and bottom-aligns it
 * to the row when there is not enough room below. When neither horizontal side
 * fits, the roomier side wins and the runtime's snap does the rest.
 */

import type { FloatingBounds, WindowBounds } from "../internal/placement.js";

/** Everything the rule needs; the surface is the box after its first paint. */
export interface SubmenuPlacementInput {
  /** The trigger row's measured box, in window coordinates. */
  readonly row: FloatingBounds;
  /** The submenu's measured box; only its size is used. */
  readonly surface: FloatingBounds;
  readonly window: WindowBounds;
  /** The gap between the row and the surface. */
  readonly gap: number;
  /** The margin kept from the window edge. */
  readonly margin: number;
}

/** The submenu's top-left corner, in window coordinates. */
export interface SubmenuPoint {
  readonly x: number;
  readonly y: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

/**
 * Where a submenu's top-left corner goes. The right side wins when the surface
 * fits there; otherwise the left side; otherwise the side with more room. The
 * vertical axis keeps the row's top unless the surface would leave the window,
 * in which case it is bottom-aligned to the row and clamped.
 */
export const resolveSubmenuPoint = ({
  row,
  surface,
  window,
  gap,
  margin,
}: SubmenuPlacementInput): SubmenuPoint => {
  const right = row.x + row.width + gap;
  const left = row.x - gap - surface.width;
  const rightRoom = window.width - margin - right;
  const leftRoom = row.x - gap - margin;

  const x =
    rightRoom >= surface.width
      ? right
      : leftRoom >= surface.width
        ? left
        : rightRoom >= leftRoom
          ? right
          : left;

  const below = window.height - margin;
  const bottomAligned = row.y + row.height - surface.height;
  const y =
    row.y + surface.height <= below
      ? row.y
      : clamp(
          bottomAligned,
          margin,
          Math.max(margin, window.height - margin - surface.height),
        );

  return { x, y };
};
