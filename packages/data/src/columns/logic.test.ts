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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  COLUMN_KEY_STEP,
  clampColumnWidth,
  clampWidth,
  columnConfig,
  columnOffset,
  columnWidth,
  contentWidth,
  hiddenColumns,
  initialColumns,
  isColumnResizeKey,
  isColumnVisible,
  moveColumn,
  resizeColumn,
  resizeWidthByKey,
  restoreColumns,
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

  it("names the columns a reader cannot see, in paint order", () => {
    expect(hiddenColumns(opened())).toEqual([]);

    const hidden = setColumnVisible(opened(), "status", false);

    // The row model reads this list to keep a hidden track out of the search,
    // so it names the hidden columns and nothing else.
    expect(hiddenColumns(hidden)).toEqual(["status"]);
    expect(hiddenColumns(setColumnVisible(hidden, "name", false))).toEqual([
      "name",
      "status",
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
    // The hidden track keeps the slot it occupied, so restoring it returns it
    // to the reader's own order rather than to the moved column's edge.
    expect(Arr.map(moved.columns, (column) => column.id)).toEqual([
      "size",
      "status",
      "name",
    ]);
  });

  it("moves a column several places in one call, not only by swapping it", () => {
    const state = opened();

    // A two-place move puts `name` after `size` and shifts both columns it
    // stepped over left; swapping the source and the target would leave
    // `status` after `size`, which is not the order a reader asked for.
    const moved = moveColumn(state, "name", 2);
    expect(ids(moved)).toEqual(["status", "size", "name"]);
    expect(contentWidth(moved)).toBe(460);
    expect(widthOf(moved, "name")).toBe(260);

    expect(ids(moveColumn(state, "size", -2))).toEqual([
      "size",
      "name",
      "status",
    ]);

    // A step past either end clamps at the end rather than stopping one short.
    expect(ids(moveColumn(state, "name", 9))).toEqual([
      "status",
      "size",
      "name",
    ]);
    expect(ids(moveColumn(state, "size", -9))).toEqual([
      "size",
      "name",
      "status",
    ]);
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

  it("reads a bound or a step it cannot use as its default", () => {
    // A bound is often computed (a stored size, a measurement). `NaN` used to
    // survive `widthBounds`, clamp every width to `NaN`, and take the content
    // width and every later offset with it; a `NaN` step snapped a key resize
    // to the column's minimum.
    expect(widthBounds(Number.NaN, 640)).toEqual({
      minWidth: 80,
      maxWidth: 640,
    });
    expect(widthBounds(120, Number.NaN)).toEqual({
      minWidth: 120,
      maxWidth: 640,
    });
    expect(
      widthBounds(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
    ).toEqual({ minWidth: 80, maxWidth: 640 });

    const computed = initialColumns([
      { id: "measured", label: "Measured", width: 260, maxWidth: Number.NaN },
    ]);
    expect(widthOf(computed, "measured")).toBe(260);
    expect(contentWidth(computed)).toBe(260);
    expect(
      widthOf(resizeColumn(computed, "measured", 10_000), "measured"),
    ).toBe(640);

    expect(
      resizeWidthByKey(260, "right", widthBounds(120, 420), Number.NaN),
    ).toBe(260 + COLUMN_KEY_STEP);
  });

  it("reads a width it cannot use as a track that paints", () => {
    // A width is computed too — a stored size, a measurement, a fraction of the
    // table — and `NaN` survived `clampWidth`, so one unreadable declaration
    // took `contentWidth` and every later offset with it and the grid painted
    // no track at all. Only `NaN` is unreadable: an infinite width is a legal
    // declaration that clamps to the column's own maximum.
    const bounds = widthBounds(120, 420);
    expect(clampWidth(Number.NaN, bounds)).toBe(120);
    expect(clampWidth(Number.POSITIVE_INFINITY, bounds)).toBe(420);
    expect(clampWidth(Number.NEGATIVE_INFINITY, bounds)).toBe(120);

    const computed = initialColumns([
      { id: "measured", label: "Measured", width: Number.NaN, minWidth: 120 },
      { id: "after", label: "After", width: 90 },
    ]);
    expect(widthOf(computed, "measured")).toBe(120);
    expect(contentWidth(computed)).toBe(210);
    expect(offsetOf(computed, "after")).toBe(120);

    // The reducer leaves a legal track alone: a broken measurement must not
    // shrink the column a later one reads.
    const state = opened();
    expect(resizeColumn(state, "name", Number.NaN)).toBe(state);

    // A key press repairs the track and steps from the narrowest legal width.
    expect(resizeWidthByKey(Number.NaN, "right", bounds)).toBe(136);
    expect(resizeWidthByKey(Number.NaN, "left", bounds)).toBe(120);
    expect(resizeWidthByKey(Number.NaN, "end", bounds)).toBe(420);
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

/**
 * The configuration a store keeps, restored over the definitions a release
 * ships.
 *
 * A saved column set is data: the release that reads it may have added,
 * renamed or dropped a column since, and a store writes `null` for a field it
 * never set. Dereferencing it would take the first frame down, and applying it
 * whole would paint a column the grid no longer has — or drop one it now does.
 */
describe("a saved column configuration", () => {
  /** A value through the JSON a store writes and reads back. */
  const StoredJson = Schema.fromJsonString(Schema.Unknown);
  const throughStore = (value: unknown): unknown =>
    Schema.decodeSync(StoredJson)(Schema.encodeSync(StoredJson)(value));

  it("saves the order, the hidden ids and the widths, and restores them", () => {
    const state = resizeColumn(
      setColumnVisible(
        moveColumn(initialColumns(defs), "size", -2),
        "status",
        false,
      ),
      "size",
      120,
    );
    const saved = throughStore(columnConfig(state));
    const restored = restoreColumns(defs, saved);
    expect(restored).toEqual(state);
  });

  it("applies the saved order and leaves the definition's words and bounds", () => {
    const restored = restoreColumns(defs, {
      order: ["size", "name"],
      widths: { size: 120 },
    });
    expect(Arr.map(restored.columns, (column) => column.id)).toEqual([
      "size",
      "name",
      "status",
    ]);
    const size = restored.columns[0];
    expect(size).toMatchObject({ label: "Size", minWidth: 70, width: 120 });
  });

  it("skips an id this release dropped and appends one it added", () => {
    const current: ReadonlyArray<ColumnDef> = [
      ...defs,
      { id: "owner", label: "Owner", width: 140 },
    ];
    const restored = restoreColumns(current, {
      order: ["size", "gone", "name"],
      hidden: ["gone"],
    });
    expect(Arr.map(restored.columns, (column) => column.id)).toEqual([
      "size",
      "name",
      "status",
      "owner",
    ]);
    expect(hiddenColumns(restored)).toEqual([]);
  });

  it("reads a width it cannot paint as the definition's own", () => {
    const restored = restoreColumns(defs, {
      widths: { name: NaN, status: Infinity, size: "120" },
    });
    expect(Arr.map(restored.columns, (column) => column.width)).toEqual([
      260, 110, 90,
    ]);
  });

  it("clamps a saved width to the column's own bounds", () => {
    const restored = restoreColumns(defs, { widths: { size: 10_000 } });
    expect(columnWidth(restored, "size")).toEqual(Option.some(200));
  });

  it("keeps one column painted when the saved set hides them all", () => {
    const restored = restoreColumns(defs, {
      hidden: ["name", "status", "size"],
    });
    expect(Arr.map(visibleColumns(restored), (column) => column.id)).toEqual([
      "size",
    ]);
  });

  it("reads a state that is not a configuration as the shipped columns", () => {
    expect(
      Arr.map([null, undefined, 42, "columns"], (stored) =>
        restoreColumns(defs, stored),
      ),
    ).toEqual([
      initialColumns(defs),
      initialColumns(defs),
      initialColumns(defs),
      initialColumns(defs),
    ]);
  });
});
