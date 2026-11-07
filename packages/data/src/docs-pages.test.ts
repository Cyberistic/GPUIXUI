import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PageClaim } from "./internal/docs.js";
import { undocumentedProps } from "./internal/docs.js";

const readPage = (file: string): string =>
  readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8");

const readSource = (file: string): string =>
  readFileSync(new URL(file, import.meta.url), "utf8");

const expandableRow: PageClaim = {
  page: "expandable-rows.mdx",
  types: [
    { source: "./table/table.tsx", name: "TableRowProps" },
    { source: "./table/expandable.tsx", name: "TableExpandableRowProps" },
  ],
  heading: "TableExpandableRow",
  omit: ["children"],
};

const claims: ReadonlyArray<PageClaim> = [
  {
    page: "tree-view.mdx",
    types: [{ source: "./tree/tree-view.tsx", name: "TreeViewProps" }],
    heading: "TreeView",
  },
  expandableRow,
  {
    page: "frozen-columns.mdx",
    types: [{ source: "./table/frozen.tsx", name: "FrozenTableProps" }],
    heading: "FrozenTable",
  },
  {
    page: "virtual-tree.mdx",
    types: [{ source: "./virtual/tree.tsx", name: "VirtualTreeProps" }],
    heading: "VirtualTree",
  },
];

describe("the hierarchy and frozen-grid pages' API tables", () => {
  it("documents every prop each page's types declare", () => {
    expect(claims).toHaveLength(4);
    expect(undocumentedProps(claims, readPage, readSource)).toEqual([]);
  });

  it("keeps the expandable row's inherited props in its own table", () => {
    expect(expandableRow.types.map((type) => type.name)).toEqual([
      "TableRowProps",
      "TableExpandableRowProps",
    ]);

    expect(
      undocumentedProps([{ ...expandableRow, omit: [] }], readPage, readSource),
    ).toEqual(["TableExpandableRow: children"]);
  });
});
