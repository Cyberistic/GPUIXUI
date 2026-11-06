import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "@gpuixui/primitives/button";
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
import {
  clickCentreOf,
  paintedText,
  typeInto,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import type { FilterTree } from "../surfaces/logic.js";
import { useTable } from "../use-table.js";

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly lane: "even" | "odd";
}

const FILES: ReadonlyArray<FileRow> = Array.from({ length: 10 }, (_, at) => ({
  id: `file-${at + 1}`,
  name: `file-${String(at + 1).padStart(2, "0")}.ts`,
  lane: (at + 1) % 2 === 0 ? "even" : "odd",
}));

const COLUMNS = [
  {
    id: "name",
    label: "Name",
    width: 180,
    valueOf: (row: FileRow) => row.name,
  },
  {
    id: "lane",
    label: "Lane",
    width: 80,
    valueOf: (row: FileRow) => row.lane,
  },
];

const keyOf = (row: FileRow): string => row.id;

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const press = (testRoot: DataTestRoot, testId: string): void => {
  clickCentreOf(testRoot, testId);
  testRoot.renderer.flush();
};

const readout = (testRoot: DataTestRoot): string =>
  Option.getOrElse(
    Arr.findFirst(testRoot.renderer.getAllText(), Str.startsWith("page ")),
    () => {
      throw new Error("behaviour: the page readout is not painted");
    },
  );

