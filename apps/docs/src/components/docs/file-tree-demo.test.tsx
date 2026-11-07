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

    const chevronOf = (html: string, key: string): string => {
      const start = html.indexOf(`id="${rowId(key)}"`);
      const slot = html.indexOf('class="gx-filetree-chevron"', start);
      return html.slice(slot, slot + 400);
    };
    expect(chevronOf(open, "src")).not.toBe(chevronOf(closed, "src"));
    expect(chevronOf(open, "src")).toContain("<svg");

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

  it("folds a closed branch in the drawing instead of deleting it in a frame", () => {
    const css = read("apps/docs/src/styles/demos.css").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

    const block = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
    };

    expect(block(".gx-filetree-row")).toMatch(
      /transition:[\s\S]*height 200ms[\s\S]*opacity 200ms/,
    );
    expect(block('.gx-filetree-row[data-leaving="true"]')).toContain(
      "height: 0",
    );

    const keyframes = css.slice(css.indexOf("@keyframes gx-filetree-row-in"));
    expect(keyframes.slice(0, keyframes.indexOf("\n}"))).toContain("height: 0");
    expect(keyframes).toContain("height: var(--row-height)");

    const reduceAt = css.indexOf(
      "@media (prefers-reduced-motion: reduce)",
      css.indexOf(".gx-filetree-row"),
    );
    let depth = 0;
    let reduceEnd = reduceAt;
    for (; reduceEnd < css.length; reduceEnd += 1) {
      if (css[reduceEnd] === "{") depth += 1;
      if (css[reduceEnd] === "}" && (depth -= 1) === 0) break;
    }
    const reduced = css.slice(reduceAt, reduceEnd);
    expect(reduced).toContain("transition: none");
    expect(reduced).toContain("animation: none");

    expect(block(".gx-filetree")).not.toMatch(/^\s*height:/m);
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

    expect(source).toContain("paintedRows");
    expect(source).toContain("data-leaving=");
    expect(source).toContain("data-entering=");
    expect(source).not.toContain("pressSelection");
    expect(source).not.toContain("flattenTree");
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain("flip(row)");

    expect(source).not.toContain("split(");
    const sorts = source.match(/\.sort\(/g) ?? [];
    expect(sorts).toHaveLength(source.match(/Arr\.sort\(/g)?.length ?? 0);
  });
});
