/**
 * Pagination window arithmetic.
 *
 * The bugs these guard: the window grew at the edges so the control changed
 * width as the user paged (page 1 of 10 rendering two numbers, page 5 rendering
 * three); a crop could omit the current page; an out-of-range `page` or
 * `pageCount <= 0` produced a list containing pages that do not exist; and an
 * ellipsis stood for a single hidden page (a 7-page list was windowed even
 * though all seven numbers fit).
 */

import { describe, expect, it } from "vitest";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import {
  currentPageOf,
  pageCountOf,
  pageWindow,
  type PageItem,
} from "./logic.js";

const pages = (...values: ReadonlyArray<number>): ReadonlyArray<PageItem> =>
  values.map((page) => ({ kind: "page", page }));

const gap = (side: "start" | "end"): PageItem => ({
  kind: "ellipsis",
  side,
});

describe("pageWindow", () => {
  it("is empty when there are no pages", () => {
    expect(pageWindow({ page: 1, pageCount: 0 })).toEqual([]);
    expect(pageWindow({ page: 5, pageCount: -3 })).toEqual([]);
  });

  it("renders a list that fits in full", () => {
    expect(pageWindow({ page: 1, pageCount: 1 })).toEqual(pages(1));
    expect(pageWindow({ page: 2, pageCount: 2 })).toEqual(pages(1, 2));
    expect(pageWindow({ page: 3, pageCount: 6 })).toEqual(
      pages(1, 2, 3, 4, 5, 6),
    );
    expect(pageWindow({ page: 1, pageCount: 6 })).toEqual(
      pages(1, 2, 3, 4, 5, 6),
    );
  });

  it("keeps the width stable at the start and the end of a long list", () => {
    expect(pageWindow({ page: 1, pageCount: 10 })).toEqual([
      ...pages(1, 2, 3, 4, 5),
      gap("end"),
      ...pages(10),
    ]);
    expect(pageWindow({ page: 10, pageCount: 10 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(6, 7, 8, 9, 10),
    ]);
  });

  it("crops on both sides in the middle", () => {
    expect(pageWindow({ page: 5, pageCount: 10 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(4, 5, 6),
      gap("end"),
      ...pages(10),
    ]);
  });

  it("fills the head before an ellipsis is worth drawing", () => {
    expect(pageWindow({ page: 3, pageCount: 10 })).toEqual([
      ...pages(1, 2, 3, 4, 5),
      gap("end"),
      ...pages(10),
    ]);
  });

  it("widens the window with siblingCount", () => {
    expect(pageWindow({ page: 5, pageCount: 20, siblingCount: 2 })).toEqual([
      ...pages(1, 2, 3, 4, 5, 6, 7),
      gap("end"),
      ...pages(20),
    ]);
  });

  it("renders the whole list when siblingCount covers every page", () => {
    expect(pageWindow({ page: 1, pageCount: 10, siblingCount: 4 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    );
    // A wide window near the end must not leave an ellipsis with no page behind
    // it (the old threshold drew one between pages 1 and 2).
    expect(pageWindow({ page: 9, pageCount: 10, siblingCount: 4 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    );
  });

  it("keeps a wide sibling window inside range", () => {
    const entries = pageWindow({ page: 5, pageCount: 14, siblingCount: 4 });
    expect(entries).toEqual([
      ...pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
      gap("end"),
      ...pages(14),
    ]);
    expect(entries.some((entry) => entry.kind === "ellipsis")).toBe(true);
  });

  it("treats a negative siblingCount as zero", () => {
    expect(pageWindow({ page: 5, pageCount: 10, siblingCount: -4 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(5),
      gap("end"),
      ...pages(10),
    ]);
  });

  it("drops the edges when showEdges is false", () => {
    expect(pageWindow({ page: 5, pageCount: 10, showEdges: false })).toEqual(
      pages(4, 5, 6),
    );
    expect(pageWindow({ page: 10, pageCount: 10, showEdges: false })).toEqual(
      pages(9, 10),
    );
  });

  it("clamps the current page into range", () => {
    expect(pageWindow({ page: 0, pageCount: 6 })).toEqual(
      pages(1, 2, 3, 4, 5, 6),
    );
    expect(pageWindow({ page: 99, pageCount: 30 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(26, 27, 28, 29, 30),
    ]);
  });

  it("always includes the current page", () => {
    const includes = (current: number, pageCount: number): boolean =>
      pageWindow({ page: current, pageCount }).some(
        (entry) => entry.kind === "page" && entry.page === current,
      );
    expect(includes(2, 10)).toBe(true);
    expect(includes(4, 10)).toBe(true);
    expect(includes(7, 30)).toBe(true);
    expect(includes(30, 30)).toBe(true);
  });

  it("never repeats a page, always ascends and stays in range", () => {
    const numbers = pageWindow({
      page: 7,
      pageCount: 40,
      siblingCount: 3,
    }).flatMap((entry) => (entry.kind === "page" ? [entry.page] : []));
    expect(numbers).toEqual(Arr.sort(numbers, Order.Number));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((value) => value >= 1 && value <= 40)).toBe(true);
  });

  it("renders a page instead of an ellipsis when only one is hidden", () => {
    expect(pageWindow({ page: 4, pageCount: 7 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7),
    );
    expect(pageWindow({ page: 4, pageCount: 8 })).toEqual([
      ...pages(1, 2, 3, 4, 5),
      gap("end"),
      ...pages(8),
    ]);
    expect(pageWindow({ page: 3, pageCount: 6, siblingCount: 0 })).toEqual([
      ...pages(1, 2, 3),
      gap("end"),
      ...pages(6),
    ]);
    expect(pageWindow({ page: 4, pageCount: 6, siblingCount: 0 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(4, 5, 6),
    ]);
  });

  it("never hides exactly one page behind an ellipsis", () => {
    /** The sizes of the runs each ellipsis stands for, in render order. */
    const hiddenRuns = (
      entries: ReadonlyArray<PageItem>,
    ): ReadonlyArray<number> =>
      Arr.flatMap(entries, (entry, index) => {
        if (entry.kind !== "ellipsis") return [];
        const previous = Arr.findLast(
          Arr.take(entries, index),
          (candidate): candidate is { kind: "page"; page: number } =>
            candidate.kind === "page",
        );
        const next = Arr.findFirst(
          Arr.drop(entries, index + 1),
          (candidate): candidate is { kind: "page"; page: number } =>
            candidate.kind === "page",
        );
        return pipe(
          previous,
          Option.match({
            onNone: () => [],
            onSome: (before) =>
              pipe(
                next,
                Option.match({
                  onNone: () => [],
                  onSome: (after) => [after.page - before.page - 1],
                }),
              ),
          }),
        );
      });

    const cases = Arr.flatMap(Arr.range(1, 40), (pageCount) =>
      Arr.flatMap(Arr.range(0, 3), (siblingCount) =>
        Arr.map(Arr.range(1, pageCount), (page) =>
          pageWindow({ page, pageCount, siblingCount }),
        ),
      ),
    );

    expect(
      Arr.every(cases, (entries) =>
        Arr.every(hiddenRuns(entries), (size) => size >= 2),
      ),
    ).toBe(true);
    // Without this, a window that never drew an ellipsis would also pass.
    expect(
      Arr.some(cases, (entries) =>
        Arr.some(entries, (entry) => entry.kind === "ellipsis"),
      ),
    ).toBe(true);
  });

  it("truncates a fractional page before clamping", () => {
    expect(currentPageOf(1.9, 10)).toBe(1);
    expect(currentPageOf(5.9, 10)).toBe(5);
    expect(pageWindow({ page: 1.9, pageCount: 10 })).toEqual([
      ...pages(1, 2, 3, 4, 5),
      gap("end"),
      ...pages(10),
    ]);
  });

  it("truncates a fractional page count", () => {
    expect(pageCountOf(5.9)).toBe(5);
    expect(pageWindow({ page: 5, pageCount: 5.9 })).toEqual(
      pages(1, 2, 3, 4, 5),
    );
    expect(
      pageWindow({ page: 5, pageCount: 5.9 }).some(
        (entry) => entry.kind === "page" && entry.page > 5,
      ),
    ).toBe(false);
  });

  it("clamps a non-finite or non-positive page into range", () => {
    expect(currentPageOf(Number.NaN, 10)).toBe(1);
    expect(currentPageOf(Number.NEGATIVE_INFINITY, 10)).toBe(1);
    expect(currentPageOf(Number.POSITIVE_INFINITY, 10)).toBe(10);
    expect(pageWindow({ page: Number.NaN, pageCount: 6 })).toEqual(
      pages(1, 2, 3, 4, 5, 6),
    );
  });

  it("treats a non-finite page count as empty", () => {
    expect(pageCountOf(Number.NaN)).toBe(0);
    expect(pageCountOf(Number.POSITIVE_INFINITY)).toBe(0);
    expect(pageWindow({ page: 1, pageCount: Number.NaN })).toEqual([]);
    expect(
      pageWindow({ page: 1, pageCount: Number.POSITIVE_INFINITY }),
    ).toEqual([]);
  });
});
