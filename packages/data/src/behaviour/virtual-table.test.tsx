/**
 * The virtualized table in the real GPUix renderer, mounted through the shipped
 * example.
 *
 * The bugs these guard are the ones a windowed body can hide behind a plausible
 * box size and a range callback:
 *
 * - every row retained and built while the table claims to be virtualized, so
 *   the cell *looks* right and the frame carries the whole set;
 * - a reveal that asks the runtime to scroll to a row the window never built
 *   (the order is window first, scroll second);
 * - a header that scrolls with the rows because it was composed inside the row
 *   scroller (the runtime paints no `position: "sticky"`);
 * - a selection keyed by painted index, so it moves to another record when the
 *   window does.
 *
 * The assertion is on `getPaintedText` — the text that reached the frame — not
 * `getAllText`, because the windowed mode still retains the slice React built.
 */

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

/** The absolute row indices that actually reached the frame. */
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

/** Wheel over the painted rows, inside the body the wheel belongs to. */
const wheel = (root: DataTestRoot, deltaY: number): void => {
  // Below the header is the body: the header is a sibling of the row scroller,
  // and a wheel over it scrolls nothing. A `<virtual-list>` paints no surface
  // of its own, so its box is the header's bottom edge rather than a painted
  // rectangle.
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
  // The table's body takes the measured difference between the viewport and
  // the header, and both arrive as paint-driven `onLayout` events.
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
    // The last declared row is retained by React but never built: a body that
    // paints it is not windowed, whatever its height says.
    expect(rows).not.toContain(VIRTUAL_TABLE_ROWS - 1);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(60);
    // The window is contiguous from the top: a gap would leave an estimate box.
    expect(rows).toEqual(Arr.range(0, rows.length - 1));
  });

  it("keeps the header painted while the window moves", () => {
    const root = mount();
    const headerBefore = boundsOf(root, "virtual-table-name");

    wheel(root, -600);

    const rowsAfter = paintedRows(root);
    expect(rowsAfter).not.toContain(0);
    expect(rowsAfter.length).toBeGreaterThan(0);
    // The rows moved and the header did not: it is a sibling of the row
    // scroller, not a sticky row inside it.
    expect(boundsOf(root, "virtual-table-name").y).toBe(headerBefore.y);
    // The runtime's own range report reached the app.
    expect(allText(root)).toMatch(/first=\d+ last=\d+/);
  });

  it("reveals a far row by moving the window before it scrolls", () => {
    const root = mount();

    const reveal = boundsOf(root, "virtual-table-reveal");
    root.renderer.nativeSimulateClick(reveal.x + 4, reveal.y + 4);
    settle(root);

    const rows = paintedRows(root);
    expect(rows).toContain(REVEAL_VIRTUAL_ROW);
    // The target is inside a window, with overdraw rows above it — not the only
    // row the runtime could build.
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
    // Selection is by record: a window that no longer paints the row must not
    // silently release it.
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

    // The reveal leaves the window near row 900 of the thousand; the filter
    // then narrows the set to thirty-seven rows fewer than that.
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
    // The example's own filter rule, over its own row set: the whole row text
    // is matched, so a size carrying `01` keeps a name that does not.
    const kept = Arr.filterMap(Arr.range(1, VIRTUAL_TABLE_ROWS), (n) => {
      const name = `file-${String(n).padStart(4, "0")}.ts`;
      const status = ["tracked", "modified", "untracked"][n % 3] ?? "tracked";
      return `${name} ${status} ${n * 5}`.toLowerCase().includes("01")
        ? Result.succeed(name)
        : Result.failVoid;
    });
    // Every painted name is a record the narrowed set still holds: the window
    // is a slice of the new set, not of the one it was measured against.
    expect(Arr.difference(painted, kept)).toEqual([]);
    // A 320px viewport holds nine rows of 36px. Before the clamp the core
    // clamped the stale offset to the new content's end and mounted five, so
    // half the table went blank until the next wheel.
    expect(painted.length).toBeGreaterThanOrEqual(Math.floor(320 / 36));
    // The window landed on the narrowed set's own end.
    expect(painted.at(-1)).toBe(Option.getOrUndefined(Arr.last(kept)));
  });

  it("sorts the whole set, not the mounted window", () => {
    const root = mount();

    // The header cell carries the sort control; the cell's own padding is
    // outside it, so the press lands on the button the header puts there.
    const size = boundsOf(root, "virtual-table-size-sort");
    root.renderer.nativeSimulateClick(size.x + 10, size.y + 10);
    settle(root);

    // Descending: the largest file is the first row of the sorted set, and it
    // is a record the unsorted top of the list never painted.
    expect(paintedRows(root)[0]).toBe(VIRTUAL_TABLE_ROWS - 1);
    expect(Str.includes("file-1000.ts")(allText(root))).toBe(true);
  });
});

describe("the row count", () => {
  /** A windowed table over a count the caller computed. */
  const counted = (count: number) => (
    <VirtualTable
      height={240}
      aria-label="Rows"
      count={count}
      rowHeight={30}
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
    // `count` is often computed — a page's length, a filtered total, a row
    // count a response has not answered — and `count === 0` read a `NaN` or a
    // negative as false, so the table mounted a windowed body over no rows: a
    // header above a blank body, with neither the empty message nor the
    // loading skeleton. A count that cannot be read is no rows, the state
    // `count={0}` already paints.
    const mounted = renderData(counted(Number.NaN));
    root = mounted;
    settle(mounted);
    expect(allText(mounted)).toContain("No rows");

    mounted.rerender(counted(-3));
    settle(mounted);
    expect(allText(mounted)).toContain("No rows");
  });

  it("mounts whole rows for a fractional count", () => {
    // A window cannot hold a fraction of a row: the runtime's item count and
    // the window's own arithmetic are given the same floored number, so two
    // and a half rows paint two and the list cannot run past the window.
    const mounted = renderData(counted(2.5));
    root = mounted;
    settle(mounted);
    expect(allText(mounted)).toContain("row-1");
    expect(allText(mounted)).not.toContain("row-2");
  });
});