const PagedGrid = ({
  stored,
  pageSize,
}: {
  readonly stored?: unknown;
  readonly pageSize?: number;
}) => {
  const table = useTable({
    rows: FILES,
    keyOf,
    columns: COLUMNS,
    stored,
    pageSize,
  });
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button testId="page-previous" onActivate={table.previousPage}>
          Previous
        </Button>
        <Button testId="page-next" onActivate={table.nextPage}>
          Next
        </Button>
        <Button
          testId="page-choose-page"
          onActivate={() => table.setAllSelected(true)}
        >
          Choose page
        </Button>
        <Button testId="page-two" onActivate={() => table.setPageSize(2)}>
          Two a page
        </Button>
        <Button testId="page-three" onActivate={() => table.setPageSize(3)}>
          Three a page
        </Button>
        <text testId="page-readout">
          {`page ${table.pageIndex + 1}/${table.pageCount} · ${table.rows.length} rows · ${table.selectedCount} selected · all=${table.allSelected} some=${table.someSelected} · active=${Option.getOrElse(table.activeKey, () => "none")} · stop=${Option.getOrElse(table.tabStop, () => "none")}`}
        </text>
      </div>
      <TableFilterField
        value={table.query}
        onValueChange={table.setQuery}
        testId="page-filter"
      />
      <Table height={280}>
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width={180}>Name</TableHeaderCell>
              <TableHeaderCell width={80}>Lane</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow
                key={row.id}
                testId={`page-row-${row.id}`}
                selected={table.isSelected(row.id)}
                onClick={() => table.press(row.id)}
              >
                <TableCell width={180}>{row.name}</TableCell>
                <TableCell width={80}>{row.lane}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

const keepOdd: FilterTree = {
  kind: "all",
  children: [
    { kind: "predicate", field: "lane", comparison: "equals", value: "odd" },
  ],
};

const TreePagedGrid = () => {
  const [tree, setTree] = useState<FilterTree | undefined>(undefined);
  const table = useTable({
    rows: FILES,
    keyOf,
    columns: COLUMNS,
    filterTree: tree,
    pageSize: 3,
  });
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button testId="tree-narrow" onActivate={() => setTree(keepOdd)}>
          Odd
        </Button>
        <Button testId="tree-next" onActivate={table.nextPage}>
          Next
        </Button>
        <text testId="tree-page-readout">
          {`page ${table.pageIndex + 1}/${table.pageCount} · ${table.rows.length} rows`}
        </text>
      </div>
      <Table height={280}>
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width={180}>Name</TableHeaderCell>
              <TableHeaderCell width={80}>Lane</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow
                key={row.id}
                testId={`page-row-${row.id}`}
                selected={table.isSelected(row.id)}
                onClick={() => table.press(row.id)}
              >
                <TableCell width={180}>{row.name}</TableCell>
                <TableCell width={80}>{row.lane}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

describe("a paged grid", () => {
  it("paints one page of the kept set, and the arrows move it", () => {
    root = renderData(<PagedGrid pageSize={4} />);
    settle(root);

    expect(readout(root)).toContain("page 1/3 · 4 rows");
    expect(readout(root)).toContain("stop=file-1");
    expect(root.renderer.findByTestId("page-row-file-1")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-4")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-5")).toBeUndefined();

    press(root, "page-next");
    expect(readout(root)).toContain("page 2/3 · 4 rows");
    expect(root.renderer.findByTestId("page-row-file-5")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-1")).toBeUndefined();

    press(root, "page-previous");
    expect(readout(root)).toContain("page 1/3 · 4 rows");
  });

  it("returns to the first page when a filter narrows the set", () => {
    root = renderData(<PagedGrid pageSize={4} />);
    settle(root);

    press(root, "page-next");
    press(root, "page-next");
    expect(readout(root)).toContain("page 3/3 · 2 rows");

    typeInto(root, "page-filter", "odd");
    root.renderer.flush();
    expect(readout(root)).toContain("page 1/2 · 4 rows");
    expect(paintedText(root)).toContain("file-01.ts");
    expect(paintedText(root)).not.toContain("file-02.ts");
  });

  it("paints the last page when a saved index is past the set", () => {
    root = renderData(
      <PagedGrid
        pageSize={4}
        stored={{ pagination: { pageIndex: 5, pageSize: 4 } }}
      />,
    );
    settle(root);

    expect(readout(root)).toContain("page 3/3");
    expect(readout(root)).toContain("2 rows");
    expect(root.renderer.findByTestId("page-row-file-9")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-10")).toBeDefined();
  });

  it("steps from the page it paints, not the saved index it clamped", () => {
    root = renderData(
      <PagedGrid
        pageSize={4}
        stored={{ pagination: { pageIndex: 5, pageSize: 4 } }}
      />,
    );
    settle(root);
    expect(readout(root)).toContain("page 3/3");

    press(root, "page-previous");
    expect(readout(root)).toContain("page 2/3 · 4 rows");
    expect(root.renderer.findByTestId("page-row-file-5")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-9")).toBeUndefined();

    press(root, "page-previous");
    expect(readout(root)).toContain("page 1/3 · 4 rows");
    expect(root.renderer.findByTestId("page-row-file-1")).toBeDefined();
  });

  it("keeps the painted page's top row when the saved index was clamped", () => {
    root = renderData(
      <PagedGrid
        pageSize={4}
        stored={{ pagination: { pageIndex: 5, pageSize: 4 } }}
      />,
    );
    settle(root);
    expect(readout(root)).toContain("page 3/3");

    press(root, "page-three");
    expect(readout(root)).toContain("page 3/4 · 3 rows");
    expect(root.renderer.findByTestId("page-row-file-7")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-10")).toBeUndefined();
  });

  it("returns to the first page when the predicate tree narrows the set", () => {
    root = renderData(<TreePagedGrid />);
    settle(root);
    expect(readout(root)).toContain("page 1/4 · 3 rows");

    press(root, "tree-next");
    press(root, "tree-next");
    expect(readout(root)).toContain("page 3/4 · 3 rows");
    expect(root.renderer.findByTestId("page-row-file-7")).toBeDefined();

    press(root, "tree-narrow");
    expect(readout(root)).toContain("page 1/2 · 3 rows");
    expect(root.renderer.findByTestId("page-row-file-1")).toBeDefined();
    expect(root.renderer.findByTestId("page-row-file-7")).toBeUndefined();

    press(root, "tree-next");
    expect(readout(root)).toContain("page 2/2 · 2 rows");
    expect(root.renderer.findByTestId("page-row-file-7")).toBeDefined();
  });

  it("keeps a chosen record while another page paints", () => {
    root = renderData(<PagedGrid pageSize={4} />);
    settle(root);

    press(root, "page-row-file-1");
    expect(readout(root)).toContain("1 selected");
    expect(readout(root)).toContain("active=file-1");

    press(root, "page-next");
    expect(readout(root)).toContain("1 selected");
    expect(readout(root)).toContain("active=none");
    expect(readout(root)).toContain("stop=file-5");

    press(root, "page-previous");
    expect(readout(root)).toContain("active=file-1");
    expect(readout(root)).toContain("stop=file-1");
  });

  it("covers the painted page with the header's box, not the whole set", () => {
    root = renderData(<PagedGrid pageSize={4} />);
    settle(root);

    press(root, "page-choose-page");
    expect(readout(root)).toContain("4 selected");
    expect(readout(root)).toContain("all=true");

    press(root, "page-next");
    expect(readout(root)).toContain("4 selected");
    expect(readout(root)).toContain("all=false");
    expect(readout(root)).toContain("some=false");
  });

  it("keeps the reader's top row when the page size changes", () => {
    root = renderData(<PagedGrid pageSize={4} />);
    settle(root);

    press(root, "page-next");
    expect(readout(root)).toContain("page 2/3 · 4 rows");

    press(root, "page-two");
    expect(readout(root)).toContain("page 3/5 · 2 rows");
    expect(root.renderer.findByTestId("page-row-file-5")).toBeDefined();
  });
});
