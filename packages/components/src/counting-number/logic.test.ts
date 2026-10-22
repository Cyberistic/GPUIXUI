/**
 * What a counting number prints, without a renderer.
 *
 * The bugs these guard: a `NaN` value printed as "NaN", a decimal count that
 * throws inside `toFixed`, and a duration that is fractional, negative or not
 * finite and leaves the tween sampling forever.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { countDuration, countedText } from "./logic.js";

describe("countedText", () => {
  it("rounds to whole numbers unless the caller asks for decimals", () => {
    expect(countedText(12.6)).toBe("13");
    expect(countedText(12.6, { decimals: 1 })).toBe("12.6");
    expect(countedText(12, { decimals: 2 })).toBe("12.00");
  });

  it("prints an unreadable value as zero instead of NaN or Infinity", () => {
    expect(countedText(Number.NaN)).toBe("0");
    expect(countedText(Number.POSITIVE_INFINITY)).toBe("0");
    expect(countedText(Number.NaN, { decimals: 1 })).toBe("0.0");
  });

  it("clamps a decimal count to what toFixed accepts", () => {
    expect(countedText(1.25, { decimals: 99 })).toBe("1.25000000000000000000");
    expect(countedText(1.5, { decimals: -2 })).toBe("2");
  });

  it("lets a format own the text whole, decimals included", () => {
    expect(
      countedText(1284.4, {
        decimals: 3,
        format: (value) => `$${Math.round(value)}`,
      }),
    ).toBe("$1284");
  });
});

describe("countDuration", () => {
  it("keeps a whole, non-negative span", () => {
    expect(countDuration(Option.some(320), 200)).toBe(320);
    expect(countDuration(Option.some(12.6), 200)).toBe(13);
    expect(countDuration(Option.some(0), 200)).toBe(0);
  });

  it("falls back for a span that cannot run", () => {
    expect(countDuration(Option.none(), 200)).toBe(200);
    expect(countDuration(Option.some(-1), 200)).toBe(200);
    expect(countDuration(Option.some(Number.NaN), 200)).toBe(200);
  });
});
