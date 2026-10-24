/**
 * A grid reopened from the state a store saved.
 *
 * The gap this guards: `useTable` started every grid at the source order, with
 * an empty query and nothing chosen — `initialSort` was the only starting
 * state — so a workspace that saved its sorting, its search and its selection
 * had no way to hand them back through the shipped controller. The seam that
 * reads a saved record (`readGridState`) existed and was documented for
 * `constructGrid`, but it was reachable only by a caller building the table
 * itself. `stored` reads it once at mount, so the parts paint a grid the reader
 * left sorted, narrowed and chosen.
 *
 * The second half is the same rule the seam already states: a record this
 * release cannot use reads as the slice it can — an unreadable sorting list is
 * no sort, a query that is not text is no query, and a chosen set keeps only the
 * ids the store set to `true`.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";
import { TableFilterField } from "../filter/field.js";
import { paintedText } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { useTable } from "../use-table.js";

interface FileRow {
  readonly id: string;
  readonly name: string;
}

const FILES: ReadonlyArray<FileRow> = [
  { id: "alpha", name: "alpha.ts" },
  { id: "notes", name: "notes.txt" },
  { id: "readme", name: "readme.md" },
];

const COLUMNS = [
  {
    id: "name",
    label: "Name",
    width: 260,
    valueOf: (row: FileRow) => row.name,
  },
];

const keyOf = (row: FileRow): string => row.id;

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** A grid over the three files, opened from a record the caller hands it. */
const RestoredGrid = ({ stored }: { readonly stored?: unknown }) => {
  const table = useTable({ rows: FILES, keyOf, columns: COLUMNS, stored });
  return (
    <div>
      <TableFilterField
        value={table.query}
        onValueChange={table.setQuery}
        testId="restore-filter"
      />
      <text testId="restore-readout">
        {`${table.rows.length} rows · ${table.selectedCount} selected`}
      </text>
      <Table height={240}>
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow
                key={row.id}
                testId={`restore-row-${row.id}`}
                selected={table.isSelected(row.id)}
              >
                <TableCell>{row.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

describe("a grid reopened from a saved state", () => {
  it("opens sorted, narrowed and chosen as the record saved it", () => {
    root = renderData(
      <RestoredGrid
        stored={{
          sorting: [{ id: "name", desc: true }],
          globalFilter: "e",
          rowSelection: { notes: true },
        }}
      />,
    );
    settle(root);

    // The query narrowed the set before the sort ordered it: `e` keeps the
    // notes and the readme, and descending puts `readme.md` first.
    const painted = paintedText(root);
    expect(painted).toContain("2 rows · 1 selected");
    expect(painted).not.toContain("alpha.ts");
    expect(painted.indexOf("readme.md")).toBeLessThan(
      painted.indexOf("notes.txt"),
    );
    expect(root.renderer.findByTestId("restore-row-readme")).toBeDefined();
    expect(root.renderer.findByTestId("restore-row-alpha")).toBeUndefined();
  });

  it("reads a state this release cannot use as the slice it can", () => {
    // A record a store or an older release wrote is not trusted: the sorting is
    // not a list, the query is not text, and one chosen id is not `true`.
    root = renderData(
      <RestoredGrid
        stored={{
          sorting: null,
          globalFilter: 42,
          rowSelection: { alpha: "yes", readme: true },
        }}
      />,
    );
    settle(root);

    // No sort and no query: the source order, whole.
    const painted = paintedText(root);
    expect(painted).toContain("3 rows · 1 selected");
    expect(painted.indexOf("alpha.ts")).toBeLessThan(
      painted.indexOf("notes.txt"),
    );
    expect(painted.indexOf("notes.txt")).toBeLessThan(
      painted.indexOf("readme.md"),
    );
    // Only the id the store set to `true` is chosen; the string is no choice.
    expect(root.renderer.findByTestId("restore-row-readme")).toBeDefined();
    expect(root.renderer.findByTestId("restore-row-alpha")).toBeDefined();
  });
});
