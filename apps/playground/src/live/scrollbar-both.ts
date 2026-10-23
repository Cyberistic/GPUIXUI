/**
 * Whether a `ScrollArea` with `axis="both"` paints **both** thumbs.
 *
 * `scrollbar-thumb` asked the binding's thumb rule on one axis at a time, which
 * is how every shipped scroller is built. `ScrollArea` also accepts
 * `axis="both"` — the primitives mount one in `presentational.test.tsx`, and no
 * shipped component does yet — and a log pane or an editor scroller is the
 * obvious customer. Whether that surface gets two affordances or one is not a
 * styling question: the runtime paints the thumbs itself, so a missing one
 * cannot be worked around in a recipe, and a component needs to know before it
 * promises the reader a way back along the other axis.
 *
 * The box is deliberately small (160×120) with content that overflows on both
 * axes, so each band the rule predicts is a few pixels and the two thumbs meet
 * in one corner — the one placement where a single-thumb implementation and a
 * two-thumb one differ. The tick is the same rule `scrollbar.ts` measured: on an
 * axis of `track` px where the content can move `maxScroll` px the thumb is
 * `track * track / (track + maxScroll)` long (at least `SCROLLBAR_MIN_THUMB`,
 * never longer than the track) and starts `progress * (track - length)` along
 * it, both rounded, flush at the trailing edge and over the content rather than
 * in a gutter. Reusing `thumbBox` keeps one statement of that rule.
 *
 * **Two axes are not two independent thumbs.** The binding's `paint_scrollbars`
 * reduces *each* track by the other thumb's thickness once both are shown — the
 * corner is left to whichever thumb reaches it first, which is the vertical —
 * while the content still moves a full viewport's worth. So a vertical thumb on
 * a 120 px box with 400 px of content is 31 px long rather than 36, and a
 * component that sized a thumb from the viewport alone would be wrong on every
 * two-axis scroller. `bothTrack` and `bothScroll` are those two numbers kept
 * apart, which is why the rule needs `thumbBox` rather than `thumbOf`.
 *
 * The `short` scroller is the control: its content fits on both axes, so the
 * rule says no thumb on either — an implementation that paints one thumb per
 * axis unconditionally would pass every other case and fail this one.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { maxOffset, thumbBox, type ThumbBox } from "./scrollbar.js";

/** The ids the window reports: one per painted box. */
export const BOTH_IDS = {
  probe: "scrollbar-both-probe",
  scroller: "scrollbar-both",
  content: "scrollbar-both-content",
  short: "scrollbar-both-short",
  shortContent: "scrollbar-both-short-content",
} as const;

/** The box the two-axis scroller is given: the track each thumb is measured on. */
export const BOTH_VIEWPORT = { width: 160, height: 120 } as const;

/** The content fill, distinct from both thumbs and from the page. */
export const BOTH_FILL = "#1E2A38";

/** The tint both thumbs paint, so a band read can name the colour it counts. */
export const BOTH_TINT = "#00E0C6";

/** The thickness the caller asks for. */
export const BOTH_THICKNESS = 10;

/** Content wider **and** taller than the box: the case that asks for two axes. */
export const BOTH_CONTENT = { width: 480, height: 400 } as const;

/** The control's content: inside the box on both axes, so no thumb is owed. */
export const BOTH_SHORT_CONTENT = { width: 100, height: 90 } as const;

/** The axis whose thumb a band read is looking for. */
export const BOTH_AXES = ["vertical", "horizontal"] as const;
export type BothAxis = (typeof BOTH_AXES)[number];

/** A rectangle in the viewport's own coordinates. */
export interface BothBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The viewport's extent on an axis: how far the content can move from it. */
export const bothViewport = (axis: BothAxis): number =>
  axis === "horizontal" ? BOTH_VIEWPORT.width : BOTH_VIEWPORT.height;

/**
 * The track an axis's thumb is measured on once **both** thumbs paint.
 *
 * The corner where they meet belongs to the vertical one (the binding paints it
 * first), so both tracks give up one thickness rather than overlapping.
 */
export const bothTrack = (axis: BothAxis): number =>
  bothViewport(axis) - BOTH_THICKNESS;

/** The content's extent on an axis. */
export const bothExtent = (axis: BothAxis): number =>
  axis === "horizontal" ? BOTH_CONTENT.width : BOTH_CONTENT.height;

/** How far the content can move on an axis: the viewport's share, not the track's. */
export const bothScroll = (axis: BothAxis): number =>
  maxOffset(bothExtent(axis), bothViewport(axis));

/** One axis's thumb at rest, in the viewport's own coordinates. */
export interface BothThumb {
  readonly axis: BothAxis;
  readonly track: number;
  readonly content: number;
  /** Where the thumb paints, and how long the share along the track is. */
  readonly box: BothBox;
}

/**
 * The box the rule predicts for one axis, or `None` when the content fits.
 *
 * A vertical thumb is `thickness` wide at the trailing right edge; a horizontal
 * one is `thickness` tall at the bottom edge. The corner belongs to neither
 * band: each axis's own box stops before it, so a read can tell two thumbs from
 * one thumb plus a corner.
 */
