import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { afterEach, describe, expect, it } from "vitest";
import { darkTheme, dividerOn, pointerWash } from "@gpuixui/tokens";
import { TableExample } from "../../examples/table.example.js";
import { TableColumnDivider } from "../columns/divider.js";
import { decodeA11yTree, withRole } from "../internal/a11y.js";
import { requireStyle } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  SKELETON_TRACK_LIMIT,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  TableViewport,
} from "../table/table.js";

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

const paintedFiles = (root: DataTestRoot): ReadonlyArray<string> =>
  Arr.filter(root.renderer.getAllText(), Str.startsWith("file-"));

const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

const allText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

const readout = (root: DataTestRoot): string => allText(root);

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

  return Arr.reduce(Arr.range(1, count), Arr.empty<string>(), (stops) =>
    Arr.some(stops, Str.startsWith("files-row-"))
      ? stops
      : Arr.append(stops, tabOnce()),
  );
};

const rowsIn = (stops: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(stops, Str.startsWith("files-row-"));

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<TableExample />);

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

    expect(styleOf().backgroundColor).toBe(darkTheme.colors.selected);
    expect(styleOf().hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });

    expect(styleOf().active).toMatchObject({
      backgroundColor: pointerWash(darkTheme, "active", "accent"),
    });
  });

  it("answers a press on an unchosen row, not only the pointer's hover", () => {
    const root = mount();

    expect(requireStyle(root, "files-row-file-3").active).toMatchObject({
      backgroundColor:
        pointerWash(darkTheme, "active", "hover") ?? darkTheme.colors.active,
    });
  });

  it("derives the rule from the fill the row wears", () => {
    const root = mount();
    const styleOf = (testId: string): Record<string, unknown> =>
      requireStyle(root, testId);

    expect(styleOf("files-row-file-3").borderColor).toBe(
      dividerOn(darkTheme, darkTheme.colors.card),
    );

    click(root, "files-row-file-3");
    root.renderer.flush();
    expect(styleOf("files-row-file-3").borderColor).toBe(
      dividerOn(darkTheme, darkTheme.colors.selected),
    );

    const bounds = boundsOf(root, "files-row-file-3");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.flush();

    const accentRule = dividerOn(darkTheme, darkTheme.colors.accent);
    expect(styleOf("files-row-file-3").hover).toMatchObject({
      borderColor: accentRule,
    });
    expect(styleOf("files-row-file-3").hover).not.toMatchObject({
      borderColor: darkTheme.colors.border,
    });

    const pressFill =
      pointerWash(darkTheme, "active", "accent") ?? darkTheme.colors.active;
    expect(styleOf("files-row-file-3").active).toMatchObject({
      borderColor: dividerOn(darkTheme, pressFill),
    });

    expect(styleOf("files-row-file-2").hover).toMatchObject({
      borderColor: dividerOn(darkTheme, darkTheme.colors.hover),
    });
  });

  it("paints the box in the fill of the row it sits in", () => {
    const root = mount();

    expect(
      requireStyle(root, "files-select-file-3-target").backgroundColor,
    ).toBe(darkTheme.colors.card);

    click(root, "files-row-file-3");
    root.renderer.flush();

    expect(requireStyle(root, "files-row-file-3").backgroundColor).toBe(
      darkTheme.colors.selected,
    );

    expect(
      requireStyle(root, "files-select-file-3-target").backgroundColor,
    ).toBe(darkTheme.colors.selected);

    expect(requireStyle(root, "files-select-all-target").backgroundColor).toBe(
      darkTheme.colors.card,
    );

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

  it("adds a Shift press as the tie-break, and flips it in place", () => {
    const root = mount();

    click(root, "files-status-sort");
    root.renderer.flush();
    expect(readout(root)).toContain("status-asc");
    expect(paintedFiles(root)[0]).toBe("file-001.ts");

    click(root, "files-name-sort", "shift");
    root.renderer.flush();
    expect(readout(root)).toContain("status-asc+name-asc");
    expect(paintedFiles(root)[0]).toBe("file-001.ts");

    click(root, "files-name-sort", "shift");
    root.renderer.flush();
    expect(readout(root)).toContain("status-asc+name-desc");
    expect(paintedFiles(root)[0]).toBe("file-058.ts");

    click(root, "files-size-sort");
    root.renderer.flush();
    expect(readout(root)).toContain("size-desc");
    expect(readout(root)).not.toContain("+");
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

    const before = tabStops(root, "files-filter", 16);
    expect(rowsIn(before)).toEqual(["files-row-file-1"]);

    click(root, "files-row-file-3");
    root.renderer.flush();

    expect(rowsIn(tabStops(root, "files-filter", 16))).toEqual([
      "files-row-file-3",
    ]);

    root.renderer.nativeSimulateKeystrokes(findId(root, "files-filter"), "060");
    root.renderer.flush();
    expect(readout(root)).toContain("1 rows · 0 selected");

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

const announcedWidth = (root: DataTestRoot, testId: string): string =>
  `${root.renderer.getElement(findId(root, testId))?.customProps?.["aria-valuetext"] ?? ""}`;

const checkboxWord = (root: DataTestRoot, testId: string): string =>
  `${root.renderer.getElement(findId(root, testId))?.customProps?.["aria-valuetext"] ?? ""}`;

const drag = (root: DataTestRoot, testId: string, deltaX: number): void => {
  const { x, y, width, height } = boundsOf(root, testId);
  const startX = x + width / 2;
  const startY = y + height / 2;
  root.renderer.nativeSimulateMouseDown(startX, startY);
  root.renderer.flush();
  Arr.forEach(Arr.range(1, 8), (step) => {
    root.renderer.nativeSimulateMouseMove(
      startX + (deltaX * step) / 8,
      startY,
      0,
    );
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

  it("steps from the width it announces, not the width it was handed", () => {
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
          width={700}
          minWidth={80}
          maxWidth={640}
          onResize={(width) => received.push(width)}
          label="Resize the test column"
          testId="divider-wide"
        />
        <TableColumnDivider
          width={40}
          minWidth={80}
          maxWidth={640}
          onResize={(width) => received.push(width)}
          label="Resize the test column"
          testId="divider-narrow"
        />
      </div>,
    );
    settle(root);

    expect(announcedWidth(root, "divider-wide")).toBe("640 pixels");
    const wide = findId(root, "divider-wide");
    root.renderer.nativeSimulateKeyDown(wide, "left");
    root.renderer.nativeSimulateKeyUp(wide, "left");
    root.renderer.flush();
    expect(received.at(-1)).toBe(624);

    expect(announcedWidth(root, "divider-narrow")).toBe("80 pixels");
    const narrow = findId(root, "divider-narrow");
    root.renderer.nativeSimulateKeyDown(narrow, "right");
    root.renderer.nativeSimulateKeyUp(narrow, "right");
    root.renderer.flush();
    expect(received.at(-1)).toBe(96);
  });

  it("announces the floor for a track the grid cannot measure", () => {
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
          width={Number.NaN}
          onResize={() => {}}
          label="Resize the test column"
          testId="divider"
        />
      </div>,
    );
    settle(root);

    expect(announcedWidth(root, "divider")).toBe("80 pixels");
  });

  it("drags from the floor when the track cannot be measured", () => {
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
          width={Number.NaN}
          onResize={(width) => received.push(width)}
          label="Resize the test column"
          testId="divider"
        />
      </div>,
    );
    settle(root);

    drag(root, "divider", 40);
    expect(received.at(-1)).toBe(120);
  });

  it("refuses a press that is not the primary button", () => {
    const root = mount();
    const { x, y, width, height } = boundsOf(root, "files-divider-name");
    const startX = x + width / 2;
    const startY = y + height / 2;
    expect(readout(root)).toContain("w=260");

    Arr.forEach([1, 2], (button) => {
      root.renderer.nativeSimulateMouseDown(startX, startY, button);
      root.renderer.flush();

      root.renderer.nativeSimulateMouseMove(startX + 2, startY, 0);
      root.renderer.flush();
      root.renderer.nativeSimulateMouseUp(startX + 2, startY, button);
      root.renderer.flush();
      expect(readout(root)).toContain("w=260");
    });
  });

  it("ends a gesture whose release the window never heard", () => {
    const root = mount();
    const { x, y, width, height } = boundsOf(root, "files-divider-name");
    const startX = x + width / 2;
    const startY = y + height / 2;
    expect(readout(root)).toContain("w=260");

    root.renderer.nativeSimulateMouseDown(startX, startY);
    root.renderer.flush();
    root.renderer.nativeSimulateMouseMove(startX + 2, startY, 0);
    root.renderer.flush();
    expect(readout(root)).toContain("w=262");

    root.renderer.nativeSimulateMouseExit(startX + 2, startY);
    root.renderer.flush();
    root.renderer.nativeSimulateMouseMove(startX + 4, startY);
    root.renderer.flush();
    expect(readout(root)).toContain("w=262");

    root.renderer.nativeSimulateMouseDown(startX + 4, startY);
    root.renderer.flush();
    root.renderer.nativeSimulateMouseMove(startX + 10, startY, 0);
    root.renderer.flush();
    expect(readout(root)).toContain("w=268");
  });

  it("widens the column a drag ends, and keeps the cells on the new track", () => {
    const root = mount();
    expect(readout(root)).toContain("w=260");

    drag(root, "files-divider-name", 60);

    expect(readout(root)).toContain("w=320");
    expect(boundsOf(root, "files-name").width).toBe(320);

    expect(boundsOf(root, "files-cell-file-1-name").width).toBe(320);
    expect(announcedWidth(root, "files-divider-name")).toBe("320 pixels");

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

    expect(readout(root)).toContain("content=350");
    expect(boundsOf(root, "files-size").x).toBe(sizeBefore.x - 110);
    expect(boundsOf(root, "files-name").x).toBe(nameBefore.x);

    click(root, "files-columns-toggle-status");
    root.renderer.flush();
    expect(readout(root)).toContain("cols=name,status,size");
    expect(readout(root)).toContain("content=460");
    expect(boundsOf(root, "files-size").x).toBe(sizeBefore.x);
  });

  it("keeps a hidden column's text out of the search", () => {
    const root = mount();
    root.renderer.nativeSimulateKeystrokes(
      findId(root, "files-filter"),
      "modified",
    );
    root.renderer.flush();

    expect(readout(root)).toContain("20 rows");

    click(root, "files-columns");
    root.renderer.flush();
    click(root, "files-columns-toggle-status");
    root.renderer.flush();

    expect(readout(root)).toContain("0 rows");
    expect(paintedFiles(root)).toEqual([]);

    click(root, "files-columns-toggle-status");
    root.renderer.flush();
    expect(readout(root)).toContain("20 rows");
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

    expect(readout(root)).toContain("cols=name,size,status");
    expect(readout(root)).toContain("content=460");
    const nameWidth = boundsOf(root, "files-name").width;
    expect(boundsOf(root, "files-size").x).toBe(nameBefore.x + nameWidth);

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

describe("the loading skeleton", () => {
  const skeleton = (rows: number, columns: number) => (
    <div>
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );

  it("mounts a count it can lay out, and a default for one it cannot", () => {
    const countRoles = (role: string): number => {
      const tree = decodeA11yTree(root?.renderer.getA11yTree());
      return withRole(tree, tree.root, role).length;
    };

    root = renderData(skeleton(Number.POSITIVE_INFINITY, Number.NaN));
    settle(root);

    expect(countRoles("Row")).toBe(3);
    expect(countRoles("Cell")).toBe(9);

    root.rerender(skeleton(10_000, 1));
    settle(root);
    expect(countRoles("Row")).toBe(SKELETON_TRACK_LIMIT);
    expect(countRoles("Cell")).toBe(SKELETON_TRACK_LIMIT);

    root.rerender(skeleton(0, -4));
    settle(root);
    expect(countRoles("Row")).toBe(1);
    expect(countRoles("Cell")).toBe(1);
  });
});

describe("the cell track", () => {
  const withTrack = (width: number) => (
    <Table height={200} aria-label="Files">
      <TableViewport>
        <TableHeader>
          <TableRow>
            <TableHeaderCell width={width} testId="track-header">
              Name
            </TableHeaderCell>
            <TableHeaderCell testId="track-header-status">
              Status
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell width={width} testId="track-cell">
              a-much-longer-file-name.ts
            </TableCell>
            <TableCell testId="track-cell-status">tracked</TableCell>
          </TableRow>
        </TableBody>
      </TableViewport>
    </Table>
  );

  it("keeps a width that cannot paint on the column's one track", () => {
    const unreadable = [Number.NaN, Number.POSITIVE_INFINITY, -20];
    root = renderData(withTrack(Number.NaN));
    settle(root);
    for (const width of unreadable) {
      root.rerender(withTrack(width));
      settle(root);
      const header = boundsOf(root, "track-header");
      const cell = boundsOf(root, "track-cell");
      expect(header.width).toBe(cell.width);
      expect(header.x).toBe(cell.x);
      expect(cell.width).toBeGreaterThan(0);

      expect(boundsOf(root, "track-header-status").x).toBe(
        boundsOf(root, "track-cell-status").x,
      );
    }
  });

  it("keeps the width a caller can paint", () => {
    root = renderData(withTrack(160));
    settle(root);
    expect(boundsOf(root, "track-header").width).toBe(160);
    expect(boundsOf(root, "track-cell").width).toBe(160);
    expect(boundsOf(root, "track-header").x).toBe(
      boundsOf(root, "track-cell").x,
    );
  });
});
