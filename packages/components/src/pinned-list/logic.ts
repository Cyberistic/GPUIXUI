/**
 * Where a sectioned list's headers paint while the list scrolls.
 *
 * The runtime paints no `position: "sticky"` (measured: a sticky child scrolls
 * with its scroller), so a pinned header is not a layout mode here: it is a row
 * the component **repositions from the scroll offset**. The list measures each
 * section once, then every frame puts a header at
 *
 * ```
 * min(max(sectionTop + offset, 0), sectionBottom + offset − headerHeight)
 * ```
 *
 * — travelling with its section, held at the viewport top once it reaches it,
 * and pushed up as the section's last row leaves. The header is painted once, in
 * a layer over the scroller; the content carries an empty spacer of the same
 * height, so nothing is duplicated and the reading order is the list's own.
 *
 * All of it is arithmetic over measured heights and one offset, so the frames
 * are checked without a window.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";

/** One section of a pinned list. */
export interface PinnedListSection {
  /** The section's title. It is also the section's key. */
  readonly title: string;
  readonly children?: ReactNode;
}

/**
 * Whether a stored entry is a section: an object naming itself with a text
 * title.
 *
 * The title is the section's identity — the key its measured height is kept
 * with, the group's accessible name and the words its header paints — so an
 * entry without one is not a section. Nothing else is read here: a section's
 * content is React nodes, which no structural read can describe.
 */
const isSection = (entry: unknown): entry is PinnedListSection => {
  if (typeof entry !== "object" || entry === null || !("title" in entry)) {
    return false;
  }
  const title = entry.title;
  return typeof title === "string" && title.trim().length > 0;
};

/**
 * The sections a caller's list carries, read at the boundary.
 *
 * A sectioned list is composed in code as often as it is restored with a saved
 * layout, and JSON writes `null` for a list a record never carried: `Arr.map`
 * over that value threw `self is not iterable` before the first header painted.
 * Only a real list is a list, and an entry that does not name itself is dropped
 * while its neighbours paint, so one malformed record cannot take the list
 * down; the empty list paints nothing.
 */
export const sectionsOf = (
  value: ReadonlyArray<PinnedListSection> | null | undefined,
): ReadonlyArray<PinnedListSection> => {
  const list = Option.getOrElse(
    Option.filter(Option.fromNullishOr(value), (entries): boolean =>
      Arr.isArray(entries),
    ),
    () => [],
  );
  return Arr.filter(list, isSection);
};

/** One section's measured height, in content space. */
export interface PinnedSectionHeight {
  /** The section's content-space top: the sum of the heights above it. */
  readonly top: number;
  readonly height: number;
}

/** Where one section's header paints in the frame just sampled. */
export interface PinnedHeaderFrame {
  readonly index: number;
  /** The header's painted top inside the viewport, in pixels. */
  readonly top: number;
  /**
   * Whether the header is being held rather than travelling with its section —
   * the state a border belongs to, because a held header sits over moving rows.
   */
  readonly pinned: boolean;
  /** Whether any part of the header can be seen; a pushed-out one paints nothing. */
  readonly visible: boolean;
}

/** The house header height, in pixels. */
export const pinnedHeaderHeight = 32;

/** A header height a caller can paint with, or the house one. */
export const headerHeightOf = (height: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(height, (value) => Number.isFinite(value) && value > 0),
      Math.round,
    ),
    () => pinnedHeaderHeight,
  );

/** A measured height, or `0` before the layout has reported one. */
const measurable = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : 0;

/** A tenth of a pixel is the finest the runtime paints, and rounding keeps a held header still. */
const tenth = (value: number): number => Math.round(value * 10) / 10;

/**
 * The content-space top of every section, folded from the measured heights.
 *
 * The offsets come from the heights rather than from each section's painted `y`:
 * a painted `y` already carries the scroll offset and the header's own shift, so
 * measuring it would feed the paint back into the measurement.
 */
export const sectionBands = (
  heights: ReadonlyArray<number>,
): ReadonlyArray<PinnedSectionHeight> =>
  Arr.mapAccum(heights, 0, (top, height) => {
    const safe = measurable(height);
    return [top + safe, { top, height: safe }];
  })[1];

/**
 * Every header's painted top for one scroll offset.
 *
 * `offsetY` is the clamped offset `scrollMetrics` publishes (`0` at the start,
 * negative as the list scrolls), so a header above the viewport clamps to `0`
 * and one being pushed out reports a negative top — the part still on screen.
 */
export const pinnedHeaders = (
  heights: ReadonlyArray<number>,
  offsetY: number,
  headerHeight: number,
): ReadonlyArray<PinnedHeaderFrame> => {
  const header = headerHeightOf(Option.some(headerHeight));
  const offset = Number.isFinite(offsetY) ? Math.min(0, offsetY) : 0;
  return Arr.map(sectionBands(heights), ({ top, height }, index) => {
    const natural = top + offset;
    const bottom = top + height + offset;
    const painted = Math.min(Math.max(natural, 0), bottom - header);
    return {
      index,
      top: tenth(painted),
      pinned: natural < 0,
      visible: height > 0 && painted + header > 0,
    };
  });
};
