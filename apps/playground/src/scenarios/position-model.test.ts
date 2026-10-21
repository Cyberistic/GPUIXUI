/**
 * The positioning contract's arithmetic (plan `839`).
 *
 * The bug being guarded: the containing block, the inset rules and the flow
 * slot of a `relative` box were prose only, so a model that placed a box from
 * the wrong edge, treated a missing inset as `0`, or let a stretched box keep
 * its auto size would have passed while the scenario asserted those numbers.
 */
import { describe, expect, it } from "vitest";
import {
  flowNext,
  outsideOf,
  paddingBoxOrigin,
  placeAxis,
  placeIn,
  relativePaint,
} from "./position-model.js";
import { allSides } from "./box-inset-model.js";

describe("the containing block", () => {
  it("is the padding box: the report already excludes the border", () => {
    expect(
      paddingBoxOrigin({ x: 22, y: 22, width: 192, height: 92 }, allSides(8)),
    ).toEqual({ x: 14, y: 14 });
  });

  it("subtracts per-side insets independently", () => {
    expect(
      paddingBoxOrigin(
        { x: 40, y: 8, width: 200, height: 100 },
        { top: 4, right: 8, bottom: 0, left: 0 },
      ),
    ).toEqual({ x: 40, y: 4 });
  });
});

describe("inset resolution on one axis", () => {
  const base = { extent: 200, staticStart: 0, autoSize: 30 };

  it("places a sized box at its leading inset", () => {
    expect(placeAxis({ ...base, size: 40, leading: 10, trailing: 10 })).toEqual(
      {
        start: 10,
        size: 40,
      },
    );
  });

  it("places a sized box from the far edge when only the trailing inset is set", () => {
    expect(placeAxis({ ...base, size: 30, trailing: 10 })).toEqual({
      start: 160,
      size: 30,
    });
  });

  it("stretches between both insets when no size is declared", () => {
    expect(placeAxis({ ...base, leading: 10, trailing: 10 })).toEqual({
      start: 10,
      size: 180,
    });
  });

  it("keeps the static start when neither inset is set", () => {
    expect(placeAxis({ ...base, size: 30 })).toEqual({ start: 0, size: 30 });
    expect(placeAxis({ ...base, size: 30, staticStart: 34 })).toEqual({
      start: 34,
      size: 30,
    });
    expect(placeAxis({ ...base, staticStart: 34 })).toEqual({
      start: 34,
      size: 30,
    });
  });

  it("treats a declared zero as an inset, not as absent", () => {
    expect(placeAxis({ ...base, leading: 0, trailing: 10 })).toEqual({
      start: 0,
      size: 190,
    });
  });
});

describe("a relative box", () => {
  it("paints at its flow origin plus its offset", () => {
    expect(relativePaint({ x: 10, y: 40 }, { x: 15, y: 10 })).toEqual({
      x: 25,
      y: 50,
    });
  });

  it("leaves the next sibling at the unoffset slot", () => {
    expect(flowNext({ x: 10, y: 40 }, 20)).toEqual({ x: 10, y: 60 });
  });
});

describe("an out-of-bounds box", () => {
  const parent = { x: 0, y: 0, width: 200, height: 100 };

  it("reports a negative inset outside the parent", () => {
    expect(outsideOf(parent, { x: -10, y: -10, width: 30, height: 30 })).toBe(
      true,
    );
  });

  it("accepts an exactly fitting box", () => {
    expect(outsideOf(parent, { x: 0, y: 0, width: 200, height: 100 })).toBe(
      false,
    );
  });

  it("catches an overflow on each trailing side", () => {
    expect(outsideOf(parent, { x: 180, y: 0, width: 30, height: 10 })).toBe(
      true,
    );
    expect(outsideOf(parent, { x: 0, y: 90, width: 10, height: 30 })).toBe(
      true,
    );
  });
});

describe("both axes from one placement", () => {
  it("answers left/top/width/height together", () => {
    const placed = placeIn(
      { x: 10, y: 10 },
      { width: 200, height: 100 },
      { left: 10, right: 10, top: 10, bottom: 10, width: 40, height: 20 },
      { x: 10, y: 10 },
      { width: 30, height: 30 },
    );
    expect(placed.origin).toEqual({ x: 20, y: 20 });
    expect(placed.size).toEqual({ width: 40, height: 20 });
  });

  it("stretches both axes when the box declares no size", () => {
    const placed = placeIn(
      { x: 10, y: 10 },
      { width: 200, height: 100 },
      { left: 10, right: 10, top: 10, bottom: 10 },
      { x: 10, y: 10 },
      { width: 30, height: 30 },
    );
    expect(placed.origin).toEqual({ x: 20, y: 20 });
    expect(placed.size).toEqual({ width: 180, height: 80 });
  });

  it("falls back to the static origin when no inset is declared", () => {
    const placed = placeIn(
      { x: 10, y: 10 },
      { width: 200, height: 100 },
      { width: 30, height: 30 },
      { x: 22, y: 34 },
      { width: 30, height: 30 },
    );
    expect(placed.origin).toEqual({ x: 22, y: 34 });
  });
});
