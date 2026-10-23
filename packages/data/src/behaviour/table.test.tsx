/**
 * The table in the real GPUix renderer, mounted through the shipped example.
 *
 * The bugs these guard are the ones the window probes found and a pure reducer
 * cannot see:
 *
 * - a header inside the row scroller (it must keep its painted `y` when the
 *   rows wheel under it — the runtime has no sticky);
 * - a plain press that does not paint the selection wash;
 * - a selection box's painted target fixed to the card fill, so it reads as a
 *   notch inside a chosen row;
 * - a Cmd press that replaces instead of toggling, or a Shift press that does
 *   not extend from the anchor;
 * - a sort that changes a label but not the painted order;
 * - a filter that narrows the rows but leaves a selection it no longer paints
 *   (the readout must fall to zero);
 * - an arrow key that moves the selection without moving native focus, so the
 *   next key goes to the old row.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { afterEach, describe, expect, it } from "vitest";
import { darkTheme, pointerWash } from "@gpuixui/tokens";
import { TableExample } from "../../examples/table.example.js";
import { TableColumnDivider } from "../columns/divider.js";
import { requireStyle } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const findId = (root: DataTestRoot, testId: string): number => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`no element with testId ${testId}`);
  return element.id;
};

const boundsOf = (root: DataTestRoot, testId: string): Bounds => {
  const bounds = root.renderer.getElementBounds(findId(root, testId));
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

const click = (
  root: DataTestRoot,
  testId: string,
  modifiers?: string,
): void => {
  const { x, y, width, height } = boundsOf(root, testId);
  root.renderer.nativeSimulateClick(
    x + width / 2,
    y + height / 2,
    0,
    modifiers,
  );
};

/** The file names in paint order, without the header's labels. */
const paintedFiles = (root: DataTestRoot): ReadonlyArray<string> =>
  Arr.filter(root.renderer.getAllText(), Str.startsWith("file-"));

const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

const allText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

/** The readout's words. The runtime reports a `<text>`'s run through `getAllText`. */
const readout = (root: DataTestRoot): string => allText(root);

/**
 * The elements that hold focus as Tab walks off `testId`, at most `count`.
 *
 * `focusNext` is the renderer's own traversal, so this reads the Tab order the
 * runtime builds rather than a `tabIndex` prop a suite could only guess at.
 */
const tabStops = (
  root: DataTestRoot,
  testId: string,
  count: number,
): ReadonlyArray<string> => {
  root.renderer.focusElement(findId(root, testId));
  root.renderer.flush();
  const tabOnce = (): string => {
    root.renderer.focusNext();
    root.renderer.flush();
    return Option.getOrElse(focusedTestId(root), () => "none");
  };
  // Stops at the first row: the assertion is where a row appears in the order,
  // and every stop after it is a control the row holds.
  return Arr.reduce(Arr.range(1, count), Arr.empty<string>(), (stops) =>
    Arr.some(stops, Str.startsWith("files-row-"))
      ? stops
      : Arr.append(stops, tabOnce()),
  );
};

