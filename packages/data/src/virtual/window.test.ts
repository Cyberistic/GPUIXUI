import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  anchorOffset,
  clampScrollOffset,
  createWindowCalculator,
  DEFAULT_OVERDRAW,
  DEFAULT_ROW_HEIGHT,
  maxScrollOffset,
  overdrawRows,
  rowCount,
  rowHeightOf,
  rowIndex,
  type WindowSpec,
} from "./window.js";

const spec: WindowSpec = {
  count: 1_000,
  rowHeight: 36,
  viewportHeight: 320,
  overdraw: 4,
};

describe("the mounted window", () => {
  it("mounts the rows in view plus overdraw on each side", () => {
    const calculator = createWindowCalculator(spec);

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
    const offset = anchorOffset(Option.some([16, 24, 272]), 36);
    expect(offset).toStrictEqual(Option.some(16 * 36 + 24));
  });

  it("is absent when the runtime reports no anchor", () => {
    expect(anchorOffset(Option.none(), 36)).toStrictEqual(Option.none());
  });
});

describe("a set that shrinks under the window", () => {
  const narrowed: WindowSpec = { ...spec, count: 127 };

  it("clamps the offset the reader left to the rows that remain", () => {
    expect(maxScrollOffset(narrowed)).toBe(127 * 36 - 320);
    expect(clampScrollOffset(narrowed, 900 * 36)).toBe(127 * 36 - 320);

    expect(clampScrollOffset(narrowed, -40)).toBe(0);
    expect(clampScrollOffset(narrowed, 120)).toBe(120);
  });

  it("holds a full viewport of the narrowed set, not the tail of the old one", () => {
    const calculator = createWindowCalculator(narrowed);
    const window = calculator.at(900 * 36);
    const rows = calculator.indicesAt(900 * 36);
    expect(window.end).toBe(127);
    expect(rows.length).toBeGreaterThanOrEqual(Math.floor(320 / 36));
    expect(rows.at(-1)).toBe(126);

    expect(rows.length).toBeLessThan(127);
  });

  it("drops an index the narrowed set does not hold", () => {
    const calculator = createWindowCalculator(narrowed);
    const rows = calculator.indicesAt(900 * 36);
    expect(rows.filter((index) => index >= 127)).toEqual([]);

    expect(createWindowCalculator({ ...spec, count: 0 }).indicesAt(0)).toEqual(
      [],
    );
  });
});

describe("degenerate sizes", () => {
  it("reads a zero row height as the row this package paints", () => {
    const calculator = createWindowCalculator({
      count: 100,
      rowHeight: 0,
      viewportHeight: 10,
    });

    expect(calculator.at(0).end).toBe(5);
  });

  it("keeps a negative overdraw at zero", () => {
    const calculator = createWindowCalculator({
      ...spec,
      overdraw: -3,
    });

    expect(calculator.at(0).end).toBe(9);
  });

  it("reads an overdraw the window cannot mount as the default", () => {
    [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].forEach(
      (overdraw) => {
        const calculator = createWindowCalculator({ ...spec, overdraw });
        expect(calculator.indicesAt(0), `${overdraw}`).toHaveLength(13);
        expect(calculator.at(0), `${overdraw}`).toEqual({ start: 0, end: 13 });
      },
    );
  });

  it("reads a fractional overdraw as whole rows", () => {
    const calculator = createWindowCalculator({ ...spec, overdraw: 2.7 });
    expect(calculator.at(0)).toEqual({ start: 0, end: 11 });
  });
});

describe("the overdraw a window holds", () => {
  it("keeps a countable overdraw, floored and never negative", () => {
    expect(overdrawRows(4)).toBe(4);
    expect(overdrawRows(2.7)).toBe(2);
    expect(overdrawRows(0)).toBe(0);

    expect(overdrawRows(-3)).toBe(0);
  });

  it("reads an overdraw nothing could mount as the documented default", () => {
    expect(overdrawRows(undefined)).toBe(DEFAULT_OVERDRAW);
    expect(overdrawRows(Number.NaN)).toBe(DEFAULT_OVERDRAW);
    expect(overdrawRows(Number.POSITIVE_INFINITY)).toBe(DEFAULT_OVERDRAW);
    expect(overdrawRows(Number.NEGATIVE_INFINITY)).toBe(DEFAULT_OVERDRAW);
  });
});

describe("a row height the window can divide", () => {
  it("keeps a height the runtime can lay out", () => {
    expect(rowHeightOf(36)).toBe(36);

    expect(rowHeightOf(36.5)).toBe(36.5);
  });

  it("reads a height nothing could be read from as the row this package paints", () => {
    [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0,
      -8,
    ].forEach((height) => {
      expect(rowHeightOf(height), `${height}`).toBe(DEFAULT_ROW_HEIGHT);
    });
    expect(rowHeightOf(undefined)).toBe(DEFAULT_ROW_HEIGHT);
  });

  it("takes the fallback the caller's own rows paint", () => {
    expect(rowHeightOf(Number.NaN, 28)).toBe(28);
    expect(rowHeightOf(28, 32)).toBe(28);
  });

  it("mounts a viewport of rows, not a row per pixel", () => {
    const calculator = createWindowCalculator({
      count: 1_000,
      rowHeight: Number.NaN,
      viewportHeight: 240,
    });
    const rows = calculator.indicesAt(0);
    expect(rows.length).toBeLessThan(20);
    expect(rows.length).toBeGreaterThanOrEqual(
      Math.floor(240 / DEFAULT_ROW_HEIGHT),
    );
    expect(calculator.at(0).start).toBe(0);
  });

  it("follows the anchor at the height it divides by", () => {
    expect(anchorOffset(Option.some([16, 24, 272]), Number.NaN)).toStrictEqual(
      Option.some(16 * DEFAULT_ROW_HEIGHT + 24),
    );
  });
});

describe("a row index the window can position", () => {
  it("reads an index as a whole, non-negative row", () => {
    expect(rowIndex(2.7)).toBe(2);
    expect(rowIndex(0)).toBe(0);
    expect(rowIndex(-3)).toBe(0);
    expect(rowIndex(Number.NaN)).toBe(0);
    expect(rowIndex(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("positions an anchor at the row it names", () => {
    expect(anchorOffset(Option.some([16.4, 0, 272]), 36)).toStrictEqual(
      Option.some(16 * 36),
    );

    expect(anchorOffset(Option.some([Number.NaN, 8, 272]), 36)).toStrictEqual(
      Option.some(8),
    );
    expect(anchorOffset(Option.some([4, Number.NaN, 272]), 36)).toStrictEqual(
      Option.some(4 * 36),
    );
  });

  it("reveals a row the window can find", () => {
    const calculator = createWindowCalculator({
      count: 1_000,
      rowHeight: Number.NaN,
      viewportHeight: 240,
    });

    expect(calculator.around(Number.NaN).start).toBe(0);
    expect(calculator.around(900).start).toBeLessThanOrEqual(900);
  });
});

describe("the count a window can hold", () => {
  it("reads a computed count as the whole, non-negative rows it holds", () => {
    expect(rowCount(2.5)).toBe(2);
    expect(rowCount(0)).toBe(0);
    expect(rowCount(-3)).toBe(0);
    expect(rowCount(Number.NaN)).toBe(0);
    expect(rowCount(Number.POSITIVE_INFINITY)).toBe(0);
    expect(rowCount(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(rowCount(1_000)).toBe(1_000);
  });
});
