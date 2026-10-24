/**
 * The tree, expandable-row, frozen-grid and windowed-tree pages, held to their
 * types.
 *
 * The bug this guards, measured while writing it: `tree-view.mdx`,
 * `expandable-rows.mdx`, `frozen-columns.mdx` and `virtual-tree.mdx` are the
 * only pages a consumer reads for these components, and their tables were tied
 * to nothing. **Six props the interfaces declare were undocumented** —
 * `TreeView.className`, `VirtualTree.className` and `instanceRef`, and the
 * `className`, `selected` and `instanceRef` a `TableExpandableRow` inherits
 * from `TableRowProps` — while a `disabled` row and a row's `instanceRef` are
 * exactly what a keyboard walk needs. A prop added to an interface would have
 * left the page teaching an older API with every suite green.
 *
 * The expandable row is the one claim with a parent type: its props extend
 * `Omit<TableRowProps, "children" | "onClick">`, so the parent is named as a
 * second reference and its omitted fields are taken away. A frozen grid names
 * its host props (`style`, `ref`, `aria-label`) beside its own — the runtime
 * `Props` surface is opaque to the reader.
 *
 * `node:fs` is test-only, the shape `readme.test.ts` and the sibling
 * `surfaces/docs.test.ts` use.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PageClaim } from "./internal/docs.js";
import { undocumentedProps } from "./internal/docs.js";

const readPage = (file: string): string =>
  readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8");

const readSource = (file: string): string =>
  readFileSync(new URL(file, import.meta.url), "utf8");

/** The one claim whose types span two files: the row and its parent. */
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
    // A claim list that stopped naming a page must not pass.
    expect(claims).toHaveLength(4);
    expect(undocumentedProps(claims, readPage, readSource)).toEqual([]);
  });

  it("keeps the expandable row's inherited props in its own table", () => {
    // The parent is read as a second reference, so the row's table answers for
    // what `TableRowProps` declares — `selected`, `disabled`, `instanceRef`
    // and `className` are the row's props too.
    expect(expandableRow.types.map((type) => type.name)).toEqual([
      "TableRowProps",
      "TableExpandableRowProps",
    ]);
    // `children` is the one parent field the row's `extends … Omit` takes away,
    // so a table documenting it would teach a prop the row refuses. Measured as
    // the claim without its omit list: the field is then required exactly once.
    expect(
      undocumentedProps([{ ...expandableRow, omit: [] }], readPage, readSource),
    ).toEqual(["TableExpandableRow: children"]);
  });
});