/** The rows in a Tab walk, without the per-row controls they hold. */
const rowsIn = (stops: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(stops, Str.startsWith("files-row-"));

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<TableExample />);
  // The body learns its height from the viewport's and header's `onLayout`
  // events; a suite that wheels before they are dispatched measures the
  // unmeasured frame.
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the example table", () => {
  it("keeps the header painted while the rows wheel under it", () => {
    const root = mount();

    const headerBefore = boundsOf(root, "files-name");
    const firstRow = boundsOf(root, "files-row-file-1");
    expect(headerBefore.y).toBeLessThan(firstRow.y);

    root.renderer.nativeSimulateScrollWheel(
      firstRow.x + 20,
      firstRow.y + 20,
      0,
      -600,
    );
    root.renderer.flush();

    const bodyId = findId(root, "files-body");
    expect(root.renderer.getScrollOffset(bodyId)?.[1]).toBeLessThan(0);
    expect(boundsOf(root, "files-name").y).toBe(headerBefore.y);
  });

  it("chooses the row a press lands on, and paints its wash", () => {
    const root = mount();

    click(root, "files-row-file-3");
    root.renderer.flush();

    expect(
      root.renderer.findByTestId("files-row-file-3")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
    expect(readout(root)).toContain("1 selected");
  });

  it("moves a chosen row under the pointer, so it answers the pointer", () => {
    const root = mount();

    click(root, "files-row-file-3");
    root.renderer.flush();

    const bounds = boundsOf(root, "files-row-file-3");
    const styleOf = (): Record<string, unknown> =>
      requireStyle(root, "files-row-file-3");

    expect(styleOf().backgroundColor).toBe(darkTheme.colors.selected);

    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.flush();

    // The chosen row keeps saying which record is chosen, and the pointer moves
    // it one step off that fill: one flat fill wherever the pointer is would
    // answer nothing. The runtime resolves a state diff into its own record, so
    // the assertion is on the fields that matter.
    expect(styleOf().backgroundColor).toBe(darkTheme.colors.selected);
    expect(styleOf().hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });
    // The press takes the derived wash over the hover it replaces, not the raw
    // `active` role — a palette's own role can sit under the perceptibility
    // floor beside the `accent` it would paint over.
    expect(styleOf().active).toMatchObject({
      backgroundColor: pointerWash(darkTheme, "active", "accent"),
    });
  });

  it("paints the box in the fill of the row it sits in", () => {
    const root = mount();

    // At rest the box's target is the table's own card fill, so it is invisible.
    expect(
      requireStyle(root, "files-select-file-3-target").backgroundColor,
    ).toBe(darkTheme.colors.card);

    click(root, "files-row-file-3");
    root.renderer.flush();

    expect(requireStyle(root, "files-row-file-3").backgroundColor).toBe(
      darkTheme.colors.selected,
    );
    // The target is a painted child (that is what stops a box press reaching
    // the row), so it has to follow the row's own fill: a target fixed to
    // `card` reads as a card-coloured notch inside a chosen row.
    expect(
      requireStyle(root, "files-select-file-3-target").backgroundColor,
    ).toBe(darkTheme.colors.selected);
    // The header box sits on the card strip, not on a row, so it keeps it.
    expect(requireStyle(root, "files-select-all-target").backgroundColor).toBe(
      darkTheme.colors.card,
    );

    // Under the pointer it takes the same wash the chosen row takes.
    const target = boundsOf(root, "files-select-file-3-target");
    root.renderer.nativeSimulateMouseMove(target.x + 2, target.y + 2);
    root.renderer.flush();
    expect(
      requireStyle(root, "files-select-file-3-target").hover,
    ).toMatchObject({ backgroundColor: darkTheme.colors.accent });
  });

  it("lets a press on an unfilled part of a cell reach its row", () => {
    const root = mount();
    const cell = boundsOf(root, "files-cell-file-2-name");

    // The cell's content is a short label, so the right edge is blank: a cell
    // that paints a fill would stop the press here (the measured rule), which
    // is why `TableCell` has no background.
    root.renderer.nativeSimulateClick(
      cell.x + cell.width - 4,
      cell.y + cell.height / 2,
    );
    root.renderer.flush();

    expect(
      root.renderer.findByTestId("files-row-file-2")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
    expect(readout(root)).toContain("1 selected");
  });

  it("toggles a record from its box without replacing the set a row press made", () => {
    const root = mount();

    click(root, "files-row-file-2");
    click(root, "files-select-file-5");
    root.renderer.flush();

    // The box paints a fill, so GPUI's hit test stops there
    // (`press-routing-lifecycle`): the box toggles its record and the row it
    // sits in does not also run its press, which would replace the set.
    expect(
      root.renderer.findByTestId("files-row-file-2")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
    expect(readout(root)).toContain("2 selected");
    expect(checkboxWord(root, "files-select-file-5")).toBe("checked");
  });

  it("chooses every painted row from the header box and clears it on the next press", () => {
    const root = mount();

    click(root, "files-select-all");
    root.renderer.flush();
    expect(readout(root)).toContain("60 selected");
    expect(checkboxWord(root, "files-select-all")).toBe("checked");

    click(root, "files-select-all");
    root.renderer.flush();
    expect(readout(root)).toContain("0 selected");
    expect(checkboxWord(root, "files-select-all")).toBe("unchecked");
  });

  it("paints a partial set as mixed on the header box", () => {
    const root = mount();

    click(root, "files-row-file-2");
    root.renderer.flush();

    expect(checkboxWord(root, "files-select-all")).toBe("mixed");
  });

  it("toggles with the command chord and extends with shift", () => {
    const root = mount();

    click(root, "files-row-file-2");
    click(root, "files-row-file-4", "cmd");
    root.renderer.flush();
    expect(readout(root)).toContain("2 selected");

    click(root, "files-row-file-6", "shift");
    root.renderer.flush();
    // file-2 survives, and the range runs from the toggled anchor (4) to 6.
    expect(readout(root)).toContain("4 selected");
  });

  it("sorts the painted order, and flips it on a second press", () => {
    const root = mount();

    expect(paintedFiles(root)[0]).toBe("file-001.ts");

    click(root, "files-name-sort");
    root.renderer.flush();
    expect(paintedFiles(root)[0]).toBe("file-001.ts");

    click(root, "files-name-sort");
    root.renderer.flush();
    expect(paintedFiles(root)[0]).toBe("file-060.ts");
  });

  it("narrows the rows and releases a selection the set hides", () => {
    const root = mount();

    click(root, "files-row-file-3");
    root.renderer.flush();
    expect(readout(root)).toContain("1 selected");

    root.renderer.nativeSimulateKeystrokes(findId(root, "files-filter"), "060");
    root.renderer.flush();

    expect(paintedFiles(root)).toEqual(["file-060.ts"]);
    expect(readout(root)).toContain("1 rows · 0 selected");
  });

  it("walks the rows with the arrow keys and moves native focus with them", () => {
    const root = mount();

    click(root, "files-row-file-1");
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("files-row-file-1"));

    root.renderer.nativeSimulateKeyDown(
      findId(root, "files-row-file-1"),
      "down",
    );
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("files-row-file-2"));
    root.renderer.nativeSimulateKeyUp(findId(root, "files-row-file-2"), "down");
    root.renderer.flush();
    expect(
      root.renderer.findByTestId("files-row-file-2")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
    expect(focusedTestId(root)).toEqual(Option.some("files-row-file-2"));

    expect(readout(root)).toContain("1 selected");
  });

  it("chooses the row a keyboard reader is standing on with Space or Enter", () => {
    const root = mount();
    const row = findId(root, "files-row-file-2");

    // The grid's stop is a row, so the keys a stop implies act on that row. A
    // focusable `div` has no activation of its own: without a key handler the
    // arrow walk would move the selection off the row the reader entered on and
    // leave that row the one record the keyboard cannot choose.
    root.renderer.focusElement(row);
    root.renderer.flush();
    root.renderer.nativeSimulateKeyDown(row, "space");
    root.renderer.flush();

    expect(readout(root)).toContain("1 selected");
    expect(requireStyle(root, "files-row-file-2").backgroundColor).toBe(
      darkTheme.colors.selected,
    );

    click(root, "files-clear");
    root.renderer.flush();
    expect(readout(root)).toContain("0 selected");

    root.renderer.focusElement(row);
    root.renderer.flush();
    root.renderer.nativeSimulateKeyDown(row, "enter");
    root.renderer.flush();
    expect(readout(root)).toContain("1 selected");
    expect(requireStyle(root, "files-row-file-2").backgroundColor).toBe(
      darkTheme.colors.selected,
    );
  });

  it("keeps one row in the Tab order, before a press and after a filter releases the chosen one", () => {
    const root = mount();

    // A fresh grid holds no selection, so a tab stop that waited for a press
    // would leave the rows out of the Tab order: a keyboard reader tabbing off
    // the toolbar lands on the column menu and the header controls, then walks
    // the per-row boxes, and never reaches a row the arrow keys move.
    const before = tabStops(root, "files-filter", 16);
    expect(rowsIn(before)).toEqual(["files-row-file-1"]);

    click(root, "files-row-file-3");
    root.renderer.flush();
    // The chosen record owns the stop until the filter hides it.
    expect(rowsIn(tabStops(root, "files-filter", 16))).toEqual([
      "files-row-file-3",
    ]);

    root.renderer.nativeSimulateKeystrokes(findId(root, "files-filter"), "060");
    root.renderer.flush();
    expect(readout(root)).toContain("1 rows · 0 selected");

    // The release takes the old stop with it, so the stop moves to the first
    // painted row rather than leaving the table unreachable.
    const after = tabStops(root, "files-filter", 16);
    expect(rowsIn(after)).toEqual(["files-row-file-60"]);
  });

  it("paints the empty state when nothing matches", () => {
    const root = mount();

    root.renderer.nativeSimulateKeystrokes(
      findId(root, "files-filter"),
      "zzzz",
    );
    root.renderer.flush();

    expect(paintedFiles(root)).toEqual([]);
    expect(allText(root)).toContain("No file matches");
  });
});

