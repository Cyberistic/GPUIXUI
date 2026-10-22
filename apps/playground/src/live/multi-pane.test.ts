/**
 * Holds the premises the `multi-pane-editor` probe is read against.
 *
 * The bugs these catch: two panes whose widths do not add up to the row (the
 * splitter would leave a gap or overflow), a drag that stops at the wrong bound
 * (a dock's minimum pane becomes a line), a readout that echoes the whole buffer
 * (a typing check could pass without the app's state changing), and a README
 * check count that disagrees with the probe.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the repository's
 * own Markdown, not a runtime path.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MULTI_PANE,
  MULTI_PANE_FILES,
  MULTI_PANE_IDS,
  MULTI_PANE_VALUES,
  MULTI_PANE_WINDOW,
  dragWidth,
  multiPaneReadout,
  paneWidths,
} from "./multi-pane.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/**
 * The `multiPaneSteps` effect, bounded by the probe that follows it.
 *
 * It has no loop that adds a check, so its `ctx.expect*` call sites plus one per
 * `paintedBox` call are the checks the window runs — which is what the README
 * prints.
 */
const multiPaneSteps = (() => {
  const start = scenarios.indexOf("const multiPaneSteps");
  const end = scenarios.indexOf("const TableFilterProbe", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only multi-pane-editor`/.exec(readme)?.[1] ?? Number.NaN,
  );

describe("the two-pane layout", () => {
  it("splits the row between the pane and the rest, minus the divider", () => {
    const row = 876;
    expect(paneWidths(row, MULTI_PANE.initial, "both")).toEqual({
      left: MULTI_PANE.initial,
      right: row - MULTI_PANE.initial - MULTI_PANE.divider,
    });
  });

  it("gives a closed pane's space to the one that is left", () => {
    // A closed pane is unmounted, so the surviving pane owns the whole row: a
    // layout that kept the closed width would leave a blank strip.
    expect(paneWidths(876, MULTI_PANE.initial, "left")).toEqual({
      left: 876,
      right: 0,
    });
  });

  it("never lets the widest pane meet the divider", () => {
    // The right pane is caller-owned space; the row has to hold the widest left
    // pane plus the divider, or a resize at the bound erases the other editor.
    expect(MULTI_PANE.max + MULTI_PANE.divider).toBeLessThan(
      MULTI_PANE_WINDOW.width - 2 * 12,
    );
  });

  it("follows a drag and clamps at both ends", () => {
    expect(dragWidth(MULTI_PANE.initial, 60)).toBe(440);
    expect(dragWidth(MULTI_PANE.initial, 600)).toBe(MULTI_PANE.max);
    expect(dragWidth(MULTI_PANE.initial, -600)).toBe(MULTI_PANE.min);
  });

  it("prints counts and the caller-owned width, not the buffers", () => {
    // A readout that carried the text would let a typing check pass on the
    // fixture's own value; counts change only if the field's onChange ran.
    const readout = multiPaneReadout(
      MULTI_PANE_VALUES.left,
      MULTI_PANE_VALUES.right,
      "both",
      MULTI_PANE.initial,
    );
    expect(readout).toBe("left=2/46 right=3/46 open=both width=380");
    expect(readout).not.toContain(MULTI_PANE_VALUES.left);
  });

  it("addresses the fixture with ids no other probe owns", () => {
    expect(MULTI_PANE_IDS.input("left")).toBe("mp-input-left");
    expect(MULTI_PANE_IDS.input("right")).toBe("mp-input-right");
    expect(MULTI_PANE_FILES).toEqual({ left: "alpha.ts", right: "beta.ts" });
  });

  it("prints the check count the probe actually asserts", () => {
    // Two producers: a direct `ctx.expect*` call and `paintedBox`, which asserts
    // the element paints before handing its box back. Both are checks the
    // window reports, so the README's number is their sum.
    const asserted =
      (multiPaneSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (multiPaneSteps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
