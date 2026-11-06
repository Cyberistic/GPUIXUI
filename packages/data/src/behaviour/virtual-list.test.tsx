import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { afterEach, describe, expect, it } from "vitest";
import {
  VirtualListExample,
  REVEAL_ROW,
} from "../../examples/virtual-list.example.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

const paintedRows = (root: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(root.renderer.getPaintedText(), (line) => {
    const index = /^Row (\d+)$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index));
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

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<VirtualListExample />);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the virtualized list", () => {
  it("paints only a window of the rows it declares", () => {
    const root = mount();

    const rows = paintedRows(root);
    expect(rows).toContain(0);

    expect(rows).not.toContain(1999);
    expect(rows.length).toBeLessThan(60);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("honours the definite height it was given", () => {
    const root = mount();

    expect(
      root.renderer.getElement(findId(root, "virtual-list"))?.style.height,
    ).toBe(320);

    const first = boundsOf(root, "virtual-row-0");
    const last = paintedRows(root).at(-1);
    if (last === undefined) throw new Error("the list painted no row");
    const lastRow = boundsOf(root, `virtual-row-${last}`);
    expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(first.y + 320);
  });

  it("moves the window on a wheel and reports the range", () => {
    const root = mount();
    const first = boundsOf(root, "virtual-row-0");

    root.renderer.nativeSimulateScrollWheel(
      first.x + 20,
      first.y + 10,
      0,
      -600,
    );
    root.renderer.flush();

    const rows = paintedRows(root);
    expect(rows).not.toContain(0);
    expect(rows.length).toBeGreaterThan(0);
    expect(allText(root)).toContain("first=");

    expect(allText(root)).toMatch(/first=\d+ last=\d+/);
    expect(allText(root)).not.toContain("last=-1");
  });

  it("reveals a far row from the list's own instance", () => {
    const root = mount();

    root.renderer.nativeSimulateClick(
      boundsOf(root, "virtual-reveal").x + 4,
      boundsOf(root, "virtual-reveal").y + 4,
    );
    root.renderer.flush();

    expect(paintedRows(root)).toContain(REVEAL_ROW);
    expect(paintedRows(root)).not.toContain(0);
  });
});