/** The width a divider announces through the only channel 0.11.0 publishes. */
const announcedWidth = (root: DataTestRoot, testId: string): string =>
  `${root.renderer.getElement(findId(root, testId))?.customProps?.["aria-valuetext"] ?? ""}`;

/** A checkbox's state: 0.11.0 has no `aria-checked`, so it is `aria-valuetext`. */
const checkboxWord = (root: DataTestRoot, testId: string): string =>
  `${root.renderer.getElement(findId(root, testId))?.customProps?.["aria-valuetext"] ?? ""}`;

/**
 * Drag `testId` by `deltaX`, delivered as eight moves.
 *
 * One jump would prove nothing about the press-arms-the-capture rule; eight
 * moves is the number every pointer probe in this repository uses.
 */
const drag = (root: DataTestRoot, testId: string, deltaX: number): void => {
  const { x, y, width, height } = boundsOf(root, testId);
  const startX = x + width / 2;
  const startY = y + height / 2;
  root.renderer.nativeSimulateMouseDown(startX, startY);
  root.renderer.flush();
  Arr.forEach(Arr.range(1, 8), (step) => {
    root.renderer.nativeSimulateMouseMove(startX + (deltaX * step) / 8, startY);
    root.renderer.flush();
  });
  root.renderer.nativeSimulateMouseUp(startX + deltaX, startY);
  root.renderer.flush();
};

