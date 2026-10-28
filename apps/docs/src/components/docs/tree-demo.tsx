import {
  TREE_INDENT,
  expandAll,
  flattenTree,
  treeCursorMove,
  treeName,
  typeAheadRow,
  type TreeCursor,
  type TreeRow,
  type TreeSpec,
} from "@gpuixui/data/tree/logic";
import { useExpandedRows } from "@gpuixui/data/tree/use-expanded";
import {
  DEFAULT_OVERDRAW,
  DEFAULT_ROW_HEIGHT,
  clampScrollOffset,
  createWindowCalculator,
  maxScrollOffset,
  rowIndex,
  type WindowSpec,
} from "@gpuixui/data/virtual/window";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useState, type KeyboardEvent } from "react";
import { treeKeyOf } from "./tree-keys";
import { viewReadout } from "./window-preview";

/**
 * Browser previews for the two tree pages.
 *
 * `TreeView` and `VirtualTree` are GPUix hosts, so neither page can mount its
 * component and both drawings are labelled approximations. What they do not
 * approximate is the tree: the rows are `@gpuixui/data`'s `flattenTree`, the
 * cursor is `useExpandedRows` over the same `treeCursorMove` the shipped
 * controller runs, the typed prefix is `typeAheadRow`, and the window is the
 * package's `createWindowCalculator`. Only the paint is the browser's.
 */

/** One node of the dependency graph the drawings show. */
export interface DependencyNode {
  /** The stable identity the tree expands and focuses by. */
  readonly key: string;
  /** The words the row is painted and named by. */
  readonly name: string;
  /** The version the row paints as a muted suffix, when it has one. */
  readonly version?: string;
  /** The packages this one depends on. */
  readonly children?: ReadonlyArray<DependencyNode>;
}

/** The accessors both controllers take. */
export const dependencySpec: TreeSpec<DependencyNode> = {
  keyOf: (node) => node.key,
  childrenOf: (node) => node.children ?? [],
};

/** The words a row paints; `treeName` reads a blank one as the row's key. */
export const dependencyLabel = (node: DependencyNode): string => node.name;

/** The graph the `TreeView` page draws: a docs app and a playground. */
export const DEPENDENCY_TREE: ReadonlyArray<DependencyNode> = [
  {
    key: "docs",
    name: "@gpuixui/docs",
    version: "0.0.0",
    children: [
      {
        key: "docs/components",
        name: "@gpuixui/components",
        version: "0.0.0",
        children: [
          {
            key: "docs/components/primitives",
            name: "@gpuixui/primitives",
            version: "0.0.0",
          },
          {
            key: "docs/components/tokens",
            name: "@gpuixui/tokens",
            version: "0.0.0",
          },
          { key: "docs/components/tw", name: "@gpuixui/tw", version: "0.0.0" },
        ],
      },
      {
        key: "docs/fumadocs",
        name: "fumadocs-ui",
        version: "15.8.5",
        children: [
          {
            key: "docs/fumadocs/core",
            name: "fumadocs-core",
            version: "15.8.5",
          },
          {
            key: "docs/fumadocs/mdx",
            name: "fumadocs-mdx",
            version: "11.10.1",
          },
        ],
      },
      {
        key: "docs/router",
        name: "@tanstack/react-router",
        version: "1.140.0",
      },
      { key: "docs/effect", name: "effect", version: "4.0.0" },
    ],
  },
  {
    key: "playground",
    name: "@gpuixui/playground",
    version: "0.0.0",
    children: [
      {
        key: "playground/components",
        name: "@gpuixui/components",
        version: "0.0.0",
      },
      { key: "playground/native", name: "@gpuix/native", version: "0.11.0" },
      { key: "playground/react", name: "@gpuix/react", version: "0.11.0" },
    ],
  },
];

/** The branches `TreeView` opens at first paint. */
export const OPEN_BRANCHES: ReadonlyArray<string> = [
  "docs",
  "docs/components",
  "docs/fumadocs",
];

