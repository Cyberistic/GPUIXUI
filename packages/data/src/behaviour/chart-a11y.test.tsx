/**
 * A chart announces its data, and a sparkline announces itself once.
 *
 * Two bugs are guarded here, both measured in a real window on
 * `@gpuix/native@0.11.0`:
 *
 * - **A sparkline was two images.** Its wrapper claimed `role="img"` with the
 *   caller's `aria-label` while the single series layer inside it claimed the
 *   same role with the same name, so the tree held two `Image` nodes and a
 *   reader heard the trend twice. Written as one layer, the tree holds one.
 * - **A series' values were silent.** A layer was named by its series label
 *   alone (`Revenue`), so the numbers a chart exists to show reached no reader:
 *   the axis tick text and the category labels were loose `Label`s beside it.
 *   0.11.0 carries no figure or table role, so each series now carries its
 *   readout in `aria-description` (`Q1 3, Q2 6`) — the one extra channel the
 *   closed `aria-*` set has.
 */

import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import {
  decodeA11yTree,
  onlyRole,
  withRole,
  type A11yTree,
} from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { BarChart, DonutChart, Sparkline } from "../chart/chart.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** Render one chart in a real window and hand back its accessibility tree. */
const treeOf = (node: Parameters<typeof renderData>[0]): A11yTree => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

/** One node's announced name and description. */
const wordsOf = (
  tree: A11yTree,
  id: string,
): { readonly label: string; readonly description: string } => ({
  label: tree.nodes[id]?.aria.label ?? "",
  description: tree.nodes[id]?.aria.description ?? "",
});

describe("a chart's accessibility tree", () => {
  it("names a sparkline once, with its values beside the name", () => {
    const tree = treeOf(
      <Sparkline aria-label="Revenue trend" values={[3, 6, 2]} />,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(images).toHaveLength(1);
    expect(wordsOf(tree, images[0] ?? "")).toEqual({
      label: "Revenue trend",
      description: "3, 6, 2",
    });
  });

  it("falls back to the word Trend for a sparkline the caller did not name", () => {
    const tree = treeOf(<Sparkline values={[3, 6]} />);

    const images = withRole(tree, tree.root, "Image");
    expect(images).toHaveLength(1);
    expect(wordsOf(tree, images[0] ?? "").label).toBe("Trend");
  });

  it("describes a bar series by the labels it paints", () => {
    const tree = treeOf(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, 6] }]}
      />,
    );

    const group = onlyRole(tree, "Group");
    expect(wordsOf(tree, group).label).toBe("Revenue");
    const image = onlyRole(tree, "Image");
    expect(wordsOf(tree, image)).toEqual({
      label: "Revenue",
      description: "Q1 3, Q2 6",
    });
  });

  it("describes only the slots a series paints", () => {
    const tree = treeOf(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, 6, 9] }]}
      />,
    );

    // The third value draws nowhere, so announcing it would name a datum the
    // picture does not show.
    expect(wordsOf(tree, onlyRole(tree, "Image")).description).toBe(
      "Q1 3, Q2 6",
    );
  });

  it("reads an unreadable value as no value, not the geometry's zero", () => {
    const tree = treeOf(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, Number.NaN] }]}
      />,
    );

    expect(wordsOf(tree, onlyRole(tree, "Image")).description).toBe(
      "Q1 3, Q2 no value",
    );
  });

  it("describes every ring slice by its own value", () => {
    const tree = treeOf(
      <DonutChart
        aria-label="Traffic by source"
        data={[
          { key: "direct", label: "Direct", value: 40 },
          { key: "referral", label: "Referral", value: 60 },
        ]}
      />,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(Arr.map(images, (id) => wordsOf(tree, id))).toEqual([
      { label: "Direct", description: "40" },
      { label: "Referral", description: "60" },
    ]);
  });

  it("announces a ring datum that draws no slice", () => {
    // Bug guarded: a ring datum with nothing to draw — a zero, or a value the
    // geometry cannot read — painted no layer at all, so its reading vanished
    // from the tree while the legend still named the datum: a reader heard
    // three categories and two numbers, and could not tell a zero from a value
    // left out. This is the loss the series charts closed for a bar of zeros;
    // the datum keeps its image and simply draws no slice.
    const tree = treeOf(
      <DonutChart
        aria-label="Traffic by source"
        data={[
          { key: "direct", label: "Direct", value: 40 },
          { key: "referral", label: "Referral", value: 0 },
          { key: "unknown", label: "Unknown", value: Number.NaN },
        ]}
      />,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(Arr.map(images, (id) => wordsOf(tree, id))).toEqual([
      { label: "Direct", description: "40" },
      { label: "Referral", description: "0" },
      { label: "Unknown", description: "no value" },
    ]);
  });

  it("announces a series whose values draw no bar", () => {
    // A bar chart of zeros paints no bar — a zero keeps its slot and has no
    // height — but the series exists and its values are the reading. Dropping
    // the layer left the legend naming a series the tree never described, so a
    // reader could not tell a zero from a series left out of the chart.
    const tree = treeOf(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2"]}
        series={[
          { key: "revenue", label: "Revenue", values: [0, 0] },
          { key: "cost", label: "Cost", values: [0, -4] },
        ]}
        testId="chart-zero"
      />,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(Arr.map(images, (id) => wordsOf(tree, id))).toEqual([
      { label: "Revenue", description: "Q1 0, Q2 0" },
      { label: "Cost", description: "Q1 0, Q2 -4" },
    ]);
    // The picture did not lie to meet the words: nothing is painted, because
    // the geometry has no bar for a zero or a negative value.
    Arr.forEach(["revenue", "cost"], (layer) => {
      const node = root?.renderer.findByTestId(`chart-zero-layer-${layer}`);
      expect(node?.customProps?.source).not.toContain("<rect");
    });
  });
});
