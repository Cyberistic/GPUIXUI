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

  it("folds a closed branch in the drawing instead of deleting it in a frame", () => {
    // The bug: the rows were dropped the moment the cursor closed the folder,
    // so the branch vanished in one frame and the tree's height jumped. The
    // drawing keeps them for a height/opacity fold — native code has no
    // transform, so a row animates its own box rather than a scale.
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
    // The entering rows grow from the same zero, so both directions travel.
    const keyframes = css.slice(css.indexOf("@keyframes gx-filetree-row-in"));
    expect(keyframes.slice(0, keyframes.indexOf("\n}"))).toContain("height: 0");
    expect(keyframes).toContain("height: var(--row-height)");

    // A reduced reader gets the snap, on both halves of the journey.
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

    // The tree's own box is content-sized, so its total height follows the
    // fold rather than sitting on a fixed box the rows collapse inside.
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
    // The fold keeps the package's row order: the closed branch's rows are put
    // back where they stood, not appended or hidden in place.
    expect(source).toContain("paintedRows");
    expect(source).toContain("data-leaving=");
    expect(source).toContain("data-entering=");
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
