/**
 * Holds the roving-focus model the `grid-focus-lifecycle` probe drives, and the
 * claims its README section prints.
 *
 * The probe's whole subject is a rule the library owns but the runtime must
 * honour: one tab stop for a widget, arrows moving real focus, and the
 * remembered cell restored on re-entry. The arithmetic below is that rule, so
 * a movement that wraps instead of clamping, a tab stop that moves with the
 * wrong cell, or a readout that prints a different cell fails here before a
 * window is opened.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  cellId,
  formatReadout,
  GRID_CELLS,
  GRID_CELL_COUNT,
  GRID_COLUMNS,
  GRID_FOCUS_CHECKS,
  GRID_FOCUS_IDS,
  GRID_ROWS,
  GridFocusReadout,
  gridKeyOf,
  indexOf,
  initialReadout,
  moveIndex,
  positionOf,
  tabIndexOf,
  tabStops,
} from "./grid-focus.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `gridFocusSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const gridFocusSteps");
  if (start === -1) return "";
  const after = [
    scenarios.indexOf("\nconst ", start + 1),
    scenarios.indexOf("\nexport const ", start + 1),
    scenarios.indexOf("\n/** The bodies", start + 1),
  ].filter((end) => end > start);
  return scenarios.slice(
    start,
    after.length === 0 ? scenarios.length : Math.min(...after),
  );
})();

describe("the grid's geometry", () => {
  it("is a 3×3 grid whose every index maps to one cell", () => {
    expect(GRID_COLUMNS).toBe(3);
    expect(GRID_ROWS).toBe(3);
    expect(GRID_CELL_COUNT).toBe(9);
    expect(GRID_CELLS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ARR_POSITIONS).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 1 },
      { row: 0, column: 2 },
      { row: 1, column: 0 },
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 0 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
    ]);
    Arr.forEach(GRID_CELLS, (index) => {
      expect(indexOf(positionOf(index))).toBe(index);
    });
  });

  it("names a cell by the row and column a readout prints", () => {
    expect(cellId(0, 0)).toBe("gridfocus-r0c0");
    expect(cellId(2, 1)).toBe("gridfocus-r2c1");
    expect(
      new Set(
        Arr.map(GRID_CELLS, (index) =>
          cellId(positionOf(index).row, positionOf(index).column),
        ),
      ).size,
    ).toBe(GRID_CELL_COUNT);
  });
});

/** Every cell's position, built from the fixture's own helper. */
const ARR_POSITIONS = Arr.map(GRID_CELLS, positionOf);

describe("the roving movement", () => {
  it("moves one cell along each axis", () => {
    expect(moveIndex(4, "left")).toBe(3);
    expect(moveIndex(4, "right")).toBe(5);
    expect(moveIndex(4, "up")).toBe(1);
    expect(moveIndex(4, "down")).toBe(7);
  });

  it("clamps at every edge rather than wrapping", () => {
    // A wrap would move a reader two cells for one press: the row's end is the
    // next row's start, and the grid's top is the bottom.
    expect(moveIndex(2, "right")).toBe(2);
    expect(moveIndex(0, "left")).toBe(0);
    expect(moveIndex(0, "up")).toBe(0);
    expect(moveIndex(8, "down")).toBe(8);
    expect(moveIndex(5, "right")).toBe(5);
    expect(moveIndex(6, "left")).toBe(6);
  });

  it("sends Home and End to the row's ends, not the grid's", () => {
    expect(moveIndex(4, "home")).toBe(3);
    expect(moveIndex(4, "end")).toBe(5);
    expect(moveIndex(7, "home")).toBe(6);
    expect(moveIndex(1, "end")).toBe(2);
  });

  it("reads only the keys the grid answers", () => {
    expect(
      Arr.getSomes(
        Arr.map(["left", "right", "up", "down", "home", "end"], gridKeyOf),
      ),
    ).toEqual(["left", "right", "up", "down", "home", "end"]);
    expect(Option.isNone(gridKeyOf("tab"))).toBe(true);
    expect(Option.isNone(gridKeyOf("enter"))).toBe(true);
    expect(Option.isNone(gridKeyOf(""))).toBe(true);
  });
});

describe("the tab stop", () => {
  it("makes the remembered cell the only zero", () => {
    expect(Arr.map(GRID_CELLS, (index) => tabIndexOf(index, 4))).toEqual([
      -1, -1, -1, -1, 0, -1, -1, -1, -1,
    ]);
    expect(tabIndexOf(0, 0)).toBe(0);
  });

  it("lists the control before, the remembered cell and the control after", () => {
    expect(tabStops(4)).toEqual([
      GRID_FOCUS_IDS.before,
      "gridfocus-r1c1",
      GRID_FOCUS_IDS.after,
    ]);
    expect(tabStops(0)).toEqual([
      GRID_FOCUS_IDS.before,
      "gridfocus-r0c0",
      GRID_FOCUS_IDS.after,
    ]);
  });
});

describe("the readout", () => {
  it("prints the remembered cell and the activation count", () => {
    expect(formatReadout(initialReadout)).toBe("roving=r0c0 activations=0");
    expect(
      formatReadout(new GridFocusReadout({ roving: 7, activations: 2 })),
    ).toBe("roving=r2c1 activations=2");
  });
});

describe("the grid-focus probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "grid-focus-lifecycle"),
    ).toEqual([
      {
        id: "grid-focus-lifecycle",
        title: expect.stringContaining("one tab stop"),
        capability: "focus",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `grid-focus-lifecycle` — measured on 0.11.0 here",
    );
  });

  it("prints the number of checks the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only grid-focus-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(GRID_FOCUS_CHECKS);
    expect(GRID_FOCUS_CHECKS).toBe(20);
  });

  it("asks the view for every part the section teaches", () => {
    expect(steps).toContain("formatReadout(initialReadout)");
    expect(steps).toContain("GRID_FOCUS_IDS.before");
    expect(scenarios).toContain("tabIndex={tabIndexOf(index, readout.roving)}");
    expect(scenarios).toContain("renderer?.focusElement?.(entry.elementId)");
    expect(scenarios).toContain(
      'onKeyDown={(event) => onKey(event.key ?? "")}',
    );
    expect(scenarios).toContain('ctx.host.key("shift-tab")');
  });

  it("prints the measured rule for a cell outside the tab stop", () => {
    // The window measured that `-1` is ordered *before* the zero-index stops
    // rather than removed from the chain, so the page has to say so.
    expect(readme).toContain("ordered before");
    expect(readme).toContain("gridfocus-r2c2");
    expect(readme).toContain("grid-focus-before");
  });
});
