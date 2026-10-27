/**
 * The shape one `Slider` accepts.
 *
 * The bug these guard: a range written as a pair reached the single-value
 * primitive (so only its first end painted), and a stored array with a missing
 * or text end was read as a range and indexed as one.
 */

import { describe, expect, it } from "vitest";
import { isSliderSpan, sliderMode } from "./logic.js";

describe("isSliderSpan", () => {
  it("accepts a pair of finite numbers and nothing else", () => {
    expect(isSliderSpan([20, 70])).toBe(true);
    expect(isSliderSpan([20])).toBe(false);
    expect(isSliderSpan([20, 70, 90])).toBe(false);
    expect(isSliderSpan([20, "70"])).toBe(false);
    expect(isSliderSpan([20, Number.NaN])).toBe(false);
    expect(isSliderSpan(20)).toBe(false);
    expect(isSliderSpan(null)).toBe(false);
    expect(isSliderSpan({ from: 20, to: 70 })).toBe(false);
  });
});

describe("sliderMode", () => {
  it("paints the range surface for a pair, from whichever value decides", () => {
    expect(sliderMode([20, 70], undefined)).toBe("range");
    expect(sliderMode(undefined, [20, 70])).toBe("range");
    expect(sliderMode([20, 70], 30)).toBe("range");
  });

  it("paints one thumb for a stored shape that is not a pair", () => {
    expect(sliderMode(30, undefined)).toBe("single");
    expect(sliderMode(undefined, 30)).toBe("single");
    expect(sliderMode(undefined, undefined)).toBe("single");
    expect(sliderMode(null, [20, 70])).toBe("range");
  });
});
