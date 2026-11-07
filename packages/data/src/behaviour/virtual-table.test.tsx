import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { afterEach, describe, expect, it } from "vitest";
import {
  REVEAL_VIRTUAL_ROW,
  VIRTUAL_TABLE_ROWS,
  VirtualTableExample,
} from "../../examples/virtual-table.example.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { TableCell, TableHeaderCell, TableRow } from "../table/table.js";
import { VirtualTable } from "../virtual/table.js";

const paintedRows = (root: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(root.renderer.getPaintedText(), (line) => {
    const index = /^file-(\d{4})\.ts$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index) - 1);
  });

const findId = (root: DataTestRoot, testId: string): number => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`no element with testId ${testId}`);
  return element.id;
};

const boundsOf = (root: DataTestRoot, testId: string) => {
  const bounds = root.renderer.getElementBounds(findId(root, testId));
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

const allText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

const wheel = (root: DataTestRoot, deltaY: number): void => {
  const header = boundsOf(root, "virtual-table-name");
  root.renderer.nativeSimulateScrollWheel(
    header.x + 20,
    header.y + header.height + 10,
    0,
    deltaY,
  );
  root.renderer.flush();
};

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<VirtualTableExample />);

  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the virtualized table", () => {
  it("paints one window of a thousand rows, not the set", () => {
    const root = mount();

    const rows = paintedRows(root);
    expect(rows[0]).toBe(0);

    expect(rows).not.toContain(VIRTUAL_TABLE_ROWS - 1);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(60);

    expect(rows).toEqual(Arr.range(0, rows.length - 1));
  });

  it("keeps the header painted while the window moves", () => {
    const root = mount();
    const headerBefore = boundsOf(root, "virtual-table-name");

    wheel(root, -600);

    const rowsAfter = paintedRows(root);
    expect(rowsAfter).not.toContain(0);
    expect(rowsAfter.length).toBeGreaterThan(0);

    expect(boundsOf(root, "virtual-table-name").y).toBe(headerBefore.y);

    expect(allText(root)).toMatch(/first=\d+ last=\d+/);
  });

  it("reveals a far row by moving the window before it scrolls", () => {
    const root = mount();

    const reveal = boundsOf(root, "virtual-table-reveal");
    root.renderer.nativeSimulateClick(reveal.x + 4, reveal.y + 4);
    settle(root);

    const rows = paintedRows(root);
    expect(rows).toContain(REVEAL_VIRTUAL_ROW);

    expect(rows).not.toContain(0);
    expect(rows.length).toBeGreaterThan(5);
  });

  it("keeps a chosen record selected while the window leaves and returns", () => {
    const root = mount();

    const row = boundsOf(root, "virtual-row-row-3");
    root.renderer.nativeSimulateClick(row.x + 20, row.y + row.height / 2);
    root.renderer.flush();
    expect(allText(root)).toContain("1 selected");

    wheel(root, -600);
    expect(paintedRows(root)).not.toContain(2);

    expect(allText(root)).toContain("1 selected");

    wheel(root, 600);
    expect(paintedRows(root)).toContain(2);
    expect(allText(root)).toContain("1 selected");
  });

  it("narrows to the empty state when no row matches", () => {
    const root = mount();

    root.renderer.nativeSimulateKeystrokes(
      findId(root, "virtual-table-filter"),
      "zzzz",
    );
    root.renderer.flush();

    expect(paintedRows(root)).toEqual([]);
    expect(allText(root)).toContain("No file matches that filter.");
    expect(allText(root)).toContain("0 rows");
  });

  it("re-clamps its window when the set shrinks under it", () => {
    const root = mount();

    const reveal = boundsOf(root, "virtual-table-reveal");
    root.renderer.nativeSimulateClick(reveal.x + 4, reveal.y + 4);
    settle(root);
    expect(paintedRows(root)).toContain(REVEAL_VIRTUAL_ROW);

    root.renderer.nativeSimulateKeystrokes(
      findId(root, "virtual-table-filter"),
      "01",
    );
    root.renderer.flush();

    const painted = Arr.filterMap(root.renderer.getPaintedText(), (line) => {
      const name = /^file-\d{4}\.ts$/.exec(line)?.[0];
      return name === undefined ? Result.failVoid : Result.succeed(name);
    });

    const kept = Arr.filterMap(Arr.range(1, VIRTUAL_TABLE_ROWS), (n) => {
      const name = `file-${String(n).padStart(4, "0")}.ts`;
      const status = ["tracked", "modified", "untracked"][n % 3] ?? "tracked";
      return `${name} ${status} ${n * 5}`.toLowerCase().includes("01")
        ? Result.succeed(name)
        : Result.failVoid;
    });

    expect(Arr.difference(painted, kept)).toEqual([]);

    expect(painted.length).toBeGreaterThanOrEqual(Math.floor(320 / 36));

    expect(painted.at(-1)).toBe(Option.getOrUndefined(Arr.last(kept)));
  });

  it("sorts the whole set, not the mounted window", () => {
    const root = mount();

    const size = boundsOf(root, "virtual-table-size-sort");
    root.renderer.nativeSimulateClick(size.x + 10, size.y + 10);
    settle(root);

    expect(paintedRows(root)[0]).toBe(VIRTUAL_TABLE_ROWS - 1);
    expect(Str.includes("file-1000.ts")(allText(root))).toBe(true);
  });
});

