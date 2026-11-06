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

const multiPaneSteps = (() => {
  const start = scenarios.indexOf("const multiPaneSteps");
  const end = scenarios.indexOf("const TableFilterProbe", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

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
    expect(paneWidths(876, MULTI_PANE.initial, "left")).toEqual({
      left: 876,
      right: 0,
    });
  });

  it("never lets the widest pane meet the divider", () => {
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
    const asserted =
      (multiPaneSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (multiPaneSteps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
