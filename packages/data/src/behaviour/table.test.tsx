/**
 * The table in the real GPUix renderer, mounted through the shipped example.
 *
 * The bugs these guard are the ones the window probes found and a pure reducer
 * cannot see:
 *
 * - a header inside the row scroller (it must keep its painted `y` when the
 *   rows wheel under it — the runtime has no sticky);
 * - a plain press that does not paint the selection wash;
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
import { darkTheme } from "@gpuixui/tokens";
import { TableExample } from "../../examples/table.example.js";
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