describe("the row count", () => {
  const counted = (count: number, empty?: string) => (
    <VirtualTable
      height={240}
      aria-label="Rows"
      count={count}
      rowHeight={30}
      empty={empty}
      header={
        <TableRow>
          <TableHeaderCell width={120} testId="count-header">
            Name
          </TableHeaderCell>
        </TableRow>
      }
      row={(index) => (
        <TableRow>
          <TableCell width={120} testId={`count-row-${index}`}>
            {`row-${index}`}
          </TableCell>
        </TableRow>
      )}
    />
  );

  it("paints the empty set for a count it cannot read", () => {
    const mounted = renderData(counted(Number.NaN));
    root = mounted;
    settle(mounted);
    expect(allText(mounted)).toContain("No rows");

    mounted.rerender(counted(-3));
    settle(mounted);
    expect(allText(mounted)).toContain("No rows");
  });

  it("reads a blank empty message as the documented No rows", () => {
    const mounted = renderData(counted(0, ""));
    root = mounted;
    settle(mounted);
    expect(allText(mounted)).toContain("No rows");
  });

  it("mounts whole rows for a fractional count", () => {
    const mounted = renderData(counted(2.5));
    root = mounted;
    settle(mounted);
    expect(allText(mounted)).toContain("row-1");
    expect(allText(mounted)).not.toContain("row-2");
  });
});

describe("an overdraw the window cannot read", () => {
  const overdrawn = (overdraw: number) => (
    <VirtualTable
      height={240}
      aria-label="Rows"
      count={VIRTUAL_TABLE_ROWS}
      rowHeight={30}
      overdraw={overdraw}
      header={
        <TableRow>
          <TableHeaderCell width={120}>Name</TableHeaderCell>
        </TableRow>
      }
      row={(index) => (
        <TableRow>
          <TableCell width={120}>{`row-${index}`}</TableCell>
        </TableRow>
      )}
    />
  );

  it("mounts the documented window instead of taking the renderer down", () => {
    const mounted = renderData(overdrawn(Number.NaN));
    root = mounted;
    settle(mounted);

    const painted = Arr.filterMap(mounted.renderer.getPaintedText(), (line) => {
      const index = /^row-(\d+)$/.exec(line)?.[1];
      return index === undefined
        ? Result.failVoid
        : Result.succeed(Number(index));
    });
    expect(painted[0]).toBe(0);
    expect(painted.length).toBeGreaterThan(5);

    expect(painted.length).toBeLessThan(60);
  });
});