describe("resizable columns", () => {
  it("clamps every width it hands out, whatever the consumer does", () => {
    const received: number[] = [];
    root = renderData(
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          width: 400,
          height: 40,
        }}
      >
        <TableColumnDivider
          width={100}
          minWidth={80}
          maxWidth={120}
          onResize={(width) => received.push(width)}
          label="Resize the test column"
          testId="divider"
        />
      </div>,
    );
    settle(root);

    drag(root, "divider", 600);
    expect(received.at(-1)).toBe(120);

    drag(root, "divider", -600);
    expect(received.at(-1)).toBe(80);

    const divider = findId(root, "divider");
    root.renderer.nativeSimulateKeyDown(divider, "end");
    root.renderer.nativeSimulateKeyUp(divider, "end");
    root.renderer.flush();
    expect(received.at(-1)).toBe(120);
    expect(received.every((width) => width >= 80 && width <= 120)).toBe(true);
  });

  it("widens the column a drag ends, and keeps the cells on the new track", () => {
    const root = mount();
    expect(readout(root)).toContain("w=260");

    drag(root, "files-divider-name", 60);

    expect(readout(root)).toContain("w=320");
    expect(boundsOf(root, "files-name").width).toBe(320);
    // The header and the body cells share one width: a width the cells do not
    // read is a grid that drifts row by row.
    expect(boundsOf(root, "files-cell-file-1-name").width).toBe(320);
    expect(announcedWidth(root, "files-divider-name")).toBe("320 pixels");

    // A second gesture measures from the width the first one ended at.
    drag(root, "files-divider-name", 30);
    expect(readout(root)).toContain("w=350");
  });

  it("clamps the drag at the column's own minimum and maximum", () => {
    const root = mount();

    drag(root, "files-divider-name", -600);
    expect(readout(root)).toContain("w=120");
    expect(boundsOf(root, "files-cell-file-1-name").width).toBe(120);

    drag(root, "files-divider-name", 1_000);
    expect(readout(root)).toContain("w=420");
    expect(boundsOf(root, "files-cell-file-1-name").width).toBe(420);
  });

  it("steps a focused divider from the keyboard and announces the width", () => {
    const root = mount();
    const divider = findId(root, "files-divider-name");

    root.renderer.nativeSimulateKeyDown(divider, "home");
    root.renderer.nativeSimulateKeyUp(divider, "home");
    root.renderer.flush();
    expect(readout(root)).toContain("w=120");
    expect(announcedWidth(root, "files-divider-name")).toBe("120 pixels");

    root.renderer.nativeSimulateKeyDown(divider, "right");
    root.renderer.nativeSimulateKeyUp(divider, "right");
    root.renderer.flush();
    expect(readout(root)).toContain("w=136");

    root.renderer.nativeSimulateKeyDown(divider, "end");
    root.renderer.nativeSimulateKeyUp(divider, "end");
    root.renderer.flush();
    expect(readout(root)).toContain("w=420");
  });
});

