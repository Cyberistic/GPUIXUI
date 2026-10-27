/**
 * Holds `file-tree-lifecycle` to the shipped tree, its arithmetic and its prose.
 *
 * The gap this guards: Tier 4's *File trees* row cited `virtual-tree-lifecycle`,
 * which measures the runtime's `<virtual-list>` around a probe-local
 * flattening — no window had mounted `@gpuixui/files`' `FileTree`, pressed one
 * of its rows or read its parts. If this probe is rewritten around a local
 * list, the registry, the README and the row would still claim the component
 * while measuring a fixture.
 *
 * The second guard is the surface: the tree now declares its rows with
 * `FileTreeFolder` / `FileTreeFile`, selects one file path and reports folder
 * expansion separately. A probe that fell back to the old `roots` accessors, or
 * a page that still taught a checkbox, would pass a loose test and fail the
 * reader.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { buildFileTree } from "@gpuixui/files";
import { describe, expect, it } from "vitest";
import {
  FILE_TREE_ASSETS,
  FILE_TREE_BUTTON,
  FILE_TREE_CHECKS,
  FILE_TREE_IDS,
  FILE_TREE_INDEX,
  FILE_TREE_INDEX_PICKED,
  FILE_TREE_OPENED,
  FILE_TREE_PATHS,
  FILE_TREE_README,
  FILE_TREE_README_PICKED,
  FILE_TREE_REST,
  FILE_TREE_ROWS_OPEN,
  FILE_TREE_SRC,
  FILE_TREE_VISIBLE_ROWS,
  fileTreeReadout,
  fileTreeRow,
} from "./file-tree.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./file-tree-probe.tsx");
const fixture = read("./file-tree.ts");
const component = read("../../../../packages/files/src/tree/file-tree.tsx");
const page = read("../../../../packages/files/docs/file-tree.mdx");
const inventory = read("../../../../COMPONENTS.md");
const todo = read("../../../../TODO.md");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `file-tree-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

/** The COMPONENTS.md row named `title`. */
const row = (title: string): string => {
  const start = inventory.indexOf(`| ${title} |`);
  if (start === -1) return "";
  const end = inventory.indexOf("\n", start);
  return inventory.slice(start, end === -1 ? undefined : end);
};

/** The Interlocks row that names `needle`, or an empty string. */
const interlock = (needle: string): string => {
  const line = Arr.findFirst(
    Arr.filter(todo.split("\n"), (text) => text.startsWith("| ")),
    (text) => text.includes(needle),
  );
  return Option.getOrElse(line, () => "");
};

describe("the workspace the scene builds", () => {
  it("flattens the path list into the roots and children the checks name", () => {
    const roots = buildFileTree(FILE_TREE_PATHS);
    expect(Arr.map(roots, (node) => node.path)).toEqual([
      FILE_TREE_ASSETS,
      FILE_TREE_SRC,
      "config.json",
      FILE_TREE_README,
    ]);
    const src = Arr.findFirst(roots, (node) => node.path === FILE_TREE_SRC);
    expect(
      Option.map(src, (node) =>
        Arr.map(node.children ?? [], (child) => child.path),
      ),
    ).toEqual(Option.some([FILE_TREE_BUTTON, FILE_TREE_INDEX]));
    // Opening `src` is the only expansion the probe drives, so the row count it
    // scrolls to is the fixture's own: four roots plus the two files.
    const files = Option.map(src, (node) => node.children?.length ?? 0);
    expect(FILE_TREE_ROWS_OPEN).toBe(
      Arr.length(roots) + Option.getOrElse(files, () => 0),
    );
    expect(FILE_TREE_ROWS_OPEN).toBe(6);
    expect(FILE_TREE_ROWS_OPEN).toBeGreaterThan(FILE_TREE_VISIBLE_ROWS);
  });

  it("prints one readout line per state the steps drive", () => {
    expect(fixture).toContain("export const FILE_TREE_CHECKS = 26;");
    expect(fileTreeReadout(FILE_TREE_REST)).toBe(
      "sel=0 keys=none picked=- opens=none",
    );
    expect(fileTreeReadout(FILE_TREE_OPENED)).toBe(
      "sel=0 keys=none picked=- opens=src",
    );
    expect(fileTreeReadout(FILE_TREE_README_PICKED)).toBe(
      "sel=1 keys=readme.md picked=readme.md opens=src",
    );
    expect(fileTreeReadout(FILE_TREE_INDEX_PICKED)).toBe(
      "sel=1 keys=src/index.ts picked=src/index.ts opens=src",
    );
    expect(
      fileTreeReadout({
        selected: [FILE_TREE_README],
        picked: Option.some(FILE_TREE_README),
        opens: [FILE_TREE_SRC, FILE_TREE_ASSETS],
      }),
    ).toBe("sel=1 keys=readme.md picked=readme.md opens=assets,src");
  });

  it("addresses a row the way the component names it", () => {
    expect(component).toContain("`${testId}-row-${row.key}`");
    expect(probe).toContain("renderNodes(buildFileTree(FILE_TREE_PATHS))");
    expect(fileTreeRow(FILE_TREE_INDEX)).toBe("file-tree-row-src/index.ts");
    expect(FILE_TREE_IDS.tree).toBe("file-tree");
  });
});

