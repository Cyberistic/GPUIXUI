/**
 * A row height the window cannot read.
 *
 * The bug these guard: `rowHeight` is often computed — the density's step, a
 * viewport divided by the rows it should show, a measurement taken before the
 * first layout — and a value nothing could be divided by reached all three
 * consumers at once. The window's calculator normalised it to **one pixel**, so
 * a 240px viewport mounted 204 rows of a thousand; the **scroll anchor**
 * multiplied the runtime's row index by `NaN`, which the offset clamp read as
 * `0`, so the window never followed a gesture again; and `estimatedItemHeight`
 * was handed the same `NaN`. Measured before the fix: the first window painted
 * rows 0–5 and every wheel after it painted rows 195–203 for ever — a table
 * that went blank two hundred rows in, and a reveal of row 900 painted nothing.
 *
 * The fix is one number: `rowHeightOf` reads a height the window can divide (a
 * finite height above zero, else the height this package's own row paints), and
 * the estimate, the anchor and the reveal all read it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { afterEach, describe, expect, it } from "vitest";
import { useExpandedRows } from "../tree/use-expanded.js";
import { VirtualTree } from "../virtual/tree.js";
import { VirtualTable } from "../virtual/table.js";
import { DEFAULT_ROW_HEIGHT } from "../virtual/window.js";
import { TableCell, TableHeaderCell, TableRow } from "../table/table.js";
import { textStyle, useTheme } from "../theme.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

/** The logical rows of a windowed table: far more than a viewport holds. */
const ROWS = 1_000;

/** The row a reveal names, well below the first window. */
const REVEAL_ROW = 900;

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** Every `row-N` that reached the frame, in paint order. */
const paintedRows = (mounted: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(mounted.renderer.getPaintedText(), (line) => {
    const index = /^row-(\d+)$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index));
  });

/** Every `row-N` React retained, painted or not. */
const retainedRows = (mounted: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(mounted.renderer.getAllText(), (line) => {
    const index = /^row-(\d+)$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index));
  });

const boundsOf = (mounted: DataTestRoot, testId: string) => {
  const element = mounted.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`no element with testId ${testId}`);
  const bounds = mounted.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

/** The table the cases mount: rows paint their natural height, not `rowHeight`. */
const table = (options: {
  readonly rowHeight: number;
  readonly reveal?: { readonly index: number };
}) => {
  const Example = () => {
    const theme = useTheme();
    return (
      <VirtualTable
        height={240}
        aria-label="Rows"
        count={ROWS}
        rowHeight={options.rowHeight}
        reveal={options.reveal}
        header={
          <TableRow>
            <TableHeaderCell width={180} testId="height-header">
              Name
            </TableHeaderCell>
          </TableRow>
        }
        row={(index) => (
          <TableRow testId={`height-row-${index}`}>
            <TableCell width={180}>
              <text style={textStyle(theme, "body")}>{`row-${index}`}</text>
            </TableCell>
          </TableRow>
        )}
      />
    );
  };
  return <Example />;
};

/** Wheel over the painted rows, inside the body the wheel belongs to. */
const wheel = (mounted: DataTestRoot, deltaY: number): void => {
  const header = boundsOf(mounted, "height-header");
  mounted.renderer.nativeSimulateScrollWheel(
    header.x + 20,
    header.y + header.height + 10,
    0,
    deltaY,
  );
  mounted.renderer.flush();
};

