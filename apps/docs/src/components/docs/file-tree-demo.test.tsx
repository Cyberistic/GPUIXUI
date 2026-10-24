import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { fileIcon, fileKindOf } from "@gpuixui/files/tree/logic";
import { treeCursorMove, type TreeCursor } from "@gpuixui/data/tree/logic";
import { emptySelection, pressSelection } from "@gpuixui/data/selection/logic";
import {
  FileTreeFrame,
  WORKSPACE_PATHS,
  chosenKeys,
  fileRows,
  glyphOf,
  openCursor,
  rowId,
  selectionReadout,
  treeKeyOf,
  withActive,
  workspaceTree,
} from "./file-tree-demo";

/**
 * The File trees preview.
 *
 * `packages/files/docs/file-tree.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page itself carries no
 * `<ComponentPreview>`. The registry's own guard sees the demo; what it cannot
 * see is whether the drawing still runs the package's rules instead of a copy
 * of them. These cases hold the rows to `@gpuixui/files`' `buildFileTree` and
 * `fileIcon`, the flattening and the keyboard to `@gpuixui/data`'s tree, and
 * the selection to its `pressSelection`.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (cursor: TreeCursor = openCursor()): string =>
  renderToStaticMarkup(
    <FileTreeFrame
      cursor={cursor}
      onCursorChange={() => undefined}
      onSelectionChange={() => undefined}
      roots={workspaceTree()}
      selection={emptySelection}
    />,
  );

describe("the FileTree preview", () => {
  it("paints the rows the package's tree flattens, and none of the closed ones", () => {
    const roots = workspaceTree();
    const cursor = openCursor();
    const rows = fileRows(roots, cursor);
    const html = markup(cursor);

    expect(rows.length).toBeGreaterThan(10);
    expect(html.match(/role="treeitem"/g)).toHaveLength(rows.length);

    // A closed folder's children are absent from the drawing, not hidden: the
    // branch set is the cursor's own.
    const collapsed = fileRows(roots, { ...cursor, expanded: HashSet.empty() });
    expect(collapsed.length).toBeLessThan(rows.length);
    expect(markup({ ...cursor, expanded: HashSet.empty() })).not.toContain(
      "app.tsx",
    );
    expect(html).toContain("app.tsx");
  });

  it("reads each glyph from the package's kind rule, through the open state", () => {
    const roots = workspaceTree();
    const rows = fileRows(roots, openCursor());

    expect(glyphOf({ name: "logo.svg", path: "logo.svg" }, false)).toBe(
      fileIcon(fileKindOf("logo.svg", false), false),
    );
    const folder = {
      name: "src",
      path: "src",
      children: [{ name: "index.ts", path: "src/index.ts" }],
    };
    expect(glyphOf(folder, false)).toBe("folder");
    expect(glyphOf(folder, true)).toBe("folder-open");

    const html = markup();
    const missing = Arr.map(
      Arr.filter(
        rows,
        (row) =>
          !html.includes(`data-icon="${glyphOf(row.node, row.expanded)}"`),
      ),
      (row) => row.key,
    );
    expect(missing).toEqual([]);
  });

  it("names the row it stands on, so a reader hears the cursor move", () => {
    const cursor = {
      expanded: HashSet.make("src"),
      active: Option.some("src/index.ts"),
    };

    expect(rowId("src/index.ts")).toBe("gx-filetree-src-index-ts");
    expect(markup(cursor)).toContain(
      'aria-activedescendant="gx-filetree-src-index-ts"',
    );
    expect(markup(cursor)).toContain('id="gx-filetree-src-index-ts"');

    // A press moves the roving tab stop onto the row it chose.
    expect(Option.getOrNull(withActive(cursor, "readme.md").active)).toBe(
      "readme.md",
    );
    // A cursor with no row names none, rather than naming an id no row has.
    expect(markup({ ...cursor, active: Option.none() })).not.toContain(
      "aria-activedescendant",
    );
  });

  it("opens a folder with the package's key move, not a local toggle", () => {
    const roots = workspaceTree();
    const closed: TreeCursor = {
      expanded: HashSet.empty(),
      active: Option.some("src"),
    };
    const rows = fileRows(roots, closed);
    const opened = treeCursorMove(rows, withActive(closed, "src"), "enter");

    expect(HashSet.has(opened.expanded, "src")).toBe(true);
    // Right on a closed branch opens it; Left closes it again.
    expect(
      HashSet.has(treeCursorMove(rows, closed, "right").expanded, "src"),
    ).toBe(true);
    const open = { ...closed, expanded: HashSet.make("src") };
    expect(
      HashSet.has(
        treeCursorMove(fileRows(roots, open), open, "left").expanded,
        "src",
      ),
    ).toBe(false);
  });

  it("reports the selection the package's press rule produces", () => {
    const order = Arr.map(
      fileRows(workspaceTree(), openCursor()),
      (row) => row.key,
    );
    const one = pressSelection(emptySelection, "src/app.tsx", "replace", order);
    const two = pressSelection(one, "readme.md", "toggle", order);

    expect(chosenKeys(one)).toEqual(["src/app.tsx"]);
    expect(chosenKeys(two)).toEqual(["readme.md", "src/app.tsx"]);
    expect(selectionReadout(two)).toBe("2 chosen: readme.md, src/app.tsx");
    expect(selectionReadout(emptySelection)).toBe("nothing chosen");
  });

  it("answers the eight keys the tree owns and passes the rest on", () => {
    expect(Option.getOrNull(treeKeyOf("ArrowDown"))).toBe("down");
    expect(Option.getOrNull(treeKeyOf(" "))).toBe("space");
    expect(Option.isNone(treeKeyOf("PageDown"))).toBe(true);
    expect(Arr.length(WORKSPACE_PATHS)).toBeGreaterThanOrEqual(12);
    // `buildFileTree` sorts folders first, then by name.
    const roots = workspaceTree();
    expect(Arr.map(roots, (node) => node.name)).toEqual([
      "assets",
      "docs",
      "src",
      "package.json",
      "readme.md",
      "tsconfig.json",
    ]);
  });

  it("runs the package's rules instead of restating them", () => {
    const source = read("apps/docs/src/components/docs/file-tree-demo.tsx");

    expect(source).toContain('from "@gpuixui/files/tree/logic"');
    expect(source).toContain("buildFileTree");
    expect(source).toContain("flattenTree");
    expect(source).toContain("treeCursorMove");
    expect(source).toContain("pressSelection");
    // A second copy of the kind rule or the flattening would show up as the
    // shape it re-implements: splitting a path, or sorting rows with the native
    // helper instead of the package's order value.
    expect(source).not.toContain("split(");
    const sorts = source.match(/\.sort\(/g) ?? [];
    expect(sorts).toHaveLength(source.match(/Arr\.sort\(/g)?.length ?? 0);
  });
});