describe("the column menu", () => {
  it("hides a column, taking its width out and shifting every later column", () => {
    const root = mount();
    const nameBefore = boundsOf(root, "files-name");
    const sizeBefore = boundsOf(root, "files-size");
    expect(readout(root)).toContain("content=460");

    click(root, "files-columns");
    root.renderer.flush();
    click(root, "files-columns-toggle-status");
    root.renderer.flush();

    expect(root.renderer.findByTestId("files-status")).toBeUndefined();
    expect(allText(root)).not.toContain("modified");
    expect(readout(root)).toContain("cols=name,size");
    // 460 - 110: the hidden track's width leaves the content, and the size
    // column starts exactly 110 points further left.
    expect(readout(root)).toContain("content=350");
    expect(boundsOf(root, "files-size").x).toBe(sizeBefore.x - 110);
    expect(boundsOf(root, "files-name").x).toBe(nameBefore.x);

    // Restoring the column returns it at the width it had, in its place.
    click(root, "files-columns-toggle-status");
    root.renderer.flush();
    expect(readout(root)).toContain("cols=name,status,size");
    expect(readout(root)).toContain("content=460");
    expect(boundsOf(root, "files-size").x).toBe(sizeBefore.x);
  });

  it("moves a column through the order without changing a width", () => {
    const root = mount();
    const nameBefore = boundsOf(root, "files-name");

    click(root, "files-columns");
    root.renderer.flush();
    click(root, "files-columns-move-size");
    root.renderer.flush();
    click(root, "files-columns-move-size-left");
    root.renderer.flush();

    // One step swaps size with its visible neighbour (status).
    expect(readout(root)).toContain("cols=name,size,status");
    expect(readout(root)).toContain("content=460");
    const nameWidth = boundsOf(root, "files-name").width;
    expect(boundsOf(root, "files-size").x).toBe(nameBefore.x + nameWidth);

    // A second step reaches the front; the cells follow the header.
    click(root, "files-columns");
    root.renderer.flush();
    click(root, "files-columns-move-size");
    root.renderer.flush();
    click(root, "files-columns-move-size-left");
    root.renderer.flush();

    expect(readout(root)).toContain("cols=size,name,status");
    expect(readout(root)).toContain("content=460");
    expect(boundsOf(root, "files-size").x).toBe(nameBefore.x);
    expect(boundsOf(root, "files-cell-file-1-size").x).toBe(nameBefore.x);
  });
});
