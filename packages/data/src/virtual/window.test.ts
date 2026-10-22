/**
 * The window arithmetic a virtualized table runs on.
 *
 * The bugs these guard are the ones a measured probe makes possible and a
 * plausible-looking window does not: a window that follows the runtime's
 * **lagging** range report (it reads `20..27` while the paint has reached
 * `40..46`, so a window built from it paints blank rows), a window that does
 * not cover the rows in view, a reveal whose target is outside the window it
 * just asked the runtime to build, a start that runs past the last row, and a
 * **shrinking set** that leaves the offset measured against the old rows
 * (`virtual-table-lifecycle`: a filter narrowed a thousand rows to 127 while
 * the window sat near row 900, and the core's own clamp mounted five rows in a
 * viewport that holds nine).
 *
 * The arithmetic is `@tanstack/virtual-core`'s; these cases hold the seam — the
 * numbers the runtime reports and the window they produce.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  anchorOffset,
  clampScrollOffset,
  createWindowCalculator,
  maxScrollOffset,
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

describe("a set that shrinks under the window", () => {
  /** The same thousand rows the table opens on, narrowed to the `01` set. */
  const narrowed: WindowSpec = { ...spec, count: 127 };

  it("clamps the offset the reader left to the rows that remain", () => {
    // The reveal left the window at row 900; the narrowed set's last row is
    // 127, so the farthest the scroller may sit is its own content's end.
    expect(maxScrollOffset(narrowed)).toBe(127 * 36 - 320);
    expect(clampScrollOffset(narrowed, 900 * 36)).toBe(127 * 36 - 320);
    // The old offset still clamps at the top and is never negative.
    expect(clampScrollOffset(narrowed, -40)).toBe(0);
    expect(clampScrollOffset(narrowed, 120)).toBe(120);
  });

  it("holds a full viewport of the narrowed set, not the tail of the old one", () => {
    // Measured on 0.11.0: the core clamps a stale offset to the end and mounts
    // only the rows below it — five rows in a 320px viewport — because the
    // offset it clamps is still the one the large set was measured against.
    // The window is computed from the clamped offset, so the tail holds the
    // viewport's own rows as well as the ones past the edge.
    const calculator = createWindowCalculator(narrowed);
    const window = calculator.at(900 * 36);
    const rows = calculator.indicesAt(900 * 36);
    expect(window.end).toBe(127);
    expect(rows.length).toBeGreaterThanOrEqual(Math.floor(320 / 36));
    expect(rows.at(-1)).toBe(126);
    // A row above the clamped window's start is not mounted: the window is a
    // slice of the narrowed set, not of the set it was measured against.
    expect(rows.length).toBeLessThan(127);
  });

  it("drops an index the narrowed set does not hold", () => {
    const calculator = createWindowCalculator(narrowed);
    const rows = calculator.indicesAt(900 * 36);
    expect(rows.filter((index) => index >= 127)).toEqual([]);
    // A set with no rows at all mounts nothing rather than a negative index.
    expect(createWindowCalculator({ ...spec, count: 0 }).indicesAt(0)).toEqual(
      [],
    );
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
