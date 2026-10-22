/**
 * The window arithmetic a virtualized table runs on.
 *
 * The bugs these guard are the ones a measured probe makes possible and a
 * plausible-looking window does not: a window that follows the runtime's
 * **lagging** range report (it reads `20..27` while the paint has reached
 * `40..46`, so a window built from it paints blank rows), a window that does
 * not cover the rows in view, a reveal whose target is outside the window it
 * just asked the runtime to build, and a start that runs past the last row.
 *
 * The arithmetic is `@tanstack/virtual-core`'s; these cases hold the seam — the
 * numbers the runtime reports and the window they produce.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  anchorOffset,
  createWindowCalculator,
  type WindowSpec,
} from "./window.js";

/** 1 000 rows of 36px in a 320px viewport: nine rows in view, four overdraw. */
const spec: WindowSpec = {
  count: 1_000,
  rowHeight: 36,
  viewportHeight: 320,
  overdraw: 4,
};

describe("the mounted window", () => {
  it("mounts the rows in view plus overdraw on each side", () => {
    const calculator = createWindowCalculator(spec);
    // Half way down, ten rows are in view and four more are mounted on each
    // side: the range the runtime reports lags the paint by one gesture, so
    // the window has to be wider than the viewport.
    const window = calculator.at(500);
    expect(window.start).toBe(9);
    expect(window.end).toBe(27);
    expect(window.end - window.start).toBeGreaterThan(
      spec.viewportHeight / spec.rowHeight,
    );
  });

  it("never mounts more rows than exist", () => {
    const calculator = createWindowCalculator({ ...spec, count: 5 });
    expect(calculator.at(0)).toEqual({ start: 0, end: 5 });
    const empty = createWindowCalculator({ ...spec, count: 0 });
    expect(empty.at(0)).toEqual({ start: 0, end: 0 });
  });

  it("follows the scroll offset, not the range the runtime reports", () => {
    const calculator = createWindowCalculator(spec);
    // The paint after one wheel reached row 16; the report still read 0..8.
    const window = calculator.at(16 * 36);
    expect(window.start).toBeLessThanOrEqual(16);
    expect(window.end).toBeGreaterThan(16 + 8);
  });

  it("clamps at the top and at the last row", () => {
    const calculator = createWindowCalculator(spec);
    expect(calculator.at(-500).start).toBe(0);
    const end = calculator.at(1_000 * 36);
    expect(end.end).toBe(1_000);
  });

  it("lists exactly the indices it mounts", () => {
    const calculator = createWindowCalculator(spec);
    const indices = calculator.indicesAt(0);
    expect(indices[0]).toBe(0);
    expect(indices.length).toBe(13);
    // The indices are contiguous: a gap would leave an estimate box.
    expect(indices).toEqual(
      Array.from({ length: indices.length }, (_, at) => at),
    );
  });
});

describe("a reveal", () => {
  it("mounts the target with overdraw rows above it", () => {
    const calculator = createWindowCalculator(spec);
    const window = calculator.around(900);
    expect(window.start).toBeLessThanOrEqual(900);
    expect(window.end).toBeGreaterThan(900);
  });

  it("clamps a target near either end instead of leaving blank rows", () => {
    const calculator = createWindowCalculator(spec);
    expect(calculator.around(0).start).toBe(0);
    expect(calculator.around(999).end).toBe(1_000);
  });
});

describe("the scroll anchor", () => {
  it("reads the pixel the viewport's top edge is at", () => {
    // The runtime reports `[itemIndex, offsetInItemPx, viewportHeightPx]`.
    const offset = anchorOffset(Option.some([16, 24, 272]), 36);
    expect(offset).toStrictEqual(Option.some(16 * 36 + 24));
  });

  it("is absent when the runtime reports no anchor", () => {
    expect(anchorOffset(Option.none(), 36)).toStrictEqual(Option.none());
  });
});

describe("degenerate sizes", () => {
  it("treats a zero row height as one pixel rather than dividing by zero", () => {
    const calculator = createWindowCalculator({
      count: 100,
      rowHeight: 0,
      viewportHeight: 10,
    });
    // Ten one-pixel rows fit, plus four overdraw rows.
    expect(calculator.at(0).end).toBe(14);
  });

  it("keeps a negative overdraw at zero", () => {
    const calculator = createWindowCalculator({
      ...spec,
      overdraw: -3,
    });
    // The nine rows in view and nothing around them.
    expect(calculator.at(0).end).toBe(9);
  });
});
