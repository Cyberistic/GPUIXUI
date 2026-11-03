/**
 * The reference set as native charts, one named case each.
 *
 * The map in `chart/parity.ts` is only a claim until every row renders. This
 * suite mounts the whole gallery once in the real renderer and asserts a named
 * chart for each reference example, so a row that has no native answer fails
 * by name rather than by a table nobody executes.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
/** The fields this suite reads from a painted element. */
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

/** Every descendant of one element, itself included. */
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

/**
 * The marks a chart paints: an element whose document carries a shape.
 *
 * The document route hands the markup over as a data URL, which the runtime
 * decodes; the mask route hands it over as the markup itself. Either way the
 * element that carries the marks is the one the shape is in.
 */
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

/** The words a chart paints, in paint order. */
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
        // A legend paints no marks; it names its series.
        expect(Arr.join(wordsOf(tree, node.id), " ")).toContain("Revenue");
        return;
      }

      const marks = marksOf(tree, node.id);
      expect(marks.length).toBeGreaterThan(0);
      // A mark carries geometry, not an empty document.
      expect(marks[0]?.length ?? 0).toBeGreaterThan(80);
      const words = wordsOf(tree, node.id);
      expect(words.length).toBeGreaterThan(0);
    },
  );
});
