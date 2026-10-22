/**
 * Guards the fixture `data-table-lifecycle` drives the shipped `@gpuixui/data`
 * files table with.
 *
 * The probe mounts the **example** and asserts its readout, so the risk is a
 * fixture that restates yesterday's screen: a column added, a width changed or a
 * readout segment reordered would leave the window measuring a sentence the
 * table no longer prints. Every id, width and (here) the readout's spelling is
 * therefore read from the example's own source and the component's menu, and the
 * fixture is held to them.
 *
 * `node:fs` is deliberate, as in `registry.test.ts` and `date-picker.test.ts`:
 * this is a check over the repository's own TypeScript, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  DATA_TABLE_BODY,
  DATA_TABLE_COLUMNS,
  DATA_TABLE_COLUMN_RESET,
  DATA_TABLE_COLUMNS_ORDER,
  DATA_TABLE_CONTENT_WIDTH,
  DATA_TABLE_DIVIDER,
  DATA_TABLE_DRAG,
  DATA_TABLE_FILTER,
  DATA_TABLE_INITIAL,
  DATA_TABLE_NAME_HEADER,
  DATA_TABLE_NAME_SORT,
  DATA_TABLE_NAME_WIDTH,
  DATA_TABLE_READOUT,
  DATA_TABLE_SORT_ASC,
  DATA_TABLE_SORT_DESC,
  DATA_TABLE_WIDTHS,
  dataTableCell,
  dataTableColumnToggle,
  dataTableContent,
  dataTableReadout,
  dataTableRow,
} from "./data-table.js";

const example = readFileSync(
  new URL(
    "../../../../packages/data/examples/table.example.tsx",
    import.meta.url,
  ),
  "utf8",
);
const menu = readFileSync(
  new URL("../../../../packages/data/src/columns/menu.tsx", import.meta.url),
  "utf8",
);
const sortHeader = readFileSync(
  new URL("../../../../packages/data/src/sort/header.tsx", import.meta.url),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

describe("the data-table fixture", () => {
  it("reads the example's widths and derives the content from them", () => {
    Arr.forEach(DATA_TABLE_COLUMNS_ORDER, (id) => {
      const declared = new RegExp(
        `\\{\\s*id: "${id}",\\s*label: "[^"]+",\\s*width: (\\d+)`,
      ).exec(example);
      expect(`${id}: ${declared?.[1]}`).toBe(
        `${id}: ${String(DATA_TABLE_WIDTHS[id])}`,
      );
    });
    expect(DATA_TABLE_NAME_WIDTH).toBe(DATA_TABLE_WIDTHS["name"]);
    expect(DATA_TABLE_CONTENT_WIDTH).toBe(460);
    // Hiding a column takes exactly its width out of the content, and a resize
    // moves it by the drag — the arithmetic the probe's readouts rest on.
    expect(dataTableContent(["name", "size"])).toBe(350);
    expect(dataTableContent(DATA_TABLE_COLUMNS_ORDER, 300)).toBe(500);
  });

  it("prints the readout the example interpolates", () => {
    // The example's own template, in its own order, read from the source.
    const template =
      /`\$\{table\.rows\.length\} rows · \$\{selectionSize\(table\.selection\)\} selected · cols=\$\{Arr\.join\(([\s\S]*?)\)\} · w=\$\{nameWidth\} · content=\$\{columns\.contentWidth\} · \$\{Option\.match\(/.exec(
        example,
      );
    expect(template).not.toBeNull();
    expect(example).toContain(
      'Arr.map(columns.visible, (column) => column.id),\n          ","',
    );
    expect(DATA_TABLE_INITIAL).toBe(
      "60 rows · 0 selected · cols=name,status,size · w=260 · content=460 · unsorted",
    );
    // Each segment moves on its own: a selection, a hide and a resize.
    expect(
      dataTableReadout({
        rows: 60,
        selected: 2,
        columns: DATA_TABLE_COLUMNS_ORDER,
        width: 260,
        content: DATA_TABLE_CONTENT_WIDTH,
        sort: DATA_TABLE_SORT_ASC,
      }),
    ).toBe(
      "60 rows · 2 selected · cols=name,status,size · w=260 · content=460 · name-asc",
    );
    expect(
      dataTableReadout({
        rows: 1,
        selected: 0,
        columns: ["name", "size"],
        width: 300,
        content: 390,
        sort: DATA_TABLE_SORT_DESC,
      }),
    ).toBe(
      "1 rows · 0 selected · cols=name,size · w=300 · content=390 · name-desc",
    );
  });

  it("names the parts the example and the menu declare", () => {
    Arr.forEach(
      [
        DATA_TABLE_READOUT,
        DATA_TABLE_FILTER,
        DATA_TABLE_COLUMNS,
        DATA_TABLE_BODY,
        DATA_TABLE_NAME_HEADER,
      ],
      (id) => {
        expect(`${id}: ${example.includes(`"${id}"`)}`).toBe(`${id}: true`);
      },
    );
    // The sort control and the divider are both derived from the header cell's
    // test id, so the fixture's spelling is held to the two derivations rather
    // than to a literal the example never writes.
    expect(example).toContain('testId="files-name"');
    expect(sortHeader).toContain("`${testId}-sort`");
    expect(DATA_TABLE_NAME_SORT).toBe(`${DATA_TABLE_NAME_HEADER}-sort`);
    expect(example).toContain("testId: `files-divider-${column.id}`");
    expect(DATA_TABLE_DIVIDER.endsWith("-name")).toBe(true);
    // The menu derives its toggle and reset ids from the trigger's test id.
    expect(menu).toContain("`${testId}-toggle-${column.id}`");
    expect(menu).toContain("`${testId}-reset`");
    expect(dataTableColumnToggle("status")).toBe(
      `${DATA_TABLE_COLUMNS}-toggle-status`,
    );
    expect(DATA_TABLE_COLUMN_RESET).toBe(`${DATA_TABLE_COLUMNS}-reset`);
  });

  it("names rows and cells the way the example paints them", () => {
    expect(dataTableRow(1)).toBe("files-row-file-1");
    expect(dataTableCell(60, "name")).toBe("files-cell-file-60-name");
    expect(example).toContain("testId={`files-row-${row.id}`}");
    expect(example).toContain("testId={`files-cell-${row.id}-${column.id}`}");
    // The sort tokens the header press produces, from the example's own
    // `initialDirection` and the controller's toggle.
    expect(example).toContain('initialDirection="desc"');
    expect(DATA_TABLE_SORT_ASC).toBe("name-asc");
    expect(DATA_TABLE_SORT_DESC).toBe("name-desc");
    // One drag past the column's own 420 bound would clamp; 40 does not.
    expect(DATA_TABLE_NAME_WIDTH + DATA_TABLE_DRAG).toBeLessThan(420);
  });

  it("holds the probe to the ids and arithmetic above", () => {
    expect(probe).toContain("dataTableReadout");
    expect(probe).toContain("dataTableRow");
    expect(probe).toContain("dataTableContent");
    expect(probe).toContain("DATA_TABLE_DIVIDER");
    expect(probe).toContain("dataTableColumnToggle");
    // The example itself is mounted, not a copy of the composition.
    expect(probe).toContain('dataExamples["table"]');
  });

  it("prints every measured readout in its section", () => {
    const start = readme.indexOf("### `data-table-lifecycle`");
    const end = readme.indexOf("\n### ", start + 1);
    const text =
      start === -1
        ? ""
        : readme
            .slice(start, end === -1 ? undefined : end)
            .replace(/\s+/g, " ");
    expect(text).not.toBe("");
    expect(text).toContain(DATA_TABLE_INITIAL);
    expect(text).toContain("2 selected");
    expect(text).toContain("cols=name,size");
    expect(text).toContain("w=300");
    expect(text).toContain(DATA_TABLE_SORT_DESC);
  });
});