describe("a row height the window cannot read", () => {
  it("names the height this package's own row paints", () => {
    // The fallback is not a guess: a body row with no declared height paints
    // this box in the default theme, which is why the estimate uses it.
    const mounted = renderData(table({ rowHeight: DEFAULT_ROW_HEIGHT }));
    root = mounted;
    settle(mounted);

    expect(boundsOf(mounted, "height-row-0").height).toBe(DEFAULT_ROW_HEIGHT);
  });

  it("mounts a window of the set, not a row per pixel", () => {
    const mounted = renderData(table({ rowHeight: Number.NaN }));
    root = mounted;
    settle(mounted);

    // Measured before the fix: 204 rows of the thousand were retained, because
    // the calculator divided the viewport by one pixel.
    expect(retainedRows(mounted).length).toBeLessThan(60);
    expect(paintedRows(mounted).length).toBeGreaterThanOrEqual(5);
    expect(paintedRows(mounted)[0]).toBe(0);
  });

  it("follows the paint to the last row", () => {
    const mounted = renderData(table({ rowHeight: Number.NaN }));
    root = mounted;
    settle(mounted);

    // Measured before the fix: the anchor's `index * NaN` clamped the offset to
    // `0` after every gesture, so the paint stalled at row 203 and the rest of
    // the set was blank.
    Arr.forEach(Arr.range(1, 100), () => wheel(mounted, -600));

    const painted = paintedRows(mounted);
    expect(Option.getOrUndefined(Arr.last(painted))).toBe(ROWS - 1);
    // A window is contiguous: a gap would leave an estimate box between rows.
    expect(painted).toEqual(Arr.range(painted[0] ?? 0, painted.at(-1) ?? 0));
  });

  it("reveals a row the runtime can scroll to", () => {
    const mounted = renderData(
      table({ rowHeight: Number.NaN, reveal: { index: REVEAL_ROW } }),
    );
    root = mounted;
    settle(mounted);

    // Before the fix the window never moved, so the scroll named a row that
    // was not mounted and the frame kept the first window.
    expect(paintedRows(mounted)).toContain(REVEAL_ROW);
  });
});

/** Two hundred flat roots: a tree far taller than its viewport. */
const NODES = 200;

const nodes = Arr.map(Arr.range(0, NODES - 1), (index) => ({
  id: `node-${index}`,
  label: `node ${index}`,
}));

const Tree = ({ rowHeight }: { readonly rowHeight: number }) => {
  const tree = useExpandedRows({
    roots: nodes,
    keyOf: (node) => node.id,
    childrenOf: () => [],
    labelOf: (node) => node.label,
    initialActive: "node-0",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 320 }}>
      <text testId="height-tree-readout">
        {`active=${Option.getOrElse(tree.active, () => "-")}`}
      </text>
      <VirtualTree
        testId="height-tree"
        aria-label="Nodes"
        height={240}
        rowHeight={rowHeight}
        rows={tree.rows}
        cursor={tree.cursor}
        onCursorChange={tree.setCursor}
        labelOf={(node) => node.label}
      />
    </div>
  );
};

describe("a windowed tree whose row height cannot be read", () => {
  it("retains a window and keeps the cursor's row mounted", () => {
    // The tree divides by the height twice — the tab stop's row and the row a
    // window move lands on — so a `NaN` height reached no row at all; it also
    // lost the window, which mounted every one of the two hundred rows.
    const mounted = renderData(<Tree rowHeight={Number.NaN} />);
    root = mounted;
    settle(mounted);

    const painted = (): ReadonlyArray<string> =>
      Arr.filter(mounted.renderer.getPaintedText(), (line) =>
        /^node \d+$/.test(line),
      );
    expect(painted().length).toBeGreaterThan(3);
    expect(painted().length).toBeLessThan(60);

    const active = (): string => {
      const line = Arr.findFirst(mounted.renderer.getAllText(), (text) =>
        text.startsWith("active="),
      );
      if (Option.isNone(line)) throw new Error("no tree readout");
      return line.value.slice("active=".length);
    };
    const row = boundsOf(mounted, `height-tree-row-${active()}`);
    mounted.renderer.nativeSimulateScrollWheel(row.x + 20, row.y + 4, 0, -600);
    mounted.renderer.flush();

    // The cursor moved to a mounted row rather than one computed from `NaN`,
    // and the window still holds only a viewport of the set.
    expect(painted()).toContain(active().replace("node-", "node "));
    expect(painted().length).toBeLessThan(60);
  });
});
