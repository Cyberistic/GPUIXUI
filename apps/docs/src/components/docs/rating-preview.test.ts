import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rateAt } from "./rating-preview";

/**
 * A press on a star rates the half it landed in, and the page still hands the
 * press to a star.
 *
 * Guarded bug: the Rating page printed "press a star to rate" beside stars that
 * were `aria-hidden` spans, and the only way to change the score was a row of
 * number buttons — so pressing a star did nothing.
 */

const BOX = { x: 100, width: 40 };

describe("a press on a star", () => {
  it("reads the left half as the half below it", () => {
    expect(rateAt(3, 110, BOX, true)).toBe(2.5);
  });

  it("reads the right half as the whole star", () => {
    expect(rateAt(3, 130, BOX, true)).toBe(3);
  });

  it("is the whole star when halves are not allowed", () => {
    expect(rateAt(3, 110, BOX, false)).toBe(3);
  });

  it("is the whole star when the press or the box is missing", () => {
    expect(rateAt(4, null, BOX, true)).toBe(4);
    expect(rateAt(4, 110, null, true)).toBe(4);
  });

  it("cannot read a zero-width star as a half", () => {
    expect(rateAt(4, 110, { x: 100, width: 0 }, true)).toBe(4);
  });
});

describe("the rating drawing", () => {
  const source = readFileSync(
    new URL("./rating-demo.tsx", import.meta.url),
    "utf8",
  );

  it("hands the press to the star rather than to a number row", () => {
    expect(source).toContain("rateAt");
    expect(source).toContain("onPress");
    expect(source).not.toContain('gx-btn-sm gx-btn-outline" key={score}');
  });

  it("steps with the primitive's keyboard contract", () => {
    expect(source).toContain("decideRating");
    expect(source).toContain("starState");
  });
});
