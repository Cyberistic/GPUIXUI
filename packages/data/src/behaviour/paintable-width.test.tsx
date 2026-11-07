import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { requireBounds } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { FrozenTable } from "../table/frozen.js";
import { TableCell, TableHeaderCell, TableRow } from "../table/table.js";

const FRAME_WIDTH = 1280;

const FROZEN_CELL_WIDTH = 120;

const DATA_CELL_WIDTH = 140;

const ROWS = Arr.map(Arr.range(0, 4), (index) => ({
  id: `record-${index}`,
  name: `record-${index}`,
}));

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

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

interface Panes {
  readonly frozen: number;

  readonly body: number;

  readonly viewport: number;
}

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
    const unreadable = {
      frozen: FROZEN_CELL_WIDTH,
      body: 420,
      viewport: FRAME_WIDTH - FROZEN_CELL_WIDTH,
    };
    expect(panesFor(Number.NaN, 420)).toEqual(unreadable);
    expect(panesFor(Number.POSITIVE_INFINITY, 420)).toEqual(unreadable);

    expect(panesFor(-180, 420)).toEqual(unreadable);
  });

  it("keeps the data pane's column for a width the layout cannot paint", () => {
    const unreadable = {
      frozen: 180,
      body: FRAME_WIDTH - 180,
      viewport: FRAME_WIDTH - 180,
    };
    expect(panesFor(180, Number.NaN)).toEqual(unreadable);
    expect(panesFor(180, Number.NEGATIVE_INFINITY)).toEqual(unreadable);

    expect(panesFor(180, -420)).toEqual(unreadable);
  });
});
