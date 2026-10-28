import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { treeCursorMove, type TreeCursor } from "@gpuixui/data/tree/logic";
import {
  FileTreeFrame,
  OPEN_SELECTED,
  WORKSPACE_PATHS,
  fileRows,
  glyphOf,
  openCursor,
  rowId,
  selectionReadout,
  tabRow,
  toggleRow,
  withActive,
  workspaceTree,
} from "./file-tree-demo";
import { treeKeyOf } from "./tree-keys";

/**
 * The File trees preview.
 *
 * `packages/files/docs/file-tree.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page itself carries no
 * `<ComponentPreview>`. The registry's own guard sees the demo; what it cannot
 * see is whether the drawing still runs the package's rules instead of a copy
 * of them. These cases hold the rows to `@gpuixui/files`' `visibleFileRows`,
 * the glyphs to its `fileIcon`, the tab stop to its `fileTreeTab`, the folder
 * toggle to the generic `treeCursorMove` and the source to the new parts.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (
  cursor: TreeCursor = openCursor(),
  selected: string | undefined = OPEN_SELECTED,
): string =>
  renderToStaticMarkup(
    <FileTreeFrame
      cursor={cursor}
      onCursorChange={() => undefined}
      onSelect={() => undefined}
      roots={workspaceTree()}
      selected={selected}
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

  it("reads each glyph from the package's kind rule and gives each depth a guide", () => {
    const roots = workspaceTree();
    const rows = fileRows(roots, openCursor());
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

    // The reference paints no rails: depth is a padding the row carries.
    expect(html.match(/data-guide="true"/g) ?? []).toEqual([]);
    const insetOf = (key: string): string => {
      const start = html.indexOf(`id="${rowId(key)}"`);
      const end = html.indexOf(">", start);
      return html.slice(start, end);
    };
    expect(insetOf("src")).toContain("padding-left:6px");
    expect(insetOf("src/components")).toContain("padding-left:22px");
    expect(insetOf("src/components/button.tsx")).toContain("padding-left:38px");
  });

  it("swaps the folder chevron and leaves a file a blank slot", () => {
    const roots = workspaceTree();
    const open = markup(openCursor());
    const closed = markup({ ...openCursor(), expanded: HashSet.empty() });

    // The chevron is the icon set's glyph, not a character: an open folder and a
    // closed one paint different paths in the same slot.
    const chevronOf = (html: string, key: string): string => {
      const start = html.indexOf(`id="${rowId(key)}"`);
      const slot = html.indexOf('class="gx-filetree-chevron"', start);
      return html.slice(slot, slot + 400);
    };
    expect(chevronOf(open, "src")).not.toBe(chevronOf(closed, "src"));
    expect(chevronOf(open, "src")).toContain("<svg");
    // The file rows have no chevron to turn.
    expect(open.match(/data-branch="true"/g)).toHaveLength(
      Arr.filter(fileRows(roots, openCursor()), (row) => row.hasChildren)
        .length,
    );
    expect(open.match(/data-branch="false"/g)?.length).toBeGreaterThan(0);
  });

  it("flips only the folder a press lands on", () => {
    const roots = workspaceTree();
    const cursor = openCursor();
    const rows = fileRows(roots, cursor);
    const toggled = toggleRow(rows, cursor, "docs");

    expect(HashSet.has(toggled.expanded, "docs")).toBe(false);
    expect(HashSet.has(toggled.expanded, "src")).toBe(true);
    expect(HashSet.size(toggled.expanded)).toBe(
      HashSet.size(cursor.expanded) - 1,
    );
    expect(Option.getOrNull(toggled.active)).toBe("docs");
  });

  it("stands the tab stop on the selected file, else the first row", () => {
    const rows = fileRows(workspaceTree(), openCursor());

    expect(Option.map(tabRow(rows, OPEN_SELECTED), (row) => row.key)).toEqual(
      Option.some(OPEN_SELECTED),
    );
    expect(Option.map(tabRow(rows, undefined), (row) => row.key)).toEqual(
      Option.map(Arr.head(rows), (row) => row.key),
    );
    // A selection inside a closed folder names no painted row.
    expect(
      Option.map(
        tabRow(
          fileRows(workspaceTree(), {
            ...openCursor(),
            expanded: HashSet.empty(),
          }),
          OPEN_SELECTED,
        ),
        (row) => row.key,
      ),
    ).toEqual(Option.some("assets"));
  });

  it("names the row it stands on and paints the selected file", () => {
    const cursor = withActive(openCursor(), "src/app.tsx");
    const html = markup(cursor, "src/app.tsx");

    expect(rowId("src/index.ts")).toBe("gx-filetree-src-index-ts");
    expect(html).toContain('aria-activedescendant="gx-filetree-src-app-tsx"');
    expect(html).toContain('data-selected="true"');
    expect(selectionReadout("src/app.tsx")).toBe("selected: src/app.tsx");
    expect(selectionReadout(undefined)).toBe("nothing selected");
  });

  it("opens a folder with the package's key move, not a local toggle", () => {
    const roots = workspaceTree();
    const closed: TreeCursor = {
      expanded: HashSet.empty(),
      active: Option.some("src"),
    };
    const rows = fileRows(roots, closed);

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

  it("answers the eight keys the tree owns and passes the rest on", () => {
    expect(Option.getOrNull(treeKeyOf("ArrowDown"))).toBe("down");
    expect(Option.getOrNull(treeKeyOf(" "))).toBe("space");
    expect(Option.isNone(treeKeyOf("PageDown"))).toBe(true);
    expect(Arr.length(WORKSPACE_PATHS)).toBeGreaterThanOrEqual(12);
    // `buildFileTree` sorts folders first, then by name.
    expect(Arr.map(workspaceTree(), (node) => node.name)).toEqual([
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
    expect(source).toContain("visibleFileRows");
    expect(source).toContain("fileTreeTab");
    expect(source).toContain("treeCursorMove");
    expect(source).not.toContain("pressSelection");
    expect(source).not.toContain("flattenTree");
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain("flip(row)");
    // A second copy of the kind rule or the flattening would show up as the
    // shape it re-implements: splitting a path, or sorting rows with the native
    // helper instead of the package's order value.
    expect(source).not.toContain("split(");
    const sorts = source.match(/\.sort\(/g) ?? [];
    expect(sorts).toHaveLength(source.match(/Arr\.sort\(/g)?.length ?? 0);
  });
});
