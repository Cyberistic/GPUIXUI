/**
 * Selection's rules, as data.
 *
 * The bugs these guard, all measured by `modifier-select-lifecycle` and
 * `table-filter-lifecycle`: a plain press that adds instead of replacing; a
 * Shift range that moves the anchor so a second Shift extends from the wrong
 * row; a toggle that keeps the old anchor; a filter that keeps a selection it
 * no longer paints; a clear that also forgets the anchor it needs; and an
 * arrow step that wraps from the last row to the first.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import {
  allSelected,
  clearSelection,
  emptySelection,
  isSelected,
  moveSelection,
  pressMode,
  pressSelection,
  retainSelection,
  selectAll,
  selectionSize,
  someSelected,
  type SelectionState,
} from "./logic.js";

const order = ["r1", "r2", "r3", "r4", "r5"];

const chosen = (state: SelectionState): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable<string>(state.selected), Order.String);

describe("pressMode", () => {
  it("reads the chord the runtime reports", () => {
    expect(pressMode({})).toBe("replace");
    expect(pressMode({ shift: true })).toBe("range");
    expect(pressMode({ cmd: true })).toBe("toggle");
    expect(pressMode({ ctrl: true })).toBe("toggle");
    expect(pressMode({ shift: true, cmd: true })).toBe("range");
  });
});

describe("pressSelection", () => {
  it("replaces the set on a plain press and anchors it", () => {
    const first = pressSelection(emptySelection, "r2", "replace", order);
    const second = pressSelection(first, "r4", "replace", order);
    expect(chosen(second)).toEqual(["r4"]);
    expect(second.anchor).toEqual(Option.some("r4"));
  });

  it("extends a range from the anchor and keeps it", () => {
    const start = pressSelection(emptySelection, "r2", "replace", order);
    const range = pressSelection(start, "r4", "range", order);
    expect(chosen(range)).toEqual(["r2", "r3", "r4"]);
    expect(range.anchor).toEqual(Option.some("r2"));
  });

  it("extends backwards when the range press is above the anchor", () => {
    const start = pressSelection(emptySelection, "r4", "replace", order);
    expect(chosen(pressSelection(start, "r2", "range", order))).toEqual([
      "r2",
      "r3",
      "r4",
    ]);
  });

  it("adds and removes a record with the toggle chord, moving the anchor", () => {
    const start = pressSelection(emptySelection, "r1", "replace", order);
    const added = pressSelection(start, "r3", "toggle", order);
    expect(chosen(added)).toEqual(["r1", "r3"]);
    expect(added.anchor).toEqual(Option.some("r3"));
    const removed = pressSelection(added, "r3", "toggle", order);
    expect(chosen(removed)).toEqual(["r1"]);
    expect(removed.anchor).toEqual(Option.some("r3"));
  });

  it("falls back to a replace when the anchor is outside the visible order", () => {
    const state: SelectionState = {
      selected: HashSet.make("hidden"),
      anchor: Option.some("hidden"),
    };
    const range = pressSelection(state, "r3", "range", order);
    expect(chosen(range)).toEqual(["r3"]);
    expect(range.anchor).toEqual(Option.some("r3"));
  });
});

describe("the visible set's ownership", () => {
  it("releases a chosen record a narrower set hides", () => {
    const state = pressSelection(
      pressSelection(emptySelection, "r1", "replace", order),
      "r4",
      "toggle",
      order,
    );
    const retained = retainSelection(state, ["r1", "r2"]);
    expect(chosen(retained)).toEqual(["r1"]);
  });

  it("keeps a selection the set still holds, including a clear", () => {
    const state = pressSelection(emptySelection, "r1", "replace", order);
    expect(chosen(retainSelection(state, order))).toEqual(["r1"]);
    expect(chosen(retainSelection(state, []))).toEqual([]);
  });

  it("paints the record again when a wider set brings it back", () => {
    // The retention `useTable` applies is a view, not a write: the reader's
    // record stays chosen through a narrowing query and a widening one paints
    // it chosen again (`table-filter-lifecycle`: 1 rows · 0 selected, then
    // 60 rows · 2 selected with the same two records). A permanent clear is
    // `clearSelection`, not a narrowing filter.
    const state = pressSelection(emptySelection, "r4", "replace", order);
    const narrowed = retainSelection(state, ["r1", "r2"]);
    expect(chosen(narrowed)).toEqual([]);
    expect(chosen(retainSelection(state, order))).toEqual(["r4"]);
    expect(chosen(retainSelection(clearSelection(state), order))).toEqual([]);
  });

  it("drops an anchor the set no longer shows", () => {
    const state = pressSelection(emptySelection, "r4", "replace", order);
    expect(retainSelection(state, ["r1"]).anchor).toEqual(Option.none());
  });
});

describe("select all and clear", () => {
  it("chooses every visible record", () => {
    const all = selectAll(emptySelection, order);
    expect(selectionSize(all)).toBe(5);
    expect(isSelected(all, "r5")).toBe(true);
  });

  it("clears the set and the anchor", () => {
    const state = pressSelection(emptySelection, "r3", "replace", order);
    const cleared = clearSelection(state);
    expect(selectionSize(cleared)).toBe(0);
    expect(cleared.anchor).toEqual(Option.none());
  });
});

describe("the header checkbox's three states", () => {
  it("is unchecked, mixed and checked as the visible set fills", () => {
    const none = emptySelection;
    const some = pressSelection(none, "r2", "replace", order);
    const all = selectAll(none, order);

    expect([allSelected(none, order), someSelected(none, order)]).toEqual([
      false,
      false,
    ]);
    expect([allSelected(some, order), someSelected(some, order)]).toEqual([
      false,
      true,
    ]);
    expect([allSelected(all, order), someSelected(all, order)]).toEqual([
      true,
      false,
    ]);
  });

  it("reads the visible order, not every record the state still holds", () => {
    // A query that hides a chosen record paints a table with nothing chosen, so
    // the header cannot claim a hidden record is visible. The retention is the
    // controller's view (`retainSelection`), and this is the same rule stated
    // over the keys the header actually paints.
    const state = pressSelection(emptySelection, "r4", "replace", order);
    const visible = ["r1", "r2"];

    expect(allSelected(retainSelection(state, visible), visible)).toBe(false);
    expect(someSelected(retainSelection(state, visible), visible)).toBe(false);
  });

  it("does not call an empty table fully chosen", () => {
    // Both false is what leaves the header unchecked and `disabled` over no
    // rows; `every` over an empty array would otherwise claim the whole set.
    expect([
      allSelected(emptySelection, []),
      someSelected(emptySelection, []),
    ]).toEqual([false, false]);
  });
});

describe("moveSelection", () => {
  it("steps one row and clamps at both ends", () => {
    const first = pressSelection(emptySelection, "r1", "replace", order);
    expect(chosen(moveSelection(first, order, 1))).toEqual(["r2"]);
    expect(chosen(moveSelection(first, order, -1))).toEqual(["r1"]);

    const last = pressSelection(emptySelection, "r5", "replace", order);
    expect(chosen(moveSelection(last, order, 1))).toEqual(["r5"]);
  });

  it("starts at the first row when nothing is chosen", () => {
    expect(chosen(moveSelection(emptySelection, order, 1))).toEqual(["r1"]);
  });
});
