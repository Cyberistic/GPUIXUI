/**
 * Holds the premises the `column-resize-lifecycle` probe is read against.
 *
 * The bugs these catch: a column that clamps at a bound other than the one the
 * README prints, a content width that stops matching the row and header, an
 * "outside the divider" count that cannot distinguish a captured move from a
 * move still inside the 6px box, a divider shipped with one of the two listeners
 * that arm pointer capture (the drag then dies at its own edge), and a README
 * check count that disagrees with the probe.
 *
 * `node:fs` is deliberate, as in `table-columns.test.ts`: this checks the
 * repository's own Markdown and the probe's source, not a runtime path.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COLUMN_RESIZE,
  COLUMN_RESIZE_IDS,
  COLUMN_RESIZE_ROWS,
  CONTROL_MOVES,
  DRAG_STEPS,
  columnResizeReadout,
  movedPastDivider,
  resizeContentWidth,
  resizedWidth,
} from "./column-resize.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/**
 * The `columnResizeSteps` effect, bounded by the next declaration after it.
 *
 * It has no loop that adds a check, so its `ctx.expect*` call sites are the
 * checks the window runs — which is what the README prints. The end is the
 * next `const`, not the bodies map: a probe declared between the two would
 * otherwise be counted as this one's checks.
 */
const columnResizeSteps = (() => {
  const start = scenarios.indexOf("const columnResizeSteps");
  const next = scenarios.indexOf("\nconst ", start + 1);
  const end =
    next === -1
      ? scenarios.indexOf("The bodies, one per registry id", start + 1)
      : next;
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only column-resize-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

describe("the width a column drag resolves", () => {
  it("clamps to the bounds the probe prints, at both ends", () => {
    expect(resizedWidth(COLUMN_RESIZE.name, 60)).toBe(220);
    expect(resizedWidth(COLUMN_RESIZE.name, -200)).toBe(COLUMN_RESIZE.min);
    expect(resizedWidth(COLUMN_RESIZE.max, 200)).toBe(COLUMN_RESIZE.max);
  });

  it("opens between its bounds, so both clamps are reachable by a drag", () => {
    expect(COLUMN_RESIZE.name).toBeGreaterThan(COLUMN_RESIZE.min);
    expect(COLUMN_RESIZE.name).toBeLessThan(COLUMN_RESIZE.max);
  });

  it("keeps the header and the rows on one content width", () => {
    const opened = resizeContentWidth(COLUMN_RESIZE.name);
    expect(opened).toBe(
      COLUMN_RESIZE.name +
        COLUMN_RESIZE.divider +
        COLUMN_RESIZE.status +
        COLUMN_RESIZE.size,
    );
    // The probe's first paint claims the content overflows its viewport; if the
    // widths ever fit, the pan checks would read a clamped `0` and pass.
    expect(opened).toBeGreaterThan(COLUMN_RESIZE.viewport);
    expect(resizeContentWidth(COLUMN_RESIZE.max)).toBeGreaterThan(opened);
  });
});

describe("the box a captured drag leaves", () => {
  it("counts a move past the divider's right edge, and not one inside it", () => {
    const press = 400;
    expect(movedPastDivider(press, press + COLUMN_RESIZE.divider / 2)).toBe(
      false,
    );
    expect(movedPastDivider(press, press + COLUMN_RESIZE.divider / 2 + 1)).toBe(
      true,
    );
    expect(movedPastDivider(press, press + 10)).toBe(true);
  });

  it("keeps the control's one move a proper subset of a drag's", () => {
    // The press and the first move land inside the box; the rest are lost, so
    // the control hears some of a drag — and never all of it.
    expect(CONTROL_MOVES).toBeGreaterThan(0);
    expect(CONTROL_MOVES).toBeLessThan(DRAG_STEPS);
  });
});

describe("the readout the probe asserts", () => {
  it("prints every number the steps read, in one spelling", () => {
    expect(
      columnResizeReadout({
        width: 220,
        control: COLUMN_RESIZE.control,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
        controlMoves: CONTROL_MOVES,
      }),
    ).toBe(
      `w=220 ctrl=${COLUMN_RESIZE.control} moves=${DRAG_STEPS} outside=${DRAG_STEPS} ctrlMoves=${CONTROL_MOVES}`,
    );
  });

  it("gives every row its own cell id, none of them a header", () => {
    const ids = COLUMN_RESIZE_ROWS.map(COLUMN_RESIZE_IDS.cell);
    expect(ids).toHaveLength(COLUMN_RESIZE.rows);
    expect(new Set(ids).size).toBe(COLUMN_RESIZE.rows);
    expect(ids).not.toContain(COLUMN_RESIZE_IDS.header);
  });
});

describe("the probe the README documents", () => {
  it("arms capture with the listener pair, and leaves the control with one", () => {
    // The measured rule (`pointer-capture`): the runtime arms the capture on a
    // left press only for an element that listens to both `mouseDown` and
    // `mouseMove`. A divider shipped with one listener keeps no drag, and the
    // probe's "the drag follows past its own box" check would pass on a pointer
    // that never left it.
    expect(columnResizeSteps).not.toBe("");
    const divider = /onMouseDown=\{[\s\S]{0,400}?onMouseMove=/.test(
      scenarios.slice(
        scenarios.indexOf(`testId={COLUMN_RESIZE_IDS.divider}`),
        scenarios.indexOf(`testId={COLUMN_RESIZE_IDS.controlDivider}`),
      ),
    );
    expect(divider).toBe(true);
    const control = scenarios.slice(
      scenarios.indexOf(`testId={COLUMN_RESIZE_IDS.controlDivider}`),
      scenarios.indexOf(`testId={COLUMN_RESIZE_IDS.controlDivider}`) + 800,
    );
    expect(control).toContain("onMouseMove");
    expect(control).not.toContain("onMouseDown");
  });

  it("prints the number of checks the steps assert", () => {
    // Each `paintedBox` records a check of its own (`expectSome` inside), so a
    // count of the two sites is what the window actually runs.
    const asserted = (
      columnResizeSteps.match(/ctx\.expect(?:Equal|Near|Contains|Some)\(/g) ??
      []
    ).length;
    const painted = (columnResizeSteps.match(/paintedBox\(ctx,/g) ?? []).length;
    expect(asserted).toBeGreaterThan(0);
    expect(painted).toBeGreaterThan(0);
    expect(printedCheckCount()).toBe(asserted + painted);
  });

  it("measures the probe under the runtime version the registry pins", () => {
    expect(readme).toContain(
      "### `column-resize-lifecycle` — measured on 0.11.0 here",
    );
  });
});