/** The row `TreeView`'s keyboard starts on. */
export const OPEN_ACTIVE = "docs/components/tokens";

/** The rows a reader can see, from the package's own flattening. */
export const dependencyRows = (
  roots: ReadonlyArray<DependencyNode>,
  cursor: TreeCursor,
): ReadonlyArray<TreeRow<DependencyNode>> =>
  flattenTree(roots, dependencySpec, cursor.expanded);

/** The cursor with `key` as the row the keyboard stands on. */
export const withActive = (cursor: TreeCursor, key: string): TreeCursor => ({
  ...cursor,
  active: Option.some(key),
});

/** The index a row paints at, when the tree paints it. */
export const rowIndexOf = (
  rows: ReadonlyArray<TreeRow<DependencyNode>>,
  key: string,
): Option.Option<number> => Arr.findFirstIndex(rows, (row) => row.key === key);

/** The line under `TreeView`: what the cursor and the branches report. */
export const treeReadout = (
  rows: ReadonlyArray<TreeRow<DependencyNode>>,
  cursor: TreeCursor,
): string => {
  const active = Option.flatMap(cursor.active, (key) =>
    Arr.findFirst(rows, (row) => row.key === key),
  );
  const name = Option.match(active, {
    onNone: () => "no active row",
    onSome: (row) => treeName(dependencyLabel(row.node), row.key),
  });
  return `${String(rows.length)} rows · ${String(
    HashSet.size(cursor.expanded),
  )} open · ${name}`;
};

