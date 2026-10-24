/**
 * A row surface handed a row list that is absent, or that holds the hole a
 * store wrote.
 *
 * The bug these guard: the rows a data surface paints are data as often as a
 * literal — a saved workspace restores a panel's rows from JSON, and an app
 * hands `snapshot?.rows` while the snapshot is still absent, which is
 * `undefined` at runtime. The prop types say a list is present, while
 * `FrozenTable` and `TreeView` both dereferenced it (`rows.map`, `rows.length`,
 * and `useTree`'s `Arr.map(rows, …)` for the type-ahead), so one stored
 * absence threw out of the first render: the frozen grid painted neither its
 * frozen column nor its empty message, and the tree painted nothing at all.
 *
 * A list is stored **twice**, and the second half was unguarded everywhere: an
 * entry inside a readable list can be the hole a store wrote (`[null, { … }]`,
 * a record a release dropped). Every row surface then dereferenced it — the
 * grid through the core's `getRowId`, a tree through `row.key`, a frozen pane
 * through its `rowKey` — and the first paint threw and took the whole surface
 * with it. `recordsOf` reads a keyed list; `rowsOf` reads one through the
 * surface's own identity reader.
 *
 * The rule every other part of this package follows is `listOf`: only a list
 * is a list, and a slot with no list paints no rows — the frozen grid's data
 * pane then paints its own empty message, and the tree paints its frame.
 */

import { afterEach, describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { paintedText } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";
import { FrozenTable } from "../table/frozen.js";
import { TreeView } from "../tree/tree-view.js";
import { VirtualTree } from "../virtual/tree.js";
import { DEFAULT_EMPTY_MESSAGE } from "../table/table.js";
import type { TreeRow } from "../tree/logic.js";
import { useTable } from "../use-table.js";
import { emptyTree, type FilterTree } from "../surfaces/logic.js";

let root: DataTestRoot | undefined;

const mount = (node: Parameters<typeof renderData>[0]): DataTestRoot => {
  root = renderData(node);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** The frozen grid's parts, so a case can hand it one row list. */
const frozen = (rows: ReadonlyArray<{ readonly id: string }>) => (
  <FrozenTable
    height={320}
    frozenWidth={160}
    contentWidth={240}
    rows={rows}
    rowKey={(row) => row.id}
    frozenTestId="frozen-pane"
    bodyTestId="frozen-body"
    viewportTestId="frozen-viewport"
    frozenHeader={
      <TableRow>
        <TableHeaderCell width={160}>Name</TableHeaderCell>
      </TableRow>
    }
    frozenRow={(row) => (
      <TableRow key={row.id} testId={`frozen-row-${row.id}`}>
        <TableCell width={160}>{row.id}</TableCell>
      </TableRow>
    )}
    header={
      <TableRow>
        <TableHeaderCell width={240}>Size</TableHeaderCell>
      </TableRow>
    }
    row={(row) => (
      <TableRow key={row.id} testId={`body-row-${row.id}`}>
        <TableCell width={240}>{row.id}</TableCell>
      </TableRow>
    )}
  />
);

const treeRow = (key: string): TreeRow<string> => ({
  node: key,
  key,
  depth: 0,
  parent: Option.none(),
  hasChildren: false,
  expanded: false,
});

describe("a frozen grid whose stored row list is absent", () => {
  it("paints the empty message instead of throwing", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a row list a store wrote as absent. */}
        {frozen(null)}
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain(DEFAULT_EMPTY_MESSAGE);
    // The data pane's header still paints: the grid is empty, not unmounted.
    expect(paintedText(mounted)).toContain("Size");
  });

  it("paints the empty message for an undefined row list too", () => {
    // `snapshot?.rows` is `undefined`, not `null`, when the snapshot has not
    // arrived — the other absence a store writes.
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a row list a store wrote as absent. */}
        {frozen(undefined)}
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain(DEFAULT_EMPTY_MESSAGE);
  });

  it("still paints the rows a readable list holds", () => {
    const mounted = mount(<div>{frozen([{ id: "file-1" }])}</div>);
    expect(paintedText(mounted)).toContain("file-1");
    expect(paintedText(mounted)).not.toContain(DEFAULT_EMPTY_MESSAGE);
    expect(mounted.renderer.findByTestId("body-row-file-1")).not.toBe(
      undefined,
    );
  });
});

