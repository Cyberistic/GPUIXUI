/**
 * A frozen grid and a tree handed a row list a store wrote `null` for.
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
import { TableHeaderCell, TableRow, TableCell } from "../table/table.js";
import { FrozenTable } from "../table/frozen.js";
import { TreeView } from "../tree/tree-view.js";
import { DEFAULT_EMPTY_MESSAGE } from "../table/table.js";
import type { TreeRow } from "../tree/logic.js";

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