/** The row's element id, so the tree can name the row it stands on. */
export const rowId = (key: string): string =>
  `gx-tree-${key.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** One row's chevron, words and version, shared by both drawings. */
function RowContent({
  row,
  onFlip,
}: {
  readonly row: TreeRow<DependencyNode>;
  readonly onFlip: () => void;
}) {
  return (
    <>
      {row.hasChildren ? (
        <button
          aria-label={
            row.expanded
              ? `Collapse ${dependencyLabel(row.node)}`
              : `Expand ${dependencyLabel(row.node)}`
          }
          className="gx-tree-chevron"
          onClick={(event) => {
            event.stopPropagation();
            onFlip();
          }}
          tabIndex={-1}
          type="button"
        >
          {row.expanded ? "▾" : "▸"}
        </button>
      ) : (
        // A leaf keeps the chevron's track so its label lines up with a branch's,
        // and paints no control: the package's own row has nothing to flip.
        <span
          aria-hidden="true"
          className="gx-tree-chevron"
          data-branch="false"
        />
      )}
      <span className="gx-tree-name">
        {treeName(dependencyLabel(row.node), row.key)}
      </span>
      {row.node.version === undefined ? null : (
        <span className="gx-tree-version">{row.node.version}</span>
      )}
    </>
  );
}

/** The `TreeView` page's drawing: a whole hierarchy, flattened and painted. */
export function DependencyTreeDemo() {
  const tree = useExpandedRows({
    roots: DEPENDENCY_TREE,
    keyOf: dependencySpec.keyOf,
    childrenOf: dependencySpec.childrenOf,
    labelOf: dependencyLabel,
    initialExpanded: OPEN_BRANCHES,
    initialActive: OPEN_ACTIVE,
  });
  const active = Option.getOrUndefined(tree.cursor.active);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = treeKeyOf(event.key);
    if (Option.isSome(key)) {
      event.preventDefault();
      tree.pressKey(key.value);
      return;
    }
    if (event.key.length === 1) tree.typeAhead(event.key);
  };

  return (
    <div className="gx-demo-frame" data-demo="tree-view">
      <div
        aria-activedescendant={active === undefined ? undefined : rowId(active)}
        aria-label="Dependencies"
        className="gx-tree"
        onKeyDown={onKeyDown}
        role="tree"
        tabIndex={0}
      >
        {Arr.map(tree.rows, (row) => {
          const current = row.key === active;
          return (
            <div
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              aria-level={row.depth + 1}
              aria-selected={current}
              className="gx-tree-row"
              data-current={current ? "true" : "false"}
              id={rowId(row.key)}
              key={row.key}
              onClick={() => tree.setActive(Option.some(row.key))}
              role="treeitem"
              style={{ paddingLeft: 6 + row.depth * TREE_INDENT }}
            >
              <RowContent onFlip={() => tree.toggle(row.key)} row={row} />
            </div>
          );
        })}
      </div>
      <p className="gx-demo-readout">{treeReadout(tree.rows, tree.cursor)}</p>
    </div>
  );
}

/** The registries the virtual drawing's graph is built from. */
export const VIRTUAL_REGISTRIES = 12;
/** The namespaces under each registry. */
export const VIRTUAL_NAMESPACES = 12;
/** The packages under each namespace. */
export const VIRTUAL_PACKAGES = 12;

/** One namespace: a branch whose leaves are the packages it holds. */
const namespaceNode = (registry: string, index: number): DependencyNode => ({
  key: `${registry}/ns-${String(index)}`,
  name: `namespace-${String(index).padStart(2, "0")}`,
  children: Arr.map(Arr.range(1, VIRTUAL_PACKAGES), (version) => ({
    key: `${registry}/ns-${String(index)}/pkg-${String(version)}`,
    name: `package-${String(version).padStart(2, "0")}`,
    version: `1.${String(version)}.0`,
  })),
});

/** The graph `VirtualTree` draws: a registry-sized set of thousands of rows. */
export const virtualDependencyTree: ReadonlyArray<DependencyNode> = Arr.map(
  Arr.range(1, VIRTUAL_REGISTRIES),
  (registry) => {
    const name = `registry-${String(registry).padStart(2, "0")}`;
    return {
      key: name,
      name,
      children: Arr.map(Arr.range(1, VIRTUAL_NAMESPACES), (index) =>
        namespaceNode(name, index),
      ),
    };
  },
);

/** Every branch open, which is the set the virtual page's drawing starts on. */
export const virtualTreeExpanded = expandAll(
  virtualDependencyTree,
  dependencySpec,
);

/** The whole flattened set the virtual tree is given. */
export const virtualTreeRows = dependencyRows(virtualDependencyTree, {
  expanded: virtualTreeExpanded,
  active: Option.none(),
});

/** The viewport the page documents, in pixels. */
export const VIRTUAL_TREE_VIEWPORT = 240;

/** Every virtual row paints this height, which is the window's step. */
export const VIRTUAL_TREE_ROW_HEIGHT = DEFAULT_ROW_HEIGHT;

/** Rows mounted beyond the viewport on each side. */
export const VIRTUAL_TREE_OVERDRAW = DEFAULT_OVERDRAW;

/**
 * The window spec over a set of rows.
 *
 * The count is the caller's, because collapsing a branch shrinks the set the
 * shipped tree is given and its window is computed from the set it holds.
 */
export const virtualTreeSpecFor = (count: number): WindowSpec => ({
  count,
  rowHeight: VIRTUAL_TREE_ROW_HEIGHT,
  viewportHeight: VIRTUAL_TREE_VIEWPORT,
  overdraw: VIRTUAL_TREE_OVERDRAW,
});

/** The farthest a drawing's scroll offset may go over `count` rows. */
export const virtualTreeMaxOffset = (count: number): number =>
  maxScrollOffset(virtualTreeSpecFor(count));

/** An offset the window clamps into the rows it holds. */
export const treeOffset = (count: number, offset: number): number =>
  clampScrollOffset(virtualTreeSpecFor(count), offset);

/** The absolute row indices the window mounts at an offset. */
export const treeMountedRows = (
  count: number,
  offset: number,
): ReadonlyArray<number> =>
  createWindowCalculator(virtualTreeSpecFor(count)).indicesAt(
    treeOffset(count, offset),
  );

/** The mounted window, `start` inclusive and `end` exclusive. */
export const treeMountedWindow = (
  count: number,
  offset: number,
): { start: number; end: number } =>
  createWindowCalculator(virtualTreeSpecFor(count)).at(
    treeOffset(count, offset),
  );

/** The offset that reveals one row, the way the shipped tree moves its window. */
export const revealOffsetFor = (count: number, index: number): number =>
  treeOffset(count, rowIndex(index) * VIRTUAL_TREE_ROW_HEIGHT);

/** The row at the viewport's top edge: the one row a window is sure to hold. */
export const anchorIndexFor = (count: number, offset: number): number =>
  Math.min(
    Math.max(count - 1, 0),
    Math.max(
      0,
      Math.floor(treeOffset(count, offset) / VIRTUAL_TREE_ROW_HEIGHT),
    ),
  );

/**
 * The cursor a scroll keeps.
 *
 * The runtime unmounts a row outside the window, and the tree mounts exactly
 * one window of the set, so a row the reader scrolled past cannot hold the tab
 * stop: its `aria-activedescendant` would name an element that is not in the
 * document. The row at the viewport's top edge is the one the new window is
 * guaranteed to hold, which is where the shipped tree moves the cursor. A row
 * the new window still mounts keeps the cursor exactly where it was.
 */
export const cursorAfterScroll = (
  rows: ReadonlyArray<TreeRow<DependencyNode>>,
  cursor: TreeCursor,
  count: number,
  offset: number,
): TreeCursor => {
  const mounted = treeMountedRows(count, offset);
  const stillMounted = Option.flatMap(cursor.active, (key) =>
    Option.map(rowIndexOf(rows, key), (index) => Arr.contains(mounted, index)),
  );
  if (Option.getOrElse(stillMounted, () => false)) return cursor;
  return Option.match(Arr.get(rows, anchorIndexFor(count, offset)), {
    onNone: () => cursor,
    onSome: (row) => withActive(cursor, row.key),
  });
};

/** What the drawing reports about its window. */
export const treeWindowReadout = (count: number, offset: number): string =>
  viewReadout(
    virtualTreeSpecFor(count),
    offset,
    treeMountedRows(count, offset).length,
  );

/** A row's element id in the virtual tree's window. */
export const windowRowId = (key: string): string =>
  `gx-vtree-${key.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** The `VirtualTree` page's drawing: one window of a few thousand rows. */
export function VirtualTreeDemo() {
  const tree = useExpandedRows({
    roots: virtualDependencyTree,
    keyOf: dependencySpec.keyOf,
    childrenOf: dependencySpec.childrenOf,
    labelOf: dependencyLabel,
    initialExpanded: virtualTreeExpanded,
    initialActive: "registry-01",
  });
  const [offset, setOffset] = useState(0);
  const count = tree.rows.length;
  const mounted = treeMountedRows(count, offset);
  const active = Option.getOrUndefined(tree.cursor.active);

  // A cursor move mounts its row before the focus moves: the window is moved to
  // the row's position in the same gesture, which is the shipped tree's rule.
  const commit = (cursor: TreeCursor): void => {
    tree.setCursor(cursor);
    Option.match(cursor.active, {
      onNone: () => {},
      onSome: (key) =>
        Option.match(rowIndexOf(tree.rows, key), {
          onNone: () => {},
          onSome: (index) => {
            if (!Arr.contains(mounted, index)) {
              setOffset(revealOffsetFor(count, index));
            }
          },
        }),
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = treeKeyOf(event.key);
    if (Option.isSome(key)) {
      event.preventDefault();
      commit(treeCursorMove(tree.rows, tree.cursor, key.value));
      return;
    }
    if (event.key.length !== 1) return;
    Option.match(
      typeAheadRow(tree.rows, tree.cursor.active, event.key, (row) =>
        dependencyLabel(row.node),
      ),
      {
        onNone: () => {},
        onSome: (key) => commit(withActive(tree.cursor, key)),
      },
    );
  };

  // A scroll keeps the tab stop on a row the new window mounts, which is the
  // shipped tree's rule: a row outside the window does not exist to focus.
  const scrollTo = (next: number): void => {
    const clamped = treeOffset(count, next);
    setOffset(clamped);
    tree.setCursor(cursorAfterScroll(tree.rows, tree.cursor, count, clamped));
  };

  const revealLast = (): void => {
    Option.match(Arr.last(tree.rows), {
      onNone: () => {},
      onSome: (row) =>
        Option.match(rowIndexOf(tree.rows, row.key), {
          onNone: () => {},
          onSome: (index) => {
            setOffset(revealOffsetFor(count, index));
            tree.setCursor(withActive(tree.cursor, row.key));
          },
        }),
    });
  };

  return (
    <div className="gx-demo-frame" data-demo="virtual-tree">
      <div className="gx-virt-toolbar">
        <label className="gx-virt-scroll">
          <span>Scroll offset</span>
          <input
            aria-label="Scroll offset"
            className="gx-virt-range"
            max={virtualTreeMaxOffset(count)}
            min={0}
            onChange={(event) => scrollTo(Number(event.target.value))}
            step={VIRTUAL_TREE_ROW_HEIGHT}
            type="range"
            value={treeOffset(count, offset)}
          />
        </label>
        <button
          className="gx-table-columns-btn"
          onClick={revealLast}
          type="button"
        >
          Reveal the last row
        </button>
      </div>
      <div
        aria-activedescendant={
          active === undefined ? undefined : windowRowId(active)
        }
        aria-label="Registry dependencies"
        className="gx-tree gx-tree-window"
        onKeyDown={onKeyDown}
        role="tree"
        style={{ height: VIRTUAL_TREE_VIEWPORT }}
        tabIndex={0}
      >
        {Arr.map(mounted, (index) => {
          const row = tree.rows[index];
          if (row === undefined) return null;
          const current = row.key === active;
          const clamped = treeOffset(count, offset);
          return (
            <div
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              aria-level={row.depth + 1}
              aria-selected={current}
              className="gx-tree-row"
              data-current={current ? "true" : "false"}
              id={windowRowId(row.key)}
              key={row.key}
              onClick={() => tree.setActive(Option.some(row.key))}
              role="treeitem"
              style={{
                height: VIRTUAL_TREE_ROW_HEIGHT,
                paddingLeft: 6 + row.depth * TREE_INDENT,
                top: index * VIRTUAL_TREE_ROW_HEIGHT - clamped,
              }}
            >
              <RowContent onFlip={() => tree.toggle(row.key)} row={row} />
            </div>
          );
        })}
      </div>
      <p className="gx-demo-readout">{treeWindowReadout(count, offset)}</p>
    </div>
  );
}

/** The `TreeView` page's copyable native usage, shown in the Code tab. */
export const treeViewDemoSource = `import { TreeView, useExpandedRows } from "@gpuixui/data";

const dependencies = [
  { key: "docs", name: "@gpuixui/docs", children: [
    { key: "docs/components", name: "@gpuixui/components" },
    { key: "docs/effect", name: "effect", version: "4.0.0" },
  ]},
];

export function DependencyTree() {
  const tree = useExpandedRows({
    roots: dependencies,
    keyOf: (node) => node.key,
    childrenOf: (node) => node.children ?? [],
    labelOf: (node) => node.name,
    initialExpanded: ["docs"],
  });

  return (
    <TreeView
      aria-label="Dependencies"
      height={260}
      rows={tree.rows}
      cursor={tree.cursor}
      onCursorChange={tree.setCursor}
      labelOf={(node) => node.name}
      onActivate={(row) => open(row.node)}
    />
  );
}`;

/** The `VirtualTree` page's copyable native usage, shown in the Code tab. */
export const virtualTreeDemoSource = `import { VirtualTree } from "@gpuixui/data";

<VirtualTree
  aria-label="Registry dependencies"
  height={240}
  rowHeight={37}
  rows={tree.rows}
  cursor={tree.cursor}
  onCursorChange={tree.setCursor}
  labelOf={(node) => node.name}
  onActivate={(row) => open(row.node)}
/>;`;
