/**
 * Holds the premises the `table-filter-lifecycle` probe is read against.
 *
 * The bugs these catch: a filter that matches the index instead of the label (a
 * reader's query would keep the wrong rows), a selection that survives the
 * record being filtered out (an invisible selection is what a toolbar acts on),
 * an arrow step that walks the numeric order rather than the filtered one, a
 * readout that cannot tell "no filter" from "no matches", and a README check
 * count that disagrees with the probe.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the repository's
 * own Markdown, not a runtime path.
 */

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

/**
 * The `tableFilterSteps` effect, bounded by the live-probe body table that
 * follows it.
 *
 * It has no loop that adds a check, so its `ctx.expect*` call sites plus one per
 * `paintedBox` call are the checks the window runs — which is what the README
 * prints.
 */
const tableFilterSteps = (() => {
  const start = scenarios.indexOf("const tableFilterSteps");
  const end = scenarios.indexOf("/** The bodies", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The count the README prints for this probe, if any. */
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
    // `Item 1`, 10–19, the eight odd tens and 100–119.
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
    // Two producers: a direct `ctx.expect*` call and `paintedBox`, which asserts
    // the element paints before handing its box back.
    const asserted =
      (tableFilterSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (tableFilterSteps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
