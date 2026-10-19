/**
 * The runtime's reported box is a hybrid: the origin is the content origin
 * (inside the border and padding) while the size excludes only the border.
 * `paintedBox` is the one correction, and these cases pin its arithmetic before
 * a runtime suite ever mounts a window (plan `597`).
 */

import { describe, expect, it } from "vitest";
import { paintedBox, viewportBox } from "../core/bounds.js";

describe("paintedBox", () => {
  it("adds the border back and removes the padding twice from the origin", () => {
    // Measured on the pinned release build: a 100 × 36 box at (12, 12) with
    // `padding: 10` and `borderWidth: 1` reports this.
    expect(
      paintedBox(
        { x: 23, y: 23, width: 98, height: 34 },
        { padding: 10, borderWidth: 1 },
      ),
    ).toStrictEqual({ x: 12, y: 12, width: 100, height: 36 });
  });

  it("leaves an element with no border or padding at its reported box", () => {
    const reported = { x: 40, y: 8, width: 120, height: 18 };
    expect(paintedBox(reported, { display: "flex" })).toStrictEqual(reported);
  });

  it("prefers a side's longhand over the shorthand", () => {
    // `padding: 10` with `paddingLeft: 0` must not add 10 to the left origin,
    // and a three-pixel top border must come off the top and add to the height.
    expect(
      paintedBox(
        { x: 22, y: 23, width: 98, height: 34 },
        {
          padding: 10,
          paddingLeft: 0,
          borderWidth: 1,
          borderTopWidth: 3,
        },
      ),
    ).toStrictEqual({ x: 21, y: 10, width: 100, height: 38 });
  });

  it("ignores a non-finite style length instead of poisoning the box", () => {
    expect(
      paintedBox(
        { x: 10, y: 10, width: 50, height: 20 },
        { paddingLeft: Number.NaN, borderWidth: Number.POSITIVE_INFINITY },
      ),
    ).toStrictEqual({ x: 10, y: 10, width: 50, height: 20 });
  });
});

describe("viewportBox", () => {
  it("is the identity for a scroller that has not moved", () => {
    const reported = { x: 12, y: 91, width: 928, height: 552 };
    expect(viewportBox(reported, { x: 0, y: 0 })).toStrictEqual(reported);
  });

  it("moves a downward scroll's report back up by its offset", () => {
    // Measured on the pinned release build (plan 598): the same scroller reports
    // from its content origin, so a −109 scroll slides the whole report.
    expect(
      viewportBox(
        { x: 16, y: -18, width: 928, height: 552 },
        { x: 0, y: -109 },
      ),
    ).toStrictEqual({ x: 16, y: 91, width: 928, height: 552 });
  });

  it("handles both axes and leaves the reported box untouched", () => {
    const reported = { x: 104, y: 36, width: 300, height: 120 };
    expect(viewportBox(reported, { x: 100, y: -24 })).toStrictEqual({
      x: 4,
      y: 60,
      width: 300,
      height: 120,
    });
    expect(reported).toStrictEqual({ x: 104, y: 36, width: 300, height: 120 });
  });
});
