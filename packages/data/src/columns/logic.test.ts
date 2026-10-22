/**
 * The column rules a data grid owns, held against the two window probes.
 *
 * The defects these guard are the ones a table shows and a pure layout cannot:
 *
 * - a hide that leaves the hidden track's width in the content, so every later
 *   column starts off by that width (`table-columns-lifecycle`: 690 → 610 for
 *   an 80px column);
 * - a move that changes the width or a resize that changes the order;
 * - a resize that ignores the column's own bounds, or a second gesture that
 *   starts from the width at mount rather than the width the first one ended at;
 * - a menu that hides the last visible column, leaving a header no next press
 *   can restore.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  COLUMN_KEY_STEP,
  clampColumnWidth,
  clampWidth,
  columnOffset,
  columnWidth,
  contentWidth,
  initialColumns,
  isColumnResizeKey,
  isColumnVisible,
  moveColumn,
  resizeColumn,
  resizeWidthByKey,
  setColumnVisible,
  toggleColumn,
  visibleColumns,
  widthBounds,
  type ColumnDef,
  type ColumnState,
} from "./logic.js";

const defs: ReadonlyArray<ColumnDef> = [
  { id: "name", label: "Name", width: 260, minWidth: 120, maxWidth: 420 },
  { id: "status", label: "Status", width: 110, minWidth: 80, maxWidth: 220 },
  { id: "size", label: "Size", width: 90, minWidth: 70, maxWidth: 200 },
];

const opened = (): ColumnState => initialColumns(defs);

/** The visible ids, in paint order. */
const ids = (state: ColumnState): ReadonlyArray<string> =>
  visibleColumns(state).map((column) => column.id);

/** A configured width, failing the case when the column is missing. */
const widthOf = (state: ColumnState, id: string): number =>
  Option.getOrElse(columnWidth(state, id), () => {
    throw new Error(`no column ${id}`);
  });

/** A visible column's left edge, failing the case when it is hidden. */
const offsetOf = (state: ColumnState, id: string): number =>
  Option.getOrElse(columnOffset(state, id), () => {
    throw new Error(`no visible column ${id}`);
  });