/** A grid over the row list a caller hands the controller. */
const StoredGrid = ({
  rows,
  filterTree,
}: {
  readonly rows: ReadonlyArray<{ readonly id: string }>;
  readonly filterTree?: FilterTree;
}) => {
  const table = useTable({
    rows,
    keyOf: (row) => row.id,
    columns: [{ id: "name", valueOf: (row) => row.id }],
    filterTree,
  });
  return (
    <div>
      <text testId="grid-readout">
        {`${table.rows.length} rows · ${table.selectedCount} selected`}
      </text>
      <Table height={200}>
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow key={row.id} testId={`grid-row-${row.id}`}>
                <TableCell>{row.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

describe("a grid whose stored row list is absent", () => {
  it("paints no rows instead of throwing", () => {
    // The rows a grid is handed are stored data too: a saved workspace
    // restores them from JSON, and `snapshot?.rows` is `undefined` before the
    // snapshot arrives. `useTable` handed the value to the core's `data` and to
    // the tree filter raw, so one absence threw out of the first render.
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a row list a store wrote as absent. */}
        <StoredGrid rows={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(paintedText(mounted)).toContain("0 rows · 0 selected");
  });

  it("narrows an absent list through a filter tree without throwing", () => {
    const mounted = mount(
      <div>
        <StoredGrid
          // @ts-expect-error — a row list a store wrote as absent.
          rows={undefined}
          filterTree={emptyTree}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("0 rows · 0 selected");
  });

  it("still paints the rows a readable list holds", () => {
    const mounted = mount(<StoredGrid rows={[{ id: "alpha" }]} />);
    expect(paintedText(mounted)).toContain("1 rows · 0 selected");
    expect(mounted.renderer.findByTestId("grid-row-alpha")).not.toBe(undefined);
  });
});

describe("a tree whose stored row list is absent", () => {
  // @ts-expect-error — a row list a store wrote as absent.
  const absentRows: ReadonlyArray<TreeRow<string>> = null;

  it("paints its frame instead of throwing", () => {
    const mounted = mount(
      <div>
        <TreeView
          aria-label="Files"
          testId="tree"
          height={200}
          rows={absentRows}
          labelOf={(node) => node}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(mounted.renderer.findByTestId("tree")).not.toBe(undefined);
  });

  it("still paints the rows a readable list holds", () => {
    const mounted = mount(
      <TreeView
        aria-label="Files"
        testId="tree"
        height={200}
        rows={[treeRow("alpha")]}
        labelOf={(node) => node}
      />,
    );
    expect(paintedText(mounted)).toContain("alpha");
    expect(mounted.renderer.findByTestId("tree-row-alpha")).not.toBe(undefined);
  });
});

/** The row list a store wrote with one record dropped out of the middle. */
const holedRows: ReadonlyArray<{ readonly id: string }> = [
  { id: "alpha" },
  // @ts-expect-error — a hole a store wrote inside the list.
  null,
  { id: "beta" },
];

describe("a grid whose saved row list holds a hole", () => {
  it("paints the rows it can name instead of throwing", () => {
    // Before the read, the core's `getRowId` threw
    // `Cannot read properties of null (reading 'id')` out of the first build,
    // so the readout, the rows and the empty state all went with it.
    const mounted = mount(
      <div>
        <StoredGrid rows={holedRows} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("2 rows · 0 selected");
    expect(paintedText(mounted)).toContain("after");
    expect(mounted.renderer.findByTestId("grid-row-alpha")).not.toBe(undefined);
    expect(mounted.renderer.findByTestId("grid-row-beta")).not.toBe(undefined);
  });

  it("narrows a holed list through a filter tree without throwing", () => {
    // The tree reads every record through a column's own value reader before
    // the core builds a row model, so a hole must be gone by then.
    const mounted = mount(
      <div>
        <StoredGrid rows={holedRows} filterTree={emptyTree} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("2 rows · 0 selected");
  });
});

describe("a frozen grid whose saved row list holds a hole", () => {
  it("paints both panes instead of throwing from rowKey", () => {
    const mounted = mount(
      <div>
        {frozen(holedRows)}
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(paintedText(mounted)).not.toContain(DEFAULT_EMPTY_MESSAGE);
    expect(mounted.renderer.findByTestId("frozen-row-alpha")).not.toBe(
      undefined,
    );
    expect(mounted.renderer.findByTestId("body-row-beta")).not.toBe(undefined);
  });
});

describe("a tree whose saved row list holds a hole", () => {
  const holedTreeRows: ReadonlyArray<TreeRow<string>> = [
    treeRow("alpha"),
    // @ts-expect-error — a hole a store wrote inside the list.
    null,
    treeRow("beta"),
  ];

  it("paints the rows it can name instead of throwing", () => {
    // `useTree` walked every entry for its type-ahead table and the paint read
    // `row.key`, so the hole threw `(reading 'key')` before the frame painted.
    const mounted = mount(
      <div>
        <TreeView
          aria-label="Files"
          testId="holed-tree"
          height={200}
          rows={holedTreeRows}
          labelOf={(node) => node}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("alpha");
    expect(paintedText(mounted)).toContain("beta");
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a windowed tree whose row list is absent", () => {
    // The windowed tree read `dataRows.length` for its window and painted from
    // the same list, so one absence threw before its frame existed.
    const mounted = mount(
      <div>
        <VirtualTree
          aria-label="Files"
          testId="absent-virtual-tree"
          height={200}
          // @ts-expect-error — a row list a store wrote as absent.
          rows={null}
          labelOf={(node: string) => node}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(
      mounted.renderer.findByTestId("absent-virtual-tree"),
    ).not.toBe(undefined);
  });

  it("paints a windowed tree's rows around a hole", () => {
    const mounted = mount(
      <div>
        <VirtualTree
          aria-label="Files"
          testId="holed-virtual-tree"
          height={200}
          rows={holedTreeRows}
          labelOf={(node: string) => node}
        />
        <text>after</text>
      </div>,
    );
    expect(
      mounted.renderer.findByTestId("holed-virtual-tree-row-alpha"),
    ).not.toBe(undefined);
    expect(
      mounted.renderer.findByTestId("holed-virtual-tree-row-beta"),
    ).not.toBe(undefined);
  });
});
