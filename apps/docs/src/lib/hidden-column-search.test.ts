import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A hidden column is still a column the row model holds.
 *
 * `@gpuixui/data` marks every hidden track `enableGlobalFilter: false`, so a
 * query cannot keep a record by text no painted cell shows, while a sort on
 * that track still orders the set. A reader planning a column menu from either
 * page needs both halves — and a grid that omits `hiddenColumns` silently gets
 * the opposite rule, which is why the pages must teach the option and the
 * package must keep the line that makes it true.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const gridCore = read("packages/data/src/grid-core.ts");
const gridCoreSuite = read("packages/data/src/grid-core.test.ts");
const tableSuite = read("packages/data/src/behaviour/table.test.tsx");
const lanePage = read("apps/docs/content/docs/data-display/index.mdx");
const tablePage = read("apps/docs/content/docs/components/table.mdx");

describe("a hidden column's search rule", () => {
  it("is the package's, not the page's", () => {
    expect(gridCore).toContain(
      "enableGlobalFilter: !HashSet.has(hidden, column.id)",
    );
    expect(gridCore).toContain("hiddenColumns");

    // The two measured directions live in the package's own suites, so a page
    // that prints them cites a case that would fail if the line moved.
    expect(gridCoreSuite).toContain(
      "leaves the search, so no record is kept by text no cell shows",
    );
    expect(gridCoreSuite).toContain(
      "keeps its sort, so hiding the sorted column does not restore the source",
    );
    expect(tableSuite).toContain(
      "keeps a hidden column's text out of the search",
    );
    expect(tableSuite).toContain("20 rows");
    expect(tableSuite).toContain("0 rows");
  });

  it("is taught on the data lane and on the curated table page", () => {
    expect(lanePage).toContain("**A hidden column leaves the search, not the sort**");
    expect(lanePage).toContain("enableGlobalFilter");
    expect(lanePage).toContain("hiddenColumns: columns.hidden");
    expect(lanePage).toContain("**20**");
    expect(lanePage).toContain("**0 rows**");
    expect(lanePage).toContain("table.test.tsx");
    expect(lanePage).toContain("grid-core.test.ts");

    // The copyable snippet declares the controller before the table, then
    // hands the controller's own list to the row model.
    const usage = tablePage.slice(
      tablePage.indexOf("## Usage"),
      tablePage.indexOf("## Composition"),
    );
    const snippet = /```tsx\n([\s\S]*?)```/.exec(usage)?.[1] ?? "";
    expect(snippet, "the usage section has no tsx snippet").not.toBe("");
    const controller = snippet.indexOf("const columns = useColumns(");
    const table = snippet.indexOf("const table = useTable(");
    expect(controller, "the snippet has no useColumns declaration").toBeGreaterThan(
      -1,
    );
    expect(table).toBeGreaterThan(controller);
    expect(snippet).toContain("hiddenColumns: columns.hidden,");
    expect(snippet).toContain("  useColumns,");
    expect(usage).toContain("ColumnMenu");
  });
});