describe("column configuration", () => {
  it("takes a hidden column's width out of the content and shifts later columns", () => {
    const state = opened();
    expect(contentWidth(state)).toBe(460);
    expect(offsetOf(state, "size")).toBe(370);

    const hidden = setColumnVisible(state, "status", false);

    expect(ids(hidden)).toEqual(["name", "size"]);
    expect(contentWidth(hidden)).toBe(350);
    // Every later column moves left by exactly the hidden track's width.
    expect(offsetOf(hidden, "size")).toBe(370 - 110);
    expect(Option.isNone(columnOffset(hidden, "status"))).toBe(true);
    // The configured width survives hiding, so restoring does not reset it.
    expect(widthOf(hidden, "status")).toBe(110);
    expect(ids(setColumnVisible(hidden, "status", true))).toEqual([
      "name",
      "status",
      "size",
    ]);
  });

  it("refuses to hide the last visible column", () => {
    const withoutStatus = setColumnVisible(opened(), "status", false);
    const oneLeft = setColumnVisible(withoutStatus, "size", false);
    expect(ids(oneLeft)).toEqual(["name"]);

    expect(setColumnVisible(oneLeft, "name", false)).toBe(oneLeft);
    expect(toggleColumn(oneLeft, "name")).toBe(oneLeft);
    expect(isColumnVisible(oneLeft, "name")).toBe(true);
  });

  it("moves a column through the visible order without touching a width", () => {
    const state = opened();
    const moved = moveColumn(state, "name", 1);

    expect(ids(moved)).toEqual(["status", "name", "size"]);
    expect(contentWidth(moved)).toBe(contentWidth(state));
    expect(widthOf(moved, "name")).toBe(260);
    expect(widthOf(moved, "status")).toBe(110);

    // Both ends clamp rather than wrap.
    expect(moveColumn(state, "name", -1)).toBe(state);
    expect(moveColumn(state, "size", 1)).toBe(state);
  });

  it("moves over a hidden column instead of spending the step on it", () => {
    const hidden = setColumnVisible(opened(), "status", false);
    const moved = moveColumn(hidden, "size", -1);

    expect(ids(moved)).toEqual(["size", "name"]);
    // The hidden column keeps its place and its width.
    expect(isColumnVisible(moved, "status")).toBe(false);
    expect(widthOf(moved, "status")).toBe(110);
    expect(contentWidth(moved)).toBe(350);
  });

  it("resizes within the column's own bounds and leaves other tracks alone", () => {
    const state = opened();

    const atMax = resizeColumn(state, "name", 10_000);
    expect(widthOf(atMax, "name")).toBe(420);
    expect(widthOf(atMax, "status")).toBe(110);
    expect(contentWidth(atMax)).toBe(620);

    const atMin = resizeColumn(state, "size", 5);
    expect(widthOf(atMin, "size")).toBe(70);
    expect(widthOf(atMin, "name")).toBe(260);

    // A hidden track resizes too: a menu restores it at the width it was given.
    const hidden = resizeColumn(
      setColumnVisible(state, "status", false),
      "status",
      160,
    );
    expect(widthOf(hidden, "status")).toBe(160);
    expect(contentWidth(hidden)).toBe(350);
  });

  it("leaves the state alone for a width or an id it cannot use", () => {
    const state = opened();
    expect(resizeColumn(state, "missing", 200)).toBe(state);
    expect(moveColumn(state, "missing", 1)).toBe(state);
    expect(toggleColumn(state, "missing")).toBe(state);
    expect(setColumnVisible(state, "missing", false)).toBe(state);
  });

  it("clamps a declaration whose maximum is below its minimum", () => {
    expect(widthBounds(200, 100)).toEqual({ minWidth: 200, maxWidth: 200 });
    expect(widthBounds(0, 640)).toEqual({ minWidth: 1, maxWidth: 640 });
    expect(clampWidth(50, { minWidth: 200, maxWidth: 200 })).toBe(200);

    const clamped = initialColumns([
      { id: "narrow", label: "Narrow", width: 10, minWidth: 90 },
    ]);
    expect(widthOf(clamped, "narrow")).toBe(90);
  });

  it("steps a focused divider and names the bounds", () => {
    const bounds = widthBounds(120, 420);
    expect(COLUMN_KEY_STEP).toBe(16);

    expect(resizeWidthByKey(260, "right", bounds)).toBe(276);
    expect(resizeWidthByKey(260, "left", bounds)).toBe(244);
    expect(resizeWidthByKey(260, "right", bounds, 4)).toBe(264);
    expect(resizeWidthByKey(120, "left", bounds)).toBe(120);
    expect(resizeWidthByKey(410, "right", bounds)).toBe(420);
    expect(resizeWidthByKey(260, "home", bounds)).toBe(120);
    expect(resizeWidthByKey(260, "end", bounds)).toBe(420);
  });

  it("reads the runtime's own key names", () => {
    expect(isColumnResizeKey("right")).toBe(true);
    expect(isColumnResizeKey("home")).toBe(true);
    // The DOM spelling is not the runtime's: a divider that tests for
    // `ArrowRight` never hears a key.
    expect(isColumnResizeKey("ArrowRight")).toBe(false);
    expect(isColumnResizeKey("enter")).toBe(false);
  });

  it("clamps a column's own bounds with the defaults filled in", () => {
    const [name, , size] = defs;
    if (name === undefined || size === undefined) {
      throw new Error("the fixture lost a column");
    }
    expect(clampColumnWidth(10_000, name)).toBe(420);
    expect(clampColumnWidth(1, size)).toBe(70);
    expect(clampColumnWidth(10_000, { id: "x", label: "X", width: 100 })).toBe(
      640,
    );
  });
});
