/**
 * The file tree's model: how a flat path list nests, and how the generic tree
 * primitives it composes with behave over that nesting.
 *
 * The bugs these guard:
 *
 * - a flat list that nests a file under the wrong folder, or a folder that
 *   paints even though its own entry is closed;
 * - an expansion set that does not return to the rows it started from;
 * - a type-ahead that finds a row hidden inside a collapsed branch, so the
 *   reader jumps to a file it cannot see;
 * - a duplicated path painting two rows that answer to one key.
 */

import {
  collapseAll,
  expandAll,
  flattenTree,
  isExpanded,
  toggleExpanded,
  typeAheadRow,
  type TreeRow,
  type TreeSpec,
} from "@gpuixui/data";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { buildFileTree, fileIcon, fileKindOf, type FileNode } from "./logic.js";

const spec: TreeSpec<FileNode> = {
  keyOf: (node) => node.path,
  childrenOf: (node) => node.children ?? [],
};

const keys = (rows: ReadonlyArray<TreeRow<FileNode>>): ReadonlyArray<string> =>
  Arr.map(rows, (row) => row.key);

describe("buildFileTree", () => {
  it("nests a flat path list into folders first, then files", () => {
    const roots = buildFileTree([
      "readme.md",
      "src/index.ts",
      "src/components/button.tsx",
      "src/components/table/row.tsx",
    ]);
    expect(keys(flattenTree(roots, spec, expandAll(roots, spec)))).toEqual([
      "src",
      "src/components",
      "src/components/table",
      "src/components/table/row.tsx",
      "src/components/button.tsx",
      "src/index.ts",
      "readme.md",
    ]);
  });

  it("treats a path with descendants as a folder even when it appears bare", () => {
    const roots = buildFileTree(["src", "src/a.ts"]);
    expect(roots).toEqual([
      {
        name: "src",
        path: "src",
        children: [{ name: "a.ts", path: "src/a.ts" }],
      },
    ]);
  });

  it("paints a duplicated path once", () => {
    const roots = buildFileTree(["src/a.ts", "src/a.ts", "src/b.ts"]);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.children).toEqual([
      { name: "a.ts", path: "src/a.ts" },
      { name: "b.ts", path: "src/b.ts" },
    ]);
  });
});

describe("the expansion state", () => {
  const roots = buildFileTree(["src/a.ts", "src/b.ts", "readme.md"]);

  it("round-trips: closing a branch returns the rows it started from", () => {
    const closed = flattenTree(roots, spec, collapseAll());
    expect(keys(closed)).toEqual(["src", "readme.md"]);

    const opened = flattenTree(roots, spec, HashSet.make("src"));
    expect(keys(opened)).toEqual(["src", "src/a.ts", "src/b.ts", "readme.md"]);

    expect(keys(flattenTree(roots, spec, collapseAll()))).toEqual(keys(closed));
  });

  it("toggling a branch twice leaves it closed", () => {
    const once = toggleExpanded(collapseAll(), "src");
    expect(isExpanded(once, "src")).toBe(true);
    expect(isExpanded(toggleExpanded(once, "src"), "src")).toBe(false);
  });
});

describe("type-ahead", () => {
  const roots = buildFileTree(["readme.md", "src/index.ts", "src/row.tsx"]);
  const labelOf = (row: TreeRow<FileNode>): string => row.node.name;

  it("skips a collapsed branch", () => {
    const collapsed = flattenTree(roots, spec, collapseAll());
    // `row` only matches the hidden `row.tsx`, so nothing visible matches.
    expect(typeAheadRow(collapsed, Option.none(), "row", labelOf)).toEqual(
      Option.none(),
    );

    const opened = flattenTree(roots, spec, HashSet.make("src"));
    expect(typeAheadRow(opened, Option.none(), "row", labelOf)).toEqual(
      Option.some("src/row.tsx"),
    );
  });
});

describe("kinds and glyphs", () => {
  it("classifies an extension into a kind and paints its glyph", () => {
    expect(fileKindOf("photo.png", false)).toBe("image");
    expect(fileKindOf("button.tsx", false)).toBe("code");
    expect(fileKindOf("package.json", false)).toBe("config");
    expect(fileKindOf("rows.csv", false)).toBe("data");
    expect(fileKindOf("src", true)).toBe("folder");
    expect(fileIcon("folder", false)).toBe("folder");
    expect(fileIcon("folder", true)).toBe("folder-open");
  });

  it("falls back to a plain file for an unknown extension", () => {
    expect(fileKindOf("report.xyz", false)).toBe("file");
    expect(fileIcon(fileKindOf("report.xyz", false), true)).toBe("file");
  });
});
