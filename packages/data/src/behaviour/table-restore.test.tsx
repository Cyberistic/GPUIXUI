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

    const painted = paintedText(root);
    expect(painted).toContain("3 rows · 1 selected");
    expect(painted.indexOf("alpha.ts")).toBeLessThan(
      painted.indexOf("notes.txt"),
    );
    expect(painted.indexOf("notes.txt")).toBeLessThan(
      painted.indexOf("readme.md"),
    );

    expect(root.renderer.findByTestId("restore-row-readme")).toBeDefined();
    expect(root.renderer.findByTestId("restore-row-alpha")).toBeDefined();
  });
});

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

const textWith = (testRoot: DataTestRoot, words: string): string =>
  Option.getOrElse(
    Arr.findFirst(testRoot.renderer.getAllText(), Str.includes(words)),
    () => {
      throw new Error(`behaviour: no painted text containing "${words}"`);
    },
  );

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

    pressSaved(root, "saved-name-sort");
    pressSaved(root, "saved-name-sort");
    expect(textWith(root, "order:")).toBe(
      "order: readme.md notes.txt alpha.ts",
    );

    pressSaved(root, "saved-row-alpha");
    expect(paintedText(root)).toContain("3 rows · 1 selected");
    typeInto(root, "saved-filter", "no");
    root.renderer.flush();
    expect(paintedText(root)).toContain("1 rows · 0 selected");

    pressSaved(root, "save-grid");
    expect(paintedText(root)).toContain("1 rows · 0 selected");
    expect(textWith(root, "order:")).toBe("order: notes.txt");
    expect(paintedText(root)).toContain("alpha free");

    pressSaved(root, "show-all");
    expect(paintedText(root)).toContain("3 rows · 1 selected");
    expect(textWith(root, "order:")).toBe(
      "order: readme.md notes.txt alpha.ts",
    );
    expect(paintedText(root)).toContain("alpha chosen");
  });
});

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

    pressSaved(root, "phantom-shift");
    expect(textWith(root, "sorts · ")).toBe("1 sorts · name");
  });
});
