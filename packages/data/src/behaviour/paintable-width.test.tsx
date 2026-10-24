/**
 * A width the layout cannot paint.
 *
 * The bug these guard: `FrozenTable`'s two widths are sizes a caller computes —
 * a share of a pane, the sum of the columns a release ships, a value read from a
 * saved layout before the first measurement — and `@gpuix/native@0.11.0` drops a
 * value it cannot lay out (the style batch is serialised with `JSON.stringify`,
 * so `NaN` and the infinities arrive as `null`) while it accepts a negative one
 * and paints nothing usable. The composition read them raw, so an unreadable
 * width was handed to the layout and the two panes disagreed with each other.
 *
 * Measured before the fix, in a 1280-point frame with a 120-point frozen cell
 * and a 140-point data cell:
 *
 * - `frozenWidth={NaN}` or `{Infinity}` painted the frozen pane at its
 *   **content** — 120 points against the **180** the same grid paints with a
 *   readable width — and handed the 60 points to the data pane (1160);
 * - `frozenWidth={-180}` painted **no frozen pane at all** (0 points) and gave
 *   the data pane the whole frame (1280), so the pinned column a reader depends
 *   on was gone while its cells stayed in the tree;
 * - `contentWidth={-420}` painted the data pane's column at **0 points**, so the
 *   scrolling header and rows had no box while the frozen pane kept its 180.
 *
 * The fix is the rule every other size in this package already follows: a width
 * the layout cannot paint reads as **no width**, the reading the prop has when it
 * names none (`internal/size.ts`). The pane then keeps its content width, which
 * is the track its own cells declare.
 */

import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { requireBounds } from "../internal/interaction.js";
import { renderData, settle, type DataTestRoot } from "../internal/test-root.js";
import { FrozenTable } from "../table/frozen.js";
import { TableCell, TableHeaderCell, TableRow } from "../table/table.js";

/** The frame the composition sits in. */
const FRAME_WIDTH = 1280;

/** The frozen cell's own track: what a gutterless pane sizes to. */
const FROZEN_CELL_WIDTH = 120;

/** The scrolling column's track, so the data pane's content is not its pane. */
const DATA_CELL_WIDTH = 140;

/** The records both panes paint. */
const ROWS = Arr.map(Arr.range(0, 4), (index) => ({
  id: `record-${index}`,
  name: `record-${index}`,
}));

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** The composition, with both widths the caller declares. */
const Frozen = ({
  frozenWidth,
  contentWidth,
}: {
  readonly frozenWidth: number;
  readonly contentWidth: number;
}) => (
  <div style={{ display: "flex", flexDirection: "column", height: 320 }}>
    <FrozenTable
      height={320}
      frozenWidth={frozenWidth}
      contentWidth={contentWidth}
      rows={ROWS}
      rowKey={(row) => row.id}
      aria-label="Records"
      frozenTestId="width-frozen"
      bodyTestId="width-body"
      viewportTestId="width-viewport"
      frozenHeader={
        <TableRow>
          <TableHeaderCell width={FROZEN_CELL_WIDTH}>Name</TableHeaderCell>
        </TableRow>
      }
      frozenRow={(row) => (
        <TableRow style={{ height: 32 }}>
          <TableCell width={FROZEN_CELL_WIDTH}>
            <text>{row.name}</text>
          </TableCell>
        </TableRow>
      )}
      header={
        <TableRow>
          <TableHeaderCell width={DATA_CELL_WIDTH}>Status</TableHeaderCell>
        </TableRow>
      }
      row={() => (
        <TableRow style={{ height: 32 }}>
          <TableCell width={DATA_CELL_WIDTH}>
            <text>tracked</text>
          </TableCell>
        </TableRow>
      )}
    />
  </div>
);

/** What the two panes painted, as the renderer measured them. */
interface Panes {
  /** The frozen pane's row scroller: the pinned column's box. */
  readonly frozen: number;
  /** The data pane's row scroller: the scrolling column's box. */
  readonly body: number;
  /** The horizontal scroller the data pane pans over. */
  readonly viewport: number;
}

/** Mount the composition, read both panes, and unmount it. */
const panesFor = (frozenWidth: number, contentWidth: number): Panes => {
  const mounted = renderData(
    <Frozen frozenWidth={frozenWidth} contentWidth={contentWidth} />,
  );
  root = mounted;
  settle(mounted);
  const panes: Panes = {
    frozen: requireBounds(mounted, "width-frozen").width,
    body: requireBounds(mounted, "width-body").width,
    viewport: requireBounds(mounted, "width-viewport").width,
  };
  mounted.unmount();
  root = undefined;
  return panes;
};

describe("a width the layout cannot paint", () => {
  it("paints the widths the caller declared", () => {
    // The negative control: a readable width is the caller's, exactly, and the
    // data pane's column is its declared total rather than its pane's width.
    expect(panesFor(180, 420)).toEqual({
      frozen: 180,
      body: 420,
      viewport: FRAME_WIDTH - 180,
    });
    expect(panesFor(240, 900)).toEqual({
      frozen: 240,
      body: 900,
      viewport: FRAME_WIDTH - 240,
    });
  });

  it("keeps the frozen pane for a width the layout cannot paint", () => {
    // A pane the layout cannot size reads as **no width**, so it takes its own
    // content's track — the width its frozen cells declare.
    const unreadable = {
      frozen: FROZEN_CELL_WIDTH,
      body: 420,
      viewport: FRAME_WIDTH - FROZEN_CELL_WIDTH,
    };
    expect(panesFor(Number.NaN, 420)).toEqual(unreadable);
    expect(panesFor(Number.POSITIVE_INFINITY, 420)).toEqual(unreadable);

    // Measured before the fix: 0 points of frozen pane and the whole frame
    // (1280) handed to the data pane, so the pinned column vanished.
    expect(panesFor(-180, 420)).toEqual(unreadable);
  });

  it("keeps the data pane's column for a width the layout cannot paint", () => {
    // The same rule on the other width: no declared total means no width, so
    // the column takes the pane it sits in — never a box of zero points.
    const unreadable = {
      frozen: 180,
      body: FRAME_WIDTH - 180,
      viewport: FRAME_WIDTH - 180,
    };
    expect(panesFor(180, Number.NaN)).toEqual(unreadable);
    expect(panesFor(180, Number.NEGATIVE_INFINITY)).toEqual(unreadable);

    // Measured before the fix: 0 points of data column — the scrolling header
    // and rows painted in no box at all — beside a frozen pane of 180.
    expect(panesFor(180, -420)).toEqual(unreadable);
  });
});
