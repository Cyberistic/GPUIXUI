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
 *
 * The record is also **written** here: `table.save()` composes the state the
 * grid runs (the order it can actually sort, the query, the core's chosen ids)
 * and a remount reads it back, so the round trip a workspace depends on is one
 * window case rather than a caller re-deriving the wire shape. A chosen record
 * a filter hides is saved because retention is a view, not a write — the saved
 * ids are the core's. A saved sort that names a column this release dropped is
 * not a sort: the row model already skipped it, so counting it in the order
 * made a Shift press announce "sort 2 of 2" above one sort.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "@gpuixui/primitives/button";
import { TableSortHeader } from "../sort/header.js";
import type { GridConfig } from "../grid-core.js";
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
import { paintedText, typeInto } from "../internal/interaction.js";
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

/** A row with a size, so a sort has two fields to order by. */
interface SizedFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

const SIZED_FILES: ReadonlyArray<SizedFile> = [
  { id: "alpha", name: "alpha.ts", size: 30 },
  { id: "notes", name: "notes.txt", size: 20 },
  { id: "readme", name: "readme.md", size: 40 },
];

const SIZED_COLUMNS = [
  {
    id: "name",
    label: "Name",
    width: 200,
    valueOf: (row: SizedFile) => row.name,
  },
  {
    id: "size",
    label: "Size",
    width: 90,
    valueOf: (row: SizedFile) => row.size,
  },
];

const sizedKeyOf = (row: SizedFile): string => row.id;

/** One row of the window's text, found by the words it contains. */
const textWith = (testRoot: DataTestRoot, words: string): string =>
  Option.getOrElse(
    Arr.findFirst(testRoot.renderer.getAllText(), Str.includes(words)),
    () => {
      throw new Error(`behaviour: no painted text containing "${words}"`);
    },
  );

/** Press `testId` through the runtime's real hit testing. */
const pressSaved = (testRoot: DataTestRoot, testId: string): void => {
  const element = testRoot.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`behaviour: no element with testId "${testId}"`);
  const bounds = testRoot.renderer.getElementBounds(element.id);
  if (bounds === null)
    throw new Error(`behaviour: no painted box for ${testId}`);
  testRoot.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  testRoot.renderer.flush();
};

/** A grid a reader sorts, chooses, narrows and then saves. */
const SavedGrid = ({
  stored,
  onSave,
}: {
  readonly stored: unknown;
  readonly onSave: (next: GridConfig) => void;
}) => {
  const table = useTable({
    rows: SIZED_FILES,
    keyOf: sizedKeyOf,
    columns: SIZED_COLUMNS,
    stored,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button testId="save-grid" onActivate={() => onSave(table.save())}>
          Save
        </Button>
        <Button testId="show-all" onActivate={() => table.setQuery("")}>
          Show all
        </Button>
        <text testId="saved-readout">
          {`${table.keys.length} rows · ${table.selectedCount} selected`}
        </text>
        <text testId="saved-order">
          {`order: ${Arr.join(
            Arr.map(table.rows, (row) => row.name),
            " ",
          )}`}
        </text>
        <text testId="saved-choice">
          {table.isSelected("alpha") ? "alpha chosen" : "alpha free"}
        </text>
      </div>
      <TableFilterField
        value={table.query}
        onValueChange={table.setQuery}
        testId="saved-filter"
      />
      <Table height={240}>
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableSortHeader
                field="name"
                label="Name"
                sort={table.sort}
                order={table.sortOrder}
                onSortPress={table.pressSort}
                width={200}
                testId="saved-name"
              />
              <TableHeaderCell width={90}>Size</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow
                key={row.id}
                testId={`saved-row-${row.id}`}
                selected={table.isSelected(row.id)}
                onClick={() => table.press(row.id)}
              >
                <TableCell width={200}>{row.name}</TableCell>
                <TableCell width={90}>{`${row.size}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

/**
 * The saved record, held where a store would hold it.
 *
 * A keyed remount is the "open the workspace again" step: `useTable` reads
 * `stored` once, so the fresh mount is the only reading a saved record gets.
 */
const SaveHarness = () => {
  const [saved, setSaved] = useState<unknown>(undefined);
  const [generation, setGeneration] = useState(0);
  return (
    <SavedGrid
      key={generation}
      stored={saved}
      onSave={(next) => {
        setSaved(next);
        setGeneration((current) => current + 1);
      }}
    />
  );
};

describe("the record a grid writes to a store", () => {
  it("reopens the sorted, narrowed and chosen grid it saved", () => {
    root = renderData(<SaveHarness />);
    settle(root);

    // Sort by name, descending: readme, notes, alpha.
    pressSaved(root, "saved-name-sort");
    pressSaved(root, "saved-name-sort");
    expect(textWith(root, "order:")).toBe(
      "order: readme.md notes.txt alpha.ts",
    );

    // Choose alpha, then narrow the set until alpha is not painted: the view
    // releases it, while the core still holds the id.
    pressSaved(root, "saved-row-alpha");
    expect(paintedText(root)).toContain("3 rows · 1 selected");
    typeInto(root, "saved-filter", "no");
    root.renderer.flush();
    expect(paintedText(root)).toContain("1 rows · 0 selected");

    // Save, and reopen from the record.
    pressSaved(root, "save-grid");
    expect(paintedText(root)).toContain("1 rows · 0 selected");
    expect(textWith(root, "order:")).toBe("order: notes.txt");
    expect(paintedText(root)).toContain("alpha free");

    // The query widened: the record the store saved is chosen again, and the
    // sort is the order the reader left.
    pressSaved(root, "show-all");
    expect(paintedText(root)).toContain("3 rows · 1 selected");
    expect(textWith(root, "order:")).toBe(
      "order: readme.md notes.txt alpha.ts",
    );
    expect(paintedText(root)).toContain("alpha chosen");
  });
});

/** A grid opened from a record, with the one gesture that reads the order. */
const PhantomSortGrid = ({ stored }: { readonly stored?: unknown }) => {
  const table = useTable({
    rows: SIZED_FILES,
    keyOf: sizedKeyOf,
    columns: SIZED_COLUMNS,
    stored,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button
          testId="phantom-shift"
          onActivate={() =>
            table.pressSort("name", "asc", {
              shift: true,
              ctrl: false,
              alt: false,
              cmd: false,
            })
          }
        >
          Tie-break by name
        </Button>
        <text testId="phantom-order">
          {`${table.sortOrder.length} sorts · ${Arr.join(
            Arr.map(table.sortOrder, (entry) => entry.field),
            ",",
          )}`}
        </text>
        <text testId="phantom-rows">
          {Arr.join(
            Arr.map(table.rows, (row) => row.id),
            ",",
          )}
        </text>
      </div>
    </div>
  );
};

describe("a saved sort that names a column this release dropped", () => {
  it("is not an order the grid counts", () => {
    // The release that saved this sorted by `path`; the column is gone, so the
    // row model cannot compare it and paints the source order.
    root = renderData(
      <PhantomSortGrid
        stored={{
          sorting: [{ id: "path", desc: true }],
          globalFilter: "",
          rowSelection: {},
        }}
      />,
    );
    settle(root);

    expect(textWith(root, "sorts · ")).toBe("0 sorts · ");
    expect(paintedText(root)).toContain("alpha,notes,readme");

    // A Shift press on a live column is the only sort: the dropped one must not
    // become its tie-break, which announced "sort 2 of 2" above one sort.
    pressSaved(root, "phantom-shift");
    expect(textWith(root, "sorts · ")).toBe("1 sorts · name");
  });
});
