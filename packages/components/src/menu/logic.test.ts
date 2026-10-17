/**
 * Menu highlight transitions.
 *
 * The bugs these guard: `ArrowDown` from the last row stopped instead of
 * wrapping to the first; a keyboard move highlighted a disabled row, so Enter
 * did nothing while the highlight said it would; and focusing a row that is not
 * in the menu left the previous highlight in place with a stale id.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  initial,
  isActive,
  move,
  resolveActiveIndex,
  type MenuItemSpec,
  type MenuState,
} from "./logic.js";

const rows = (
  spec: ReadonlyArray<readonly [number, boolean?]>,
): ReadonlyArray<MenuItemSpec> =>
  spec.map(([id, disabled]) => ({ id, disabled: disabled ?? false }));

const four = rows([[101], [102], [103], [104]]);

const withDisabled = rows([[101], [102, true], [103]]);

describe("initial", () => {
  it("highlights nothing", () => {
    expect(initial).toEqual({ activeId: Option.none() });
    expect(isActive(initial, 101)).toBe(false);
  });
});

describe("Move", () => {
  it("starts at the first row going down and the last going up", () => {
    expect(move(initial, four, { _tag: "Move", delta: 1 }).activeId).toEqual(
      Option.some(101),
    );
    expect(move(initial, four, { _tag: "Move", delta: -1 }).activeId).toEqual(
      Option.some(104),
    );
  });

  it("wraps past the end", () => {
    const last: MenuState = { activeId: Option.some(104) };
    expect(move(last, four, { _tag: "Move", delta: 1 }).activeId).toEqual(
      Option.some(101),
    );
    expect(
      move({ activeId: Option.some(101) }, four, { _tag: "Move", delta: -1 })
        .activeId,
    ).toEqual(Option.some(104));
  });

  it("skips a disabled row in the direction of travel", () => {
    expect(
      move({ activeId: Option.some(101) }, withDisabled, {
        _tag: "Move",
        delta: 1,
      }).activeId,
    ).toEqual(Option.some(103));
    expect(
      move({ activeId: Option.some(103) }, withDisabled, {
        _tag: "Move",
        delta: -1,
      }).activeId,
    ).toEqual(Option.some(101));
  });

  it("leaves the highlight unchanged when every row is disabled", () => {
    const state: MenuState = { activeId: Option.some(101) };
    expect(
      move(state, rows([[101, true]]), { _tag: "Move", delta: 1 }).activeId,
    ).toEqual(state.activeId);
  });
});

describe("First and Last", () => {
  it("jump to the first and last enabled row", () => {
    expect(move(initial, withDisabled, { _tag: "First" }).activeId).toEqual(
      Option.some(101),
    );
    expect(move(initial, withDisabled, { _tag: "Last" }).activeId).toEqual(
      Option.some(103),
    );
  });

  it("skip a disabled row at either end", () => {
    const edges = rows([[101, true], [102], [103, true]]);
    expect(move(initial, edges, { _tag: "First" }).activeId).toEqual(
      Option.some(102),
    );
    expect(move(initial, edges, { _tag: "Last" }).activeId).toEqual(
      Option.some(102),
    );
  });
});

describe("Focus and Reset", () => {
  it("focuses an enabled row", () => {
    expect(
      move(initial, withDisabled, { _tag: "Focus", id: 103 }).activeId,
    ).toEqual(Option.some(103));
  });

  it("ignores a disabled row", () => {
    const state: MenuState = { activeId: Option.some(101) };
    expect(move(state, withDisabled, { _tag: "Focus", id: 102 })).toEqual(
      state,
    );
  });

  it("ignores a row that is not in the menu", () => {
    const state: MenuState = { activeId: Option.some(101) };
    expect(move(state, withDisabled, { _tag: "Focus", id: 999 })).toEqual(
      state,
    );
  });

  it("clears the highlight", () => {
    expect(
      move({ activeId: Option.some(101) }, four, { _tag: "Reset" }),
    ).toEqual(initial);
  });
});

describe("resolveActiveIndex", () => {
  it("reports the position of the active row", () => {
    expect(resolveActiveIndex({ activeId: Option.some(103) }, four)).toEqual(
      Option.some(2),
    );
  });

  it("is none when nothing is active or the row is gone", () => {
    expect(resolveActiveIndex(initial, four)).toEqual(Option.none());
    expect(resolveActiveIndex({ activeId: Option.some(999) }, four)).toEqual(
      Option.none(),
    );
  });
});
