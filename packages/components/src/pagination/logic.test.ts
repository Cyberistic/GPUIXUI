import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { pageWindow, paginationRange, type PageItem } from "./logic.js";

const pages = (...values: ReadonlyArray<number>): ReadonlyArray<PageItem> =>
  values.map((page) => ({ kind: "page", page }));

const gap = (side: "start" | "end"): PageItem => ({
  kind: "ellipsis",
  side,
});

const hiddenByGap = (entries: ReadonlyArray<PageItem>): ReadonlyArray<number> =>
  Arr.filterMap(entries, (entry, index) => {
    if (entry.kind !== "ellipsis") return Result.failVoid;
    const neighbours = Option.all([
      Option.flatMap(Option.fromNullishOr(entries[index - 1]), (previous) =>
        previous.kind === "page" ? Option.some(previous.page) : Option.none(),
      ),
      Option.flatMap(Option.fromNullishOr(entries[index + 1]), (next) =>
        next.kind === "page" ? Option.some(next.page) : Option.none(),
      ),
    ]);
    return Option.match(neighbours, {
      onNone: () => Result.succeed(index),
      onSome: ([low, high]) =>
        high - low > 1 ? Result.failVoid : Result.succeed(index),
    });
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

  it("keeps the head inside range when siblingCount is large", () => {
    expect(pageWindow({ page: 1, pageCount: 10, siblingCount: 4 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    );
    const entries = pageWindow({ page: 1, pageCount: 14, siblingCount: 4 });
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

  it("renders the trail in full instead of an ellipsis over nothing", () => {
    expect(pageWindow({ page: 8, pageCount: 8, siblingCount: 2 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7, 8),
    );

    expect(pageWindow({ page: 9, pageCount: 9, siblingCount: 2 })).toEqual(
      pages(1, 2, 3, 4, 5, 6, 7, 8, 9),
    );
  });

  it("renders a single hidden page instead of an ellipsis over it", () => {
    expect(pageWindow({ page: 4, pageCount: 10 })).toEqual([
      ...pages(1, 2, 3, 4, 5),
      gap("end"),
      ...pages(10),
    ]);

    expect(pageWindow({ page: 5, pageCount: 10 })).toEqual([
      ...pages(1),
      gap("start"),
      ...pages(4, 5, 6),
      gap("end"),
      ...pages(10),
    ]);
  });

  it("never draws an ellipsis that stands for no page", () => {
    const cases = Arr.flatMap(Arr.range(0, 4), (siblingCount) =>
      Arr.flatMap(Arr.range(1, 12), (pageCount) =>
        Arr.map(Arr.range(1, pageCount), (page) => ({
          page,
          pageCount,
          siblingCount,
        })),
      ),
    );

    const liars = Arr.filterMap(cases, ({ page, pageCount, siblingCount }) => {
      const pointless = hiddenByGap(
        pageWindow({ page, pageCount, siblingCount }),
      );
      return Arr.isReadonlyArrayEmpty(pointless)
        ? Result.failVoid
        : Result.succeed(
            `page ${page} of ${pageCount} with ${siblingCount} siblings: an ellipsis hides no page`,
          );
    });

    expect(liars).toEqual([]);
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

  it("renders no pages for a count it cannot read", () => {
    expect(pageWindow({ page: 1, pageCount: Number.NaN })).toEqual([]);
    expect(
      pageWindow({ page: 1, pageCount: Number.POSITIVE_INFINITY }),
    ).toEqual([]);
    expect(paginationRange(1, Number.NaN)).toEqual({
      current: 1,
      pageCount: 0,
    });
    expect(paginationRange(7, Number.POSITIVE_INFINITY)).toEqual({
      current: 1,
      pageCount: 0,
    });
  });

  it("reads an unreadable page or sibling count as its default", () => {
    expect(pageWindow({ page: Number.NaN, pageCount: 10 })).toEqual(
      pageWindow({ page: 1, pageCount: 10 }),
    );
    expect(
      pageWindow({ page: 5, pageCount: 10, siblingCount: Number.NaN }),
    ).toEqual(pageWindow({ page: 5, pageCount: 10 }));
    const entries = pageWindow({
      page: Number.NaN,
      pageCount: 10,
      siblingCount: Number.POSITIVE_INFINITY,
    });
    const numbers = Arr.filterMap(entries, (entry) =>
      entry.kind === "page" ? Result.succeed(entry.page) : Result.failVoid,
    );
    expect(numbers.length).toBeGreaterThan(0);
    expect(Arr.every(numbers, Number.isFinite)).toBe(true);
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
});
