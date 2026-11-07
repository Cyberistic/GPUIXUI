import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decideValueKey, stepValue } from "@gpuixui/primitives/core";
import * as Option from "effect/Option";
import {
  dragSpan,
  shiftSpan,
  thumbFractions,
  trackPaint,
  valueKey,
} from "./slider-preview";

const RANGE = { min: 0, max: 100, step: 1 } as const;
const PRICE = { min: 0, max: 200, step: 5 } as const;

describe("the track a value paints", () => {
  it("fills from the start of the track to a single thumb", () => {
    expect(trackPaint([62], RANGE)).toStrictEqual({ left: 0, width: 0.62 });
  });

  it("fills between the two ends of a pair, on the range's own scale", () => {
    expect(trackPaint([20, 80], PRICE)).toStrictEqual({
      left: 0.1,
      width: 0.3,
    });
  });

  it("paints the thumb at the same fraction the fill ends on", () => {
    const values = [20, 80];
    const paint = trackPaint(values, PRICE);
    const [start, end] = thumbFractions(values, PRICE);

    expect(start).toBe(paint.left);
    expect(end).toBe(paint.left + paint.width);
  });

  it("reads the number it paints: 62 is 62% of a 0..100 range", () => {
    const thumb = thumbFractions([62], RANGE)[0] ?? NaN;

    expect(thumb).toBe(0.62);
    expect(Math.round(thumb * 100)).toBe(62);
  });
});

describe("a key on the drawing", () => {
  it("names an arrow the way the primitive does, so it steps", () => {
    expect(valueKey("ArrowRight")).toBe("right");
    expect(valueKey("ArrowUp")).toBe("up");
    expect(valueKey("Home")).toBe("home");
    expect(decideValueKey(62, RANGE, valueKey("ArrowRight"))).toStrictEqual(
      Option.some(63),
    );
    expect(decideValueKey(62, RANGE, valueKey("PageDown"))).toStrictEqual(
      Option.some(52),
    );
  });
});

describe("the stepper", () => {
  it("moves a value by exactly one step and stops at both ends", () => {
    expect(stepValue(62, RANGE, 1)).toBe(63);
    expect(stepValue(62, RANGE, -1)).toBe(61);
    expect(stepValue(0, RANGE, -1)).toBe(0);
    expect(stepValue(100, RANGE, 1)).toBe(100);
  });

  it("slides a window by a step without changing its width inside the range", () => {
    expect(shiftSpan({ start: 20, end: 80 }, 1, PRICE)).toStrictEqual({
      start: 25,
      end: 85,
    });
    expect(shiftSpan({ start: 20, end: 80 }, -1, PRICE)).toStrictEqual({
      start: 15,
      end: 75,
    });
  });

  it("stops the window's end at the bound instead of leaving the range", () => {
    expect(shiftSpan({ start: 105, end: 195 }, 1, PRICE)).toStrictEqual({
      start: 110,
      end: 200,
    });
    expect(shiftSpan({ start: 0, end: 60 }, -1, PRICE)).toStrictEqual({
      start: 0,
      end: 60,
    });
  });
});

describe("a range drag", () => {
  it("moves the end under the pointer and pins the other", () => {
    expect(dragSpan({ anchor: 20 }, 55, RANGE)).toStrictEqual({
      start: 20,
      end: 55,
    });

    expect(dragSpan({ anchor: 80 }, 64, RANGE)).toStrictEqual({
      start: 64,
      end: 80,
    });
  });

  it("keeps the ends ordered when one is dragged past the other", () => {
    expect(dragSpan({ anchor: 20 }, 95, RANGE)).toStrictEqual({
      start: 20,
      end: 95,
    });
    expect(dragSpan({ anchor: 80 }, 3, RANGE)).toStrictEqual({
      start: 3,
      end: 80,
    });
  });

  it("opens a coincident pair around the press, in either direction", () => {
    expect(dragSpan({ anchor: 50 }, 70, RANGE)).toStrictEqual({
      start: 50,
      end: 70,
    });
    expect(dragSpan({ anchor: 50 }, 20, RANGE)).toStrictEqual({
      start: 20,
      end: 50,
    });
  });

  it("holds a press that does not move", () => {
    expect(dragSpan({ anchor: 50 }, 50, RANGE)).toStrictEqual({
      start: 50,
      end: 50,
    });
  });

  it("lets one end cross its pair and keeps following the pointer", () => {
    const crossing = dragSpan({ anchor: 80 }, 20, RANGE);
    expect(crossing).toStrictEqual({ start: 20, end: 80 });

    const beyond = dragSpan({ anchor: 80 }, 95, RANGE);
    expect(beyond).toStrictEqual({ start: 80, end: 95 });
  });
});

describe("the slider drawings", () => {
  const read = (name: string) =>
    readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

  it("take their aim and keys from the primitive, not a fixed percentage", () => {
    const drawing = read("slider-drawing.tsx");

    for (const call of [
      "pointerValue",
      "decideValueKey",
      "nearestEnd",
      "moveSpanEnd",
    ]) {
      expect(drawing).toContain(call);
    }
    expect(drawing).toContain('from "@gpuixui/primitives/core"');
  });

  it("paint every page's track through the one drawing", () => {
    for (const demo of [
      "slider-demo.tsx",
      "range-slider-demo.tsx",
      "slider-values-demo.tsx",
    ]) {
      const source = read(demo);
      expect(source).toContain("SliderDrawing");

      expect(source).not.toContain("gx-slider-fill");
    }
  });

  it("capture the pointer for the whole drag", () => {
    const drawing = read("slider-drawing.tsx");

    expect(drawing).toContain("setPointerCapture");
    expect(drawing).toContain("releasePointerCapture");
  });
});
