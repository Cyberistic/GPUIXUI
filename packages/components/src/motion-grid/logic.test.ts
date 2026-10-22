/**
 * MotionGrid's arithmetic.
 *
 * The bugs this guards: a fractional cell leaving a seam between two cells whose
 * painted widths do not add up to the frame; a grid that can be told it has no
 * columns, so the frame has no width and the first cell divides by zero; a
 * caller's `NaN` reaching the runtime as a `null` measure; a frame that is sized
 * by the current arrangement instead of the caller's columns; and a slot that
 * does not wrap at the last column, so every cell after the first row leaves the
 * frame.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  motionGridCellWidth,
  motionGridColumnCount,
  motionGridGap,
  motionGridHeight,
  motionGridLayout,
  motionGridRowHeight,
  motionGridRows,
  motionGridSlot,
  motionGridWidth,
} from "./logic.js";

/** The suite's grid: 3 columns of 100 × 80 with 10 px gaps. */
const layout = motionGridLayout({
  columns: Option.some(3),
  cellWidth: Option.some(100),
  rowHeight: Option.some(80),
  gap: Option.some(10),
});

describe("motionGridLayout", () => {
  it("uses the house measures when the caller names none", () => {
    expect(
      motionGridLayout({
        columns: Option.none(),
        cellWidth: Option.none(),
        rowHeight: Option.none(),
        gap: Option.none(),
      }),
    ).toEqual({
      columns: motionGridColumnCount,
      cellWidth: motionGridCellWidth,
      rowHeight: motionGridRowHeight,
      gap: motionGridGap,
    });
  });

  it("floors the column count and never lets it reach zero", () => {
    const withColumns = (columns: number) =>
      motionGridLayout({
        columns: Option.some(columns),
        cellWidth: Option.none(),
        rowHeight: Option.none(),
        gap: Option.none(),
      }).columns;

    expect(withColumns(4.9)).toBe(4);
    expect(withColumns(0)).toBe(1);
    expect(withColumns(-6)).toBe(1);
  });

  it("rounds a cell to whole pixels and holds it above zero", () => {
    const withCellWidth = (cellWidth: number) =>
      motionGridLayout({
        columns: Option.none(),
        cellWidth: Option.some(cellWidth),
        rowHeight: Option.none(),
        gap: Option.none(),
      });

    expect(withCellWidth(120.4).cellWidth).toBe(120);
    expect(withCellWidth(120.6).cellWidth).toBe(121);
    expect(withCellWidth(0.4).cellWidth).toBe(1);
    expect(withCellWidth(-40).cellWidth).toBe(1);
  });

  it("holds a gap at zero while allowing a wide one", () => {
    const withGap = (gap: number) =>
      motionGridLayout({
        columns: Option.none(),
        cellWidth: Option.none(),
        rowHeight: Option.none(),
        gap: Option.some(gap),
      }).gap;

    expect(withGap(24)).toBe(24);
    expect(withGap(-8)).toBe(0);
  });

  it("falls back rather than handing the runtime an unreadable measure", () => {
    const unreadable = motionGridLayout({
      columns: Option.some(Number.NaN),
      cellWidth: Option.some(Number.POSITIVE_INFINITY),
      rowHeight: Option.some(Number.NEGATIVE_INFINITY),
      gap: Option.some(Number.NaN),
    });

    expect(unreadable).toEqual({
      columns: motionGridColumnCount,
      cellWidth: motionGridCellWidth,
      rowHeight: motionGridRowHeight,
      gap: motionGridGap,
    });
  });
});

describe("the frame's size", () => {
  it("counts the rows a cell count needs", () => {
    expect(motionGridRows(0, 3)).toBe(0);
    expect(motionGridRows(1, 3)).toBe(1);
    expect(motionGridRows(3, 3)).toBe(1);
    expect(motionGridRows(4, 3)).toBe(2);
    expect(motionGridRows(7, 3)).toBe(3);
  });

  it("reserves every declared column, even when the last row is short", () => {
    // The width is the caller's arrangement, not the cells on screen: a filter
    // that removes a cell must not resize the frame under the ones that stay.
    expect(motionGridWidth(layout)).toBe(320);
    expect(motionGridRows(1, layout.columns)).toBe(1);
  });

  it("adds the gaps between rows and paints an empty grid as no height", () => {
    expect(motionGridHeight(layout, 0)).toBe(0);
    expect(motionGridHeight(layout, 1)).toBe(80);
    expect(motionGridHeight(layout, 2)).toBe(170);
    expect(motionGridHeight(layout, 3)).toBe(260);
  });
});

describe("motionGridSlot", () => {
  it("places a cell left to right inside the first row", () => {
    expect(motionGridSlot(layout, 0)).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 80,
    });
    expect(motionGridSlot(layout, 2)).toMatchObject({ left: 220, top: 0 });
  });

  it("wraps past the last column onto the next row", () => {
    expect(motionGridSlot(layout, 3)).toMatchObject({ left: 0, top: 90 });
    expect(motionGridSlot(layout, 5)).toMatchObject({ left: 220, top: 90 });
    expect(motionGridSlot(layout, 6)).toMatchObject({ left: 0, top: 180 });
  });

  it("keeps every slot inside the frame it computed", () => {
    const width = motionGridWidth(layout);
    const height = motionGridHeight(layout, motionGridRows(11, layout.columns));

    Arr.forEach(Arr.range(0, 10), (index) => {
      const slot = motionGridSlot(layout, index);
      expect(slot.left).toBeGreaterThanOrEqual(0);
      expect(slot.top).toBeGreaterThanOrEqual(0);
      expect(slot.left + slot.width).toBeLessThanOrEqual(width);
      expect(slot.top + slot.height).toBeLessThanOrEqual(height);
    });
  });
});
