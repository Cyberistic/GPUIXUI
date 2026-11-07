import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  DATA_TREE,
  DATA_TREE_INITIAL,
  DATA_TREE_READOUT,
  DATA_TREE_REVEAL,
  DATA_TREE_REVEALED,
  DATA_TREE_ROWS_ALL,
  DATA_TREE_ROWS_FOLDED,
  DATA_TREE_ROWS_OPEN,
  DATA_TREE_ROWS_REVEALED,
  dataTreeReadout,
  dataTreeRow,
} from "./data-tree.js";

const example = readFileSync(
  new URL(
    "../../../../packages/data/examples/tree.example.tsx",
    import.meta.url,
  ),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

interface Node {
  readonly name: string;
  readonly children?: ReadonlyArray<Node>;
}

const parseWorkspace = (): ReadonlyArray<Node> => {
  const start = example.indexOf("const workspace: ReadonlyArray<FileNode> = [");
  const body = example.slice(start);
  const open = body.indexOf("[");
  const close = body.indexOf("\n];");
  return scanNodes(body, open + 1, close).nodes;
};

const readNode = (
  text: string,
  at: number,
  limit: number,
): { readonly node: Node; readonly next: number } => {
  const name = /file\("([^"]+)"/.exec(text.slice(at));
  const label = name?.[1] ?? "";
  const nameEnd = at + (name?.index ?? 0) + (name?.[0].length ?? 0);
  const open = text.indexOf("[", nameEnd);
  const close = text.indexOf(")", nameEnd);
  if (open === -1 || open > close || open > limit) {
    return { node: { name: label }, next: close + 1 };
  }
  const childrenEnd = closingBracket(text, open);
  return {
    node: {
      name: label,
      children: scanNodes(text, open + 1, childrenEnd).nodes,
    },
    next: text.indexOf(")", childrenEnd) + 1,
  };
};

const closingBracket = (
  text: string,
  open: number,
  depth = 0,
  at = open,
): number => {
  const nextOpen = text.indexOf("[", at + 1);
  const nextClose = text.indexOf("]", at + 1);
  if (nextClose === -1) return text.length;
  if (nextOpen !== -1 && nextOpen < nextClose) {
    return closingBracket(text, open, depth + 1, nextOpen);
  }
  return depth === 0
    ? nextClose
    : closingBracket(text, open, depth - 1, nextClose);
};

const scanNodes = (
  text: string,
  at: number,
  limit: number,
): { readonly nodes: ReadonlyArray<Node>; readonly next: number } => {
  const start = text.indexOf('file("', at);
  if (start === -1 || start > limit) return { nodes: [], next: at };
  const read = readNode(text, start, limit);
  const rest = scanNodes(text, read.next, limit);
  return { nodes: [read.node, ...rest.nodes], next: rest.next };
};

const visibleRows = (
  nodes: ReadonlyArray<Node>,
  expanded: ReadonlySet<string>,
): number =>
  Arr.reduce(
    nodes,
    0,
    (sum, node) =>
      sum +
      1 +
      (expanded.has(node.name)
        ? visibleRows(node.children ?? [], expanded)
        : 0),
  );

const allKeys = (nodes: ReadonlyArray<Node>): ReadonlySet<string> =>
  new Set(
    Arr.flatMap(nodes, (node) => [node.name, ...allKeys(node.children ?? [])]),
  );

describe("the data-tree fixture", () => {
  it("derives the tree's shape and the counts the probe prints", () => {
    const roots = parseWorkspace();
    expect(Arr.map(roots, (node) => node.name)).toEqual([
      "src",
      "docs",
      "package.json",
    ]);

    expect(DATA_TREE_ROWS_OPEN).toBe(visibleRows(roots, new Set(["src"])));
    expect(DATA_TREE_ROWS_FOLDED).toBe(visibleRows(roots, new Set()));
    expect(DATA_TREE_ROWS_ALL).toBe(visibleRows(roots, allKeys(roots)));

    expect(DATA_TREE_ROWS_REVEALED).toBe(
      visibleRows(roots, new Set(["src", "components", "table"])),
    );
    expect(DATA_TREE_REVEALED).toBe("row.tsx");
    expect(example).toContain('tree.reveal("row.tsx")');
    expect(example).toContain('initialExpanded: ["src"]');
    expect(example).toContain('initialActive: "src"');
  });

  it("prints the readout the example interpolates", () => {
    expect(example).toContain(
      '`${tree.rows.length} rows · active=${Option.getOrElse(tree.active, () => "-")}`',
    );
    expect(DATA_TREE_INITIAL).toBe(`${DATA_TREE_ROWS_OPEN} rows · active=src`);
    expect(dataTreeReadout({ rows: 3, active: Option.some("row.tsx") })).toBe(
      "3 rows · active=row.tsx",
    );
    expect(dataTreeReadout({ rows: 3, active: Option.none() })).toBe(
      "3 rows · active=-",
    );
  });

  it("names the rows and actions the component and example declare", () => {
    Arr.forEach([DATA_TREE_READOUT, DATA_TREE_REVEAL], (id) => {
      expect(`${id}: ${example.includes(`"${id}"`)}`).toBe(`${id}: true`);
    });
    expect(DATA_TREE).toBe("tree");
    expect(dataTreeRow("row.tsx")).toBe("tree-row-row.tsx");

    const view = readFileSync(
      new URL(
        "../../../../packages/data/src/tree/tree-view.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(view).toContain("`${testId}-row-${row.key}`");
  });

  it("holds the probe to the fixture", () => {
    expect(probe).toContain("dataTreeReadout");
    expect(probe).toContain("dataTreeRow");
    expect(probe).toContain("DATA_TREE_ROWS_REVEALED");
    expect(probe).toContain('dataExamples["tree"]');
  });

  it("keeps its readout id apart from the windowed tree's", () => {
    const virtual = probe.slice(probe.indexOf("const VirtualTreeProbe"));
    const id = /<Readout testId="([^"]+)"/.exec(virtual)?.[1];
    expect(id).toBeDefined();
    expect(DATA_TREE_READOUT).not.toBe(id);
    expect(example).toContain(`"${DATA_TREE_READOUT}"`);
  });

  it("prints every measured readout in its section", () => {
    const start = readme.indexOf("### `data-tree-lifecycle`");
    const end = readme.indexOf("\n### ", start + 1);
    const text =
      start === -1
        ? ""
        : readme
            .slice(start, end === -1 ? undefined : end)
            .replace(/\s+/g, " ");
    expect(text).not.toBe("");
    expect(text).toContain(DATA_TREE_INITIAL);
    expect(text).toContain(`${DATA_TREE_ROWS_FOLDED} rows`);
    expect(text).toContain(`${DATA_TREE_ROWS_REVEALED} rows`);
    expect(text).toContain(`${DATA_TREE_ROWS_ALL} rows`);
    expect(text).toContain("active=row.tsx");
  });
});
