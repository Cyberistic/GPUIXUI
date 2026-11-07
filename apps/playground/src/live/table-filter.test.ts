import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  FILTER_ROWS,
  filterReadout,
  filterRows,
  keepSelection,
  rowLabel,
  stepRow,
} from "./table-filter.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const endOfDeclaration = (start: number): number =>
  Math.min(
    ...["\nconst ", "\nexport const ", "\n/**"]
      .map((marker) => scenarios.indexOf(marker, start + 1))
      .filter((at) => at !== -1),
  );

const tableFilterSteps = (() => {
  const start = scenarios.indexOf("const tableFilterSteps");
  return start === -1 ? "" : scenarios.slice(start, endOfDeclaration(start));
})();

const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only table-filter-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

describe("the filter a grid applies", () => {
  it("keeps every row for an empty or blank query", () => {
    expect(filterRows("")).toHaveLength(FILTER_ROWS);
    expect(filterRows("   ")).toHaveLength(FILTER_ROWS);
  });

  it("matches the label literally and case-insensitively, not the index", () => {
    const ones = filterRows("1");
    expect(ones).toHaveLength(39);
    expect(ones).toContain(1);
    expect(ones).toContain(112);
    expect(ones).not.toContain(2);
    expect(filterRows("ITEM")).toHaveLength(FILTER_ROWS);
    expect(filterRows("ITEM 12")).toEqual([12]);
  });

  it("clears a selection whose record the filter hides", () => {
    const visible = filterRows("1");
    expect(keepSelection(Option.some(12), visible)).toEqual(Option.some(12));
    expect(keepSelection(Option.some(2), visible)).toEqual(Option.none());
  });

  it("steps in the filtered order, and clamps at both ends", () => {
    const visible = filterRows("1");
    expect(stepRow(visible, Option.some(1), 1)).toEqual(Option.some(10));
    expect(stepRow(visible, Option.some(1), -1)).toEqual(Option.some(1));
    expect(stepRow(filterRows("12"), Option.some(112), 1)).toEqual(
      Option.some(112),
    );
    expect(stepRow([], Option.some(112), 1)).toEqual(Option.none());
    expect(stepRow(visible, Option.none(), 1)).toEqual(Option.some(1));
  });

  it("prints no-filter as none and carries the row count, selection and offset", () => {
    expect(filterReadout("", filterRows(""), Option.none(), 0)).toBe(
      "rows=120 query=none selected=none offset=0",
    );
    expect(filterReadout("1", filterRows("1"), Option.some(12), -200)).toBe(
      "rows=39 query=1 selected=item-12 offset=-200",
    );
    expect(filterReadout("  ", filterRows("  "), Option.none(), 0)).toContain(
      "query=none",
    );
  });

  it("names the label the query matches, not a display stand-in", () => {
    expect(rowLabel(12)).toBe("Item 12");
  });

  it("prints the check count the probe actually asserts", () => {
    const asserted =
      (tableFilterSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (tableFilterSteps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
