import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { decideMove, rovingIndex } from "@gpuixui/primitives";

export interface ToolbarItemSpec {
  readonly id: string;
  readonly disabled: boolean;
}

export interface OverflowSplit {
  readonly visible: ReadonlyArray<ToolbarItemSpec>;
  readonly overflow: ReadonlyArray<ToolbarItemSpec>;
}

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

export const initialRoving = (
  count: number,
  isDisabled: (index: number) => boolean,
): Option.Option<number> => rovingIndex(count, Option.none(), isDisabled);

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
