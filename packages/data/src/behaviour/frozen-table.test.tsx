import { afterEach, describe, expect, it } from "vitest";
import { darkTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import {
  FROZEN_TABLE_ROW_HEIGHT,
  FrozenTableExample,
} from "../../examples/frozen-table.example.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<FrozenTableExample />);

  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
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

const scrollOf = (root: DataTestRoot, testId: string) => {
  const offset = root.renderer.getScrollOffset(findId(root, testId));
  if (offset === null || offset === undefined)
    throw new Error(`${testId} reports no scroll offset`);
  return { x: offset[0] ?? 0, y: offset[1] ?? 0 };
};

const allText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

const readout = (root: DataTestRoot): string => allText(root);

const wheel = (
  root: DataTestRoot,
  testId: string,
  deltaX: number,
  deltaY: number,
): void => {
  const pane = boundsOf(root, testId);
  root.renderer.nativeSimulateScrollWheel(
    pane.x + 10,
    pane.y + 10,
    deltaX,
    deltaY,
  );
  root.renderer.flush();
};

describe("the frozen-column table", () => {
  it("lines the same record up across the seam", () => {
    const root = mount();
    expect(boundsOf(root, "frozen-row-file-5").y).toBe(
      boundsOf(root, "body-row-file-5").y,
    );
    expect(boundsOf(root, "frozen-row-file-5").height).toBe(
      FROZEN_TABLE_ROW_HEIGHT,
    );
  });

  it("mirrors a wheel over the data pane into the frozen column", () => {
    const root = mount();

    wheel(root, "frozen-body", 0, -300);

    const frozen = scrollOf(root, "frozen-pane");
    const body = scrollOf(root, "frozen-body");
    expect(body.y).toBeLessThan(0);
    expect(frozen.y).toBe(body.y);

    expect(boundsOf(root, "frozen-row-file-20").y).toBe(
      boundsOf(root, "body-row-file-20").y,
    );
  });

  it("mirrors a wheel over the frozen column back into the data pane", () => {
    const root = mount();

    wheel(root, "frozen-body", 0, -300);
    const once = scrollOf(root, "frozen-body").y;
    wheel(root, "frozen-pane", 0, -300);

    const frozen = scrollOf(root, "frozen-pane");
    const body = scrollOf(root, "frozen-body");
    expect(body.y).toBeLessThan(once);
    expect(frozen.y).toBe(body.y);
  });

  it("chooses the record a press on the frozen column lands on", () => {
    const root = mount();
    const frozen = boundsOf(root, "frozen-row-file-3");

    root.renderer.nativeSimulateClick(
      frozen.x + frozen.width / 2,
      frozen.y + frozen.height / 2,
    );
    root.renderer.flush();

    expect(readout(root)).toContain("file-3 selected");

    expect(
      root.renderer.findByTestId("frozen-row-file-3")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
    expect(
      root.renderer.findByTestId("body-row-file-3")?.style.backgroundColor,
    ).toBe(darkTheme.colors.selected);
  });

  it("clamps both panes at the same end", () => {
    const root = mount();

    wheel(root, "frozen-body", 0, -10_000);

    const frozen = scrollOf(root, "frozen-pane");
    const body = scrollOf(root, "frozen-body");
    expect(body.y).toBeLessThan(0);
    expect(frozen.y).toBe(body.y);

    expect(boundsOf(root, "frozen-row-file-60").y).toBe(
      boundsOf(root, "body-row-file-60").y,
    );
  });
});
