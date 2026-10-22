/**
 * Toolbar roving and overflow.
 *
 * The bugs these guard: the roving stop landed on a disabled action, an arrow
 * past the end stopped instead of wrapping, the overflow split hid the first
 * action it should have kept, and an empty budget still showed a strip.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  initialRoving,
  moveRoving,
  splitOverflow,
  type ToolbarItemSpec,
} from "./logic.js";

const items = (count: number): ReadonlyArray<ToolbarItemSpec> =>
  Arr.map(Arr.range(1, count), (i) => ({ id: `a${i}`, disabled: false }));

const ids = (rows: ReadonlyArray<ToolbarItemSpec>): ReadonlyArray<string> =>
  Arr.map(rows, (row) => row.id);

describe("splitOverflow", () => {
  it("keeps every action visible when the count fits", () => {
    expect(splitOverflow(items(3), 4)).toEqual({
      visible: items(3),
      overflow: [],
    });
  });

  it("reserves the last slot for the overflow trigger", () => {
    const split = splitOverflow(items(5), 3);
    expect(ids(split.visible)).toEqual(["a1", "a2"]);
    expect(ids(split.overflow)).toEqual(["a3", "a4", "a5"]);
  });

  it("overflows everything when the budget is zero (negative control)", () => {
    const split = splitOverflow(items(2), 0);
    expect(split.visible).toHaveLength(0);
    expect(ids(split.overflow)).toEqual(["a1", "a2"]);
  });
});

describe("moveRoving", () => {
  const skip = (index: number): boolean => index === 1;

  it("skips a disabled action in the direction of travel", () => {
    expect(moveRoving(0, 3, 1, skip)).toEqual(Option.some(2));
    expect(moveRoving(2, 3, -1, skip)).toEqual(Option.some(0));
  });

  it("wraps past the ends", () => {
    expect(moveRoving(2, 3, 1, () => false)).toEqual(Option.some(0));
    expect(moveRoving(0, 3, -1, () => false)).toEqual(Option.some(2));
  });

  it("has no tab stop when every action is disabled (negative control)", () => {
    expect(initialRoving(3, () => true)).toEqual(Option.none());
  });
});
