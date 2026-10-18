/**
 * Guards the column-width model a resizable data grid depends on.
 *
 * The bugs these catch: a cell placed at the wrong left edge (so the header and
 * the body disagree), a resize that inverts past a column's minimum or maximum,
 * a width change that re-renders every no-op drag step, and a pan bound derived
 * from the default widths instead of the resized ones.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import {
  COLUMNS,
  boundsOf,
  contentWidth,
  describeWidths,
  initialWidths,
  maxPan,
  offsetOf,
  resetWidths,
  setWidth,
  widthOf,
} from "./column-resize-model.js";

describe("initialWidths", () => {
  it("is the four declared defaults", () => {
    expect(initialWidths).toEqual({
      name: 200,
      status: 120,
      size: 90,
      notes: 150,
    });
  });

  it("sums to the row width", () => {
    expect(contentWidth(initialWidths)).toBe(560);
  });
});

describe("offsetOf", () => {
  it("starts each cell after the widths before it", () => {
    expect(COLUMNS.map((column) => offsetOf(initialWidths, column.id))).toEqual(
      [0, 200, 320, 410],
    );
  });

  it("moves every later cell when one column grows", () => {
    const grown = setWidth(initialWidths, "status", 160);
    expect(offsetOf(grown, "size")).toBe(360);
    expect(offsetOf(grown, "name")).toBe(0);
  });

  it("has no offset for an unknown column", () => {
    expect(offsetOf(initialWidths, "missing")).toBe(0);
    expect(widthOf(initialWidths, "missing")).toBe(0);
  });
});

describe("setWidth", () => {
  it("clamps at the minimum and the maximum inclusively", () => {
    expect(widthOf(setWidth(initialWidths, "name", 10), "name")).toBe(96);
    expect(widthOf(setWidth(initialWidths, "name", 9999), "name")).toBe(320);
    expect(widthOf(setWidth(initialWidths, "name", 96), "name")).toBe(96);
    expect(widthOf(setWidth(initialWidths, "name", 320), "name")).toBe(320);
  });

  it("returns the same record for a no-op or an unknown column", () => {
    expect(setWidth(initialWidths, "name", 200)).toBe(initialWidths);
    expect(setWidth(initialWidths, "missing", 500)).toBe(initialWidths);
  });

  it("does not mutate the record it was given", () => {
    setWidth(initialWidths, "name", 260);
    expect(widthOf(initialWidths, "name")).toBe(200);
  });

  it("reports the column's bounds", () => {
    expect(boundsOf("size")).toEqual(Option.some({ min: 64, max: 180 }));
    expect(Option.isNone(boundsOf("missing"))).toBe(true);
  });
});

describe("maxPan", () => {
  it("is the content that overflows the viewport, as a negative offset", () => {
    expect(maxPan(initialWidths, 360)).toBe(-200);
  });

  it("is zero when the content fits", () => {
    expect(maxPan(initialWidths, 560)).toBe(0);
    expect(maxPan(initialWidths, 700)).toBe(0);
  });

  it("follows a resize rather than the defaults", () => {
    const narrow = setWidth(initialWidths, "notes", 80);
    expect(maxPan(narrow, 360)).toBe(-130);
  });
});

describe("resetWidths", () => {
  it("restores every default in a fresh record", () => {
    const changed = setWidth(initialWidths, "name", 300);
    const reset = resetWidths();
    expect(reset).toEqual(initialWidths);
    expect(reset).not.toBe(initialWidths);
    expect(widthOf(changed, "name")).toBe(300);
    expect(contentWidth(reset)).toBe(560);
  });
});

describe("describeWidths", () => {
  it("prints in column order and reflects a resize", () => {
    expect(describeWidths(initialWidths)).toBe(
      "name=200 status=120 size=90 notes=150",
    );
    expect(describeWidths(setWidth(initialWidths, "status", 140))).toBe(
      "name=200 status=140 size=90 notes=150",
    );
  });
});
