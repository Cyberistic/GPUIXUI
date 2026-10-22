/**
 * The toolbar's roving tab stop and overflow split.
 *
 * Pure so it is provable without a renderer. `splitOverflow` decides which
 * actions stay in the strip; `initialRoving` and `moveRoving` decide which
 * action holds the single tab stop.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { decideMove, rovingIndex } from "@gpuixui/primitives";

/** One toolbar action, reduced to what navigation needs. */
export interface ToolbarItemSpec {
  readonly id: string;
  readonly disabled: boolean;
}

/** How a too-wide toolbar splits into the visible strip and its overflow menu. */
export interface OverflowSplit {
  readonly visible: ReadonlyArray<ToolbarItemSpec>;
  readonly overflow: ReadonlyArray<ToolbarItemSpec>;
}

/**
 * Split a flat action list so at most `max` slots stay visible. The last visible
 * slot is reserved for the overflow trigger, so `max - 1` actions stay in the
 * strip and the rest overflow. `max <= 0` overflows everything.
 */
export const splitOverflow = (
  items: ReadonlyArray<ToolbarItemSpec>,
  max: number,
): OverflowSplit => {
  const count = Arr.length(items);
  if (max <= 0) return { visible: [], overflow: items };
  if (count <= max) return { visible: items, overflow: [] };
  const visibleCount = max - 1;
  return {
    visible: Arr.take(items, visibleCount),
    overflow: Arr.drop(items, visibleCount),
  };
};

/** The index that holds the toolbar's single tab stop; `None` when all disabled. */
export const initialRoving = (
  count: number,
  isDisabled: (index: number) => boolean,
): Option.Option<number> => rovingIndex(count, Option.none(), isDisabled);

/** Move the roving tab stop with an arrow, wrapping and skipping disabled. */
export const moveRoving = (
  current: number,
  count: number,
  delta: 1 | -1,
  isDisabled: (index: number) => boolean,
): Option.Option<number> =>
  decideMove(
    current,
    count,
    delta === 1 ? "right" : "left",
    "horizontal",
    isDisabled,
  );