export const bothThumbOf = (
  axis: BothAxis,
  offset = 0,
): Option.Option<BothThumb> => {
  const track = bothTrack(axis);
  const content = bothExtent(axis);
  return Option.map(thumbBox(track, bothScroll(axis), offset), (thumb) => ({
    axis,
    track,
    content,
    box:
      axis === "horizontal"
        ? {
            x: thumb.start,
            y: BOTH_VIEWPORT.height - BOTH_THICKNESS,
            width: thumb.length,
            height: BOTH_THICKNESS,
          }
        : {
            x: BOTH_VIEWPORT.width - BOTH_THICKNESS,
            y: thumb.start,
            width: BOTH_THICKNESS,
            height: thumb.length,
          },
  }));
};

/**
 * The band each axis's read counts, in the viewport's coordinates.
 *
 * The two bands exclude the corner they share, so one thumb cannot answer for
 * the other: a vertical thumb would otherwise paint `thickness * thickness`
 * pixels inside the horizontal band and read as a short horizontal one.
 */
export const bothBandOf = (axis: BothAxis): BothBox =>
  axis === "horizontal"
    ? {
        x: 0,
        y: BOTH_VIEWPORT.height - BOTH_THICKNESS,
        width: BOTH_VIEWPORT.width - BOTH_THICKNESS,
        height: BOTH_THICKNESS,
      }
    : {
        x: BOTH_VIEWPORT.width - BOTH_THICKNESS,
        y: 0,
        width: BOTH_THICKNESS,
        height: BOTH_VIEWPORT.height - BOTH_THICKNESS,
      };

/**
 * The two thumbs the two-axis scroller owes at rest.
 *
 * Built like `SCROLLBAR_THUMBS`: a case whose content stopped overflowing drops
 * out, and the fixture and section tests hold the table to exactly two so the
 * arithmetic cannot shrink quietly.
 */
export const BOTH_THUMBS: ReadonlyArray<BothThumb> = Arr.getSomes(
  Arr.map(BOTH_AXES, (axis) => bothThumbOf(axis)),
);

/** One wheel the probe sends and the state the rule predicts afterwards. */
export interface BothStop {
  readonly axis: BothAxis;
  /** The wheel's deltas: a negative `deltaY` scrolls down, a negative `deltaX` right. */
  readonly deltaX: number;
  readonly deltaY: number;
  readonly label: string;
  /** The offset the renderer must hold on each axis afterwards. */
  readonly offset: { readonly x: number; readonly y: number };
  /** The thumb on the wheel's own axis, at that offset. */
  readonly thumb: ThumbBox;
}

/** How far each wheel moves the two-axis scroller. */
export const BOTH_WHEEL_BY = 100;

/** The offset a wheel past the end leaves on the vertical axis. */
export const BOTH_VERTICAL_CLAMP = -maxOffset(
  BOTH_CONTENT.height,
  BOTH_VIEWPORT.height,
);

const stopAt = (
  axis: BothAxis,
  deltaX: number,
  deltaY: number,
  offset: { readonly x: number; readonly y: number },
  label: string,
): Option.Option<BothStop> => {
  const scrolled = axis === "horizontal" ? offset.x : offset.y;
  return Option.map(
    thumbBox(bothTrack(axis), bothScroll(axis), scrolled),
    (thumb) => ({ axis, deltaX, deltaY, label, offset, thumb }),
  );
};

/**
 * Three moves: one wheel down, one past the end (so the vertical thumb clamps
 * at the track's edge), then one wheel right on the other axis. The last one is
 * only meaningful if the horizontal thumb paints at all — which is the question
 * this probe asks.
 */
export const BOTH_STOPS: ReadonlyArray<BothStop> = Arr.getSomes([
  stopAt(
    "vertical",
    0,
    -BOTH_WHEEL_BY,
    { x: 0, y: -BOTH_WHEEL_BY },
    "one wheel down",
  ),
  stopAt(
    "vertical",
    0,
    -100_000,
    { x: 0, y: BOTH_VERTICAL_CLAMP },
    "a wheel past the end",
  ),
  stopAt(
    "horizontal",
    -BOTH_WHEEL_BY,
    0,
    { x: -BOTH_WHEEL_BY, y: BOTH_VERTICAL_CLAMP },
    "one wheel right",
  ),
]);

/**
 * The checks the probe asserts, one term per group of reads:
 *
 * - the capture's device scale;
 * - the scroller's painted box, its content's, and the control's;
 * - the two colours the fixture names;
 * - per axis: the thumb paints, its length, its start, and the strip it fills;
 * - the content reaching the thumb's strip, and the strip's paint being the
 *   content's;
 * - the control whose content fits paints no thumb on either axis;
 * - per wheel: the offset read, both of its axes, the thumb still painting, its
 *   start, and the length it keeps.
 */
export const BOTH_CHECKS =
  1 + 3 + 2 + BOTH_THUMBS.length * 4 + 2 + 1 + BOTH_STOPS.length * 6;
