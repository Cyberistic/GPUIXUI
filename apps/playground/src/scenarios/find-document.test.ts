/**
 * The arithmetic `search-virtual-document` stands on.
 *
 * The probe's premise is that a row index cannot stand in for a match count, and
 * its evidence is the offset it hands the runtime. If these rules are wrong the
 * probe can still be green — it would just be measuring the wrong number — so
 * they are held here without a renderer.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  LATE_ROW,
  QUERY,
  REPLACEMENT,
  ROWS,
  ROW_HEIGHT,
  VIEWPORT,
  documentRows,
  indexRows,
  lateMatchIndex,
  locateMatch,
  occurrences,
  replaceMatches,
  rowText,
  totalMatches,
} from "./find-document.js";

const rowsWith = (count: number): ReadonlyArray<number> =>
  Arr.map(
    Arr.filter(documentRows, (row) => row.matches === count),
    (row) => row.index,
  );

const rowAt = (index: number) => Arr.get(documentRows, index);

/** The late row's offset, or `-1` for a row the document does not have. */
const lateOffset = (): number =>
  Option.getOrElse(
    Option.map(rowAt(LATE_ROW), (row) => row.offset),
    () => -1,
  );

describe("the find document", () => {
  it("varies its match count, so a row index is not a match count", () => {
    expect(rowsWith(0).length).toBeGreaterThan(0);
    expect(rowsWith(1).length).toBeGreaterThan(0);
    expect(rowsWith(2).length).toBeGreaterThan(0);
    // Two per row would make `rowIndex * 2` a working shortcut.
    expect(totalMatches(documentRows)).not.toBe(ROWS * 2);
    expect(Arr.map(Arr.take(documentRows, 6), (row) => row.matches)).toEqual([
      2, 2, 2, 1, 2, 0,
    ]);
  });

  it("builds each row's text with exactly the matches it declares", () => {
    expect(
      Arr.map(
        Arr.filter(
          documentRows,
          (row) => occurrences(row.text, QUERY) !== row.matches,
        ),
        (row) => row.index,
      ),
    ).toEqual([]);
    expect(
      Arr.map(
        Arr.filter(documentRows, (row) => row.text !== rowText(row.index)),
        (row) => row.index,
      ),
    ).toEqual([]);
  });

  it("offsets each row by the matches above it", () => {
    expect(Option.map(Arr.head(documentRows), (row) => row.offset)).toEqual(
      Option.some(0),
    );
    expect(
      Arr.map(
        Arr.filter(
          documentRows,
          (row) =>
            row.offset !== totalMatches(Arr.take(documentRows, row.index)),
        ),
        (row) => row.index,
      ),
    ).toEqual([]);
    // The shortcut the probe tries: the row index is not the match count.
    expect(Option.isSome(rowAt(LATE_ROW))).toBe(true);
    expect(lateOffset()).not.toBe(LATE_ROW);
    expect(lateOffset()).toBeGreaterThan(LATE_ROW);
  });

  it("locates a document-wide match index in its row", () => {
    expect(Option.getOrNull(locateMatch(documentRows, 0))).toEqual({
      row: 0,
      local: 0,
    });
    // The first row holds two, so index 1 is the second of row 0.
    expect(Option.getOrNull(locateMatch(documentRows, 1))).toEqual({
      row: 0,
      local: 1,
    });
    // Row 5 holds none, so the index after row 4's last match is row 6's first.
    expect(
      Option.getOrNull(
        locateMatch(
          documentRows,
          Option.getOrElse(
            Option.map(rowAt(5), (row) => row.offset),
            () => 0,
          ),
        ),
      ),
    ).toEqual({ row: 6, local: 0 });
    // The second match of the late row, which is the cursor the probe uses.
    expect(
      Option.getOrNull(locateMatch(documentRows, lateMatchIndex(documentRows))),
    ).toEqual({ row: LATE_ROW, local: 1 });
    expect(
      Option.isNone(locateMatch(documentRows, totalMatches(documentRows))),
    ).toBe(true);
    expect(Option.isNone(locateMatch(documentRows, -1))).toBe(true);
  });

  it("keeps only a window of the document inside the viewport", () => {
    expect(ROWS * ROW_HEIGHT).toBeGreaterThan(VIEWPORT);
    expect(Math.floor(VIEWPORT / ROW_HEIGHT)).toBeLessThan(ROWS / 10);
    expect(Option.map(rowAt(LATE_ROW), (row) => row.matches)).toEqual(
      Option.some(2),
    );
  });

  it("replaces every occurrence, not every row", () => {
    const before = totalMatches(documentRows);
    const replaced = replaceMatches(documentRows, QUERY, REPLACEMENT);
    expect(replaced.length).toBe(documentRows.length);
    expect(totalMatches(replaced)).toBe(0);
    expect(Arr.every(replaced, (row) => row.matches === 0)).toBe(true);
    expect(Arr.every(replaced, (row) => !Str.includes(QUERY)(row.text))).toBe(
      true,
    );
    // One replacement per old match, so the count is preserved.
    expect(
      Arr.reduce(
        replaced,
        0,
        (total, row) => total + occurrences(row.text, REPLACEMENT),
      ),
    ).toBe(before);
    expect(Arr.every(replaced, (row, index) => row.index === index)).toBe(true);
    expect(Option.map(Arr.head(replaced), (row) => row.id)).toEqual(
      Option.some("find-row-0"),
    );
  });

  it("indexes a hand-built list without assuming a per-row count", () => {
    const short = indexRows([
      { id: "a", text: "error", matches: 0 },
      { id: "b", text: "error error", matches: 3 },
      { id: "c", text: "clean", matches: 0 },
    ]);
    expect(Arr.map(short, (row) => row.offset)).toEqual([0, 0, 3]);
  });
});