describe("the component the probe measures", () => {
  it("mounts the package's FileTree parts, not a probe-local list", () => {
    expect(probe).toContain('from "@gpuixui/files"');
    expect(probe).toContain("<FileTree");
    expect(probe).toContain("<FileTreeFolder");
    expect(probe).toContain("<FileTreeFile");
    expect(probe).not.toContain("<TreeView");
    expect(probe).not.toContain("itemCount=");
    expect(probe).toContain(
      "height={FILE_TREE_VISIBLE_ROWS * theme.density.rowHeight}",
    );
  });

  it("moves the pointer onto a row before pressing it", () => {
    // Measured: a click sent without a preceding move lands on whatever the last
    // move hovered — after the probe's wheel, the row press reached nothing.
    expect(probe).toContain("yield* ctx.host.hover(fileTreeRow(path));");
    expect(probe).toContain("yield* ctx.host.click(fileTreeRow(path));");
    expect(
      Arr.every(
        [FILE_TREE_SRC, FILE_TREE_README, FILE_TREE_BUTTON],
        (path) => !probe.includes(`ctx.host.click(fileTreeRow(${path}))`),
      ),
    ).toBe(true);
  });

  it("selects one file path and reports expansion separately", () => {
    // The component's mechanism: a file press calls `onSelect`, a folder press
    // only flips the cursor's expanded set.
    expect(component).toContain("if (row.node.children === undefined)");
    expect(component).toContain("onSelect?.(row.key)");
    expect(component).toContain("onExpandedChange?.(fileTreePaths(next))");
    expect(component).not.toContain("Checkbox");
    expect(component).not.toContain("pressSelection");
    // …and the page teaches the same two props.
    expect(page).toContain("defaultExpanded");
    expect(page).toContain("onSelect");
    expect(page).toContain("guide");
  });

  it("asserts exactly the checks its record prints", () => {
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(sites).toBe(FILE_TREE_CHECKS);
    expect(FILE_TREE_CHECKS).toBe(26);
  });
});

describe("the record the probe leaves", () => {
  it("is registered once, over the tree capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "file-tree-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("tree");
    expect(entries[0]?.title).toContain("FileTree");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only file-tree-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(FILE_TREE_CHECKS);
  });

  it("prints the rows, the box and the scroll the probe measured", () => {
    // 6 rows of 32 in a 4-row box: the tree is 128 tall and the end is −64.
    expect(section).toContain("**128**");
    expect(section).toContain("**−64**");
    expect(section).toContain("**32**");
    expect(section).toContain("file-tree-open");
    expect(section).toContain("virtual-tree-lifecycle");
    expect(section).toContain("reports no selection");
  });

  it("is the evidence the Tier 4 File trees row cites", () => {
    const trees = row("File trees");
    expect(trees).toContain("file-tree-lifecycle");
    expect(trees).toContain("yes (measured)");
    expect(trees).toContain("guide");
    expect(trees).toContain("one selected");
    expect(trees).toContain("virtual-tree-lifecycle");
  });

  it("records the checkbox gap as resolved by the one-selected-path surface", () => {
    const gap = interlock("The **`FileTree` checkbox** gap");
    expect(gap).toContain("resolved");
    expect(gap).toContain("one selected");
    expect(gap).not.toContain("| open —");
  });
});
