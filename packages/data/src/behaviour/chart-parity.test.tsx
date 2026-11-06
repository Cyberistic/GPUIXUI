import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

interface Painted {
  readonly id: number;
  readonly text: string | null;
  readonly children: ReadonlyArray<number>;
  readonly customProps?: Record<string, unknown>;
}
import {
  PARITY_CHARTS,
  ParityGallery,
} from "../../examples/chart-parity.example.js";
import { parity } from "../chart/parity.js";
import { markupOf } from "../internal/markup.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

beforeAll(() => {
  root = renderData(<ParityGallery />);
  settle(root);
}, 60_000);

afterAll(() => {
  root?.unmount();
  root = undefined;
});

const descendants = (
  tree: DataTestRoot,
  id: number,
): ReadonlyArray<Painted> => {
  const found: Array<Painted> = [];
  const visit = (at: number): void => {
    const element = tree.renderer.getElement(at);
    if (element === undefined) return;
    found.push(element);
    Arr.forEach(element.children, visit);
  };
  visit(id);
  return found;
};

const marksOf = (tree: DataTestRoot, id: number): ReadonlyArray<string> =>
  Arr.flatMap(descendants(tree, id), (element) =>
    Option.match(markupOf(element), {
      onNone: () => [],
      onSome: (source) =>
        source.includes("<rect") ||
        source.includes("<path") ||
        source.includes("<circle")
          ? [source]
          : [],
    }),
  );

const wordsOf = (tree: DataTestRoot, id: number): ReadonlyArray<string> =>
  Arr.flatMap(descendants(tree, id), (element) =>
    element.text === null || element.text.trim().length === 0
      ? []
      : [element.text],
  );

describe("the reference parity gallery", () => {
  it("renders every row of the map", () => {
    expect(PARITY_CHARTS.length).toBe(parity.length);
    expect(root?.renderer.findByTestId("chart-parity-gallery")).toBeDefined();
  });

  it.each(parity.map((row) => [row.example, row.native] as const))(
    "paints %s with marks and labels",
    (example, native) => {
      const tree = root;
      if (tree === undefined) throw new Error("behaviour: no gallery");
      const node = tree.renderer.findByTestId(`parity-${example}`);
      if (node === undefined) throw new Error(`no chart for ${example}`);

      if (native === "ChartLegend") {
        expect(Arr.join(wordsOf(tree, node.id), " ")).toContain("Revenue");
        return;
      }

      const marks = marksOf(tree, node.id);
      expect(marks.length).toBeGreaterThan(0);

      expect(marks[0]?.length ?? 0).toBeGreaterThan(80);
      const words = wordsOf(tree, node.id);
      expect(words.length).toBeGreaterThan(0);
    },
  );
});
