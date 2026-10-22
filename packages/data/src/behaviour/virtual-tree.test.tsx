/**
 * The windowed tree in the real GPUix renderer, mounted through the shipped
 * example.
 *
 * The bugs these guard are the ones a plausible tree with a window can hide:
 *
 * - every row retained while the component claims to be windowed, so the first
 *   screen looks right and the frame carries four thousand rows;
 * - a cursor move to a row the window never mounted, so the focus effect finds
 *   no element and the next key goes nowhere;
 * - a reveal that scrolls before the window moves (the runtime cannot build a
 *   row outside the window it was given);
 * - a wheel that unmounts the focused row and leaves the tree with no tab stop;
 * - an expand that moves the window instead of painting the children in place.
 *
 * The assertions read `getPaintedText` for what reached the frame and
 * `getAllText` for what React retained: in `itemCount` mode the two agree on the
 * window, and a row outside it must appear in neither.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { afterEach, describe, expect, it } from "vitest";
import {
  VIRTUAL_TREE_DIRS,
  VIRTUAL_TREE_FILES,
  VIRTUAL_TREE_REVEAL,
  VirtualTreeExample,
} from "../../examples/virtual-tree.example.js";
import {
  after,
  clickCentreOf,
  focusedTestId,
  pressKey,
  requireBounds,
  waitFor,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

/** Every directory label that reached the frame, in paint order. */
const paintedDirs = (root: DataTestRoot): ReadonlyArray<string> =>
  Arr.filterMap(root.renderer.getPaintedText(), (line) =>
    /^dir \d{3}$/.test(line) ? Result.succeed(line) : Result.failVoid,
  );

const allText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

const readout = (root: DataTestRoot): string =>
  Arr.join(
    Arr.filter(root.renderer.getAllText(), (line) =>
      line.includes("rows · active="),
    ),
    " ",
  );

/** The active key the readout prints. */
const activeKey = (root: DataTestRoot): string => {
  const match = /active=(\S+)/.exec(readout(root));
  if (match?.[1] === undefined)
    throw new Error(`behaviour: no active key in "${readout(root)}"`);
  return match[1];
};

/** Wheel over the painted rows, inside the list the window belongs to. */
const wheel = (root: DataTestRoot, deltaY: number): void => {
  const row = requireBounds(root, `virtual-tree-row-${activeKey(root)}`);
  root.renderer.nativeSimulateScrollWheel(row.x + 20, row.y + 4, 0, deltaY);
  root.renderer.flush();
};

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<VirtualTreeExample />);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the windowed tree", () => {
  it("retains and paints a window of the forty collapsed rows", () => {
    const root = mount();

    expect(readout(root)).toContain(`${VIRTUAL_TREE_DIRS} rows`);
    expect(paintedDirs(root)[0]).toBe("dir 000");
    // The last directory is data, not a rendered child: a children-mode list
    // retains every row and only skips its paint, so `getAllText` would still
    // hold it while this one does not.
    expect(paintedDirs(root)).not.toContain("dir 039");
    expect(allText(root)).not.toContain("dir 039");
    expect(paintedDirs(root).length).toBeLessThan(VIRTUAL_TREE_DIRS);
  });

  it("mounts a window of four thousand rows, not the set", () => {
    const root = mount();

    clickCentreOf(root, "virtual-tree-expand");
    settle(root);

    expect(readout(root)).toContain(
      `${VIRTUAL_TREE_DIRS * (VIRTUAL_TREE_FILES + 1)} rows`,
    );
    // The set is four thousand rows; the tree holds the window around the
    // viewport, and the far row is in neither the frame nor React's tree.
    expect(paintedDirs(root).length).toBeLessThan(30);
    expect(allText(root)).not.toContain("file 039/098");
  });

  it("moves the window to the row End names, then focuses it", () => {
    const root = mount();
    clickCentreOf(root, "virtual-tree-expand");
    settle(root);

    pressKey(root, "virtual-tree-row-dir-000", "end");
    settle(root);

    // The window moved to the last row, which the first window never mounted…
    expect(allText(root)).toContain("file 039/098");
    expect(allText(root)).not.toContain("dir 000");
    // …and the focus followed it. A tree that focused before moving the window
    // found no element and left the key on the row the reader left.
    expect(focusedTestId(root)).toEqual(
      Option.some("virtual-tree-row-dir-039/file-098"),
    );
    expect(activeKey(root)).toBe("dir-039/file-098");
  });

  it("reveals the directory a caller names, and takes the focus after the press", async () => {
    const root = mount();

    clickCentreOf(root, "virtual-tree-reveal");
    settle(root);

    expect(readout(root)).toContain("active=dir-030");
    expect(allText(root)).toContain("dir 030");
    expect(allText(root)).not.toContain("dir 000");

    // A window hands the press's focus to the control it landed on after the
    // commit; the caller-driven move re-takes the row on the next tick.
    await after(5);
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(
      Option.some(`virtual-tree-row-${VIRTUAL_TREE_REVEAL}`),
    );
  });

  it("keeps a mounted tab stop when a wheel takes the cursor's row away", async () => {
    const root = mount();

    // Walk the cursor two rows down, so the tree holds the focus.
    pressKey(root, "virtual-tree-row-dir-000", "down");
    pressKey(root, "virtual-tree-row-dir-001", "down");
    root.renderer.flush();
    expect(activeKey(root)).toBe("dir-002");

    wheel(root, -600);
    settle(root);

    // The runtime unmounted the focused row. The cursor moved to the row at the
    // window's top, and the focus followed because the tree had it.
    const active = activeKey(root);
    expect(active).not.toBe("dir-002");
    await waitFor(() =>
      expect(focusedTestId(root)).toEqual(
        Option.some(`virtual-tree-row-${active}`),
      ),
    );
    expect(paintedDirs(root)).toContain(`dir ${active.replace("dir-", "")}`);
  });

  it("opens a branch in place without moving the window", () => {
    const root = mount();

    pressKey(root, "virtual-tree-row-dir-000", "right");
    settle(root);

    expect(readout(root)).toContain(
      `${VIRTUAL_TREE_DIRS + VIRTUAL_TREE_FILES} rows`,
    );
    expect(allText(root)).toContain("file 000/000");
    expect(activeKey(root)).toBe("dir-000");
    expect(focusedTestId(root)).toEqual(
      Option.some("virtual-tree-row-dir-000"),
    );
  });

  it("keeps a live tab stop when a collapse hides the cursor's row", () => {
    const root = mount();

    clickCentreOf(root, "virtual-tree-reveal");
    settle(root);
    expect(allText(root)).toContain("dir 030");

    // Step into the first file, so the collapse hides the cursor's row.
    pressKey(root, "virtual-tree-row-dir-030", "right");
    settle(root);
    expect(activeKey(root)).toBe("dir-030/file-000");

    clickCentreOf(root, "virtual-tree-collapse");
    settle(root);

    expect(readout(root)).toContain(`${VIRTUAL_TREE_DIRS} rows`);
    // The cursor's row left the set. Rather than jump the reader's scroll to
    // the top, the cursor moves to the row at the window's top — a row that is
    // mounted, so the one tab stop is live.
    expect(activeKey(root)).toBe("dir-030");
    expect(paintedDirs(root)).toContain("dir 030");
    pressKey(root, "virtual-tree-row-dir-030", "down");
    root.renderer.flush();
    expect(activeKey(root)).toBe("dir-031");
    expect(focusedTestId(root)).toEqual(
      Option.some("virtual-tree-row-dir-031"),
    );
  });
});
