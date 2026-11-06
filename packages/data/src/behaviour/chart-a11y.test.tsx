import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { seriesShapesOf } from "../internal/interaction.js";
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
import {
  BarChart,
  ChartLegend,
  DonutChart,
  Sparkline,
} from "../chart/chart.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const treeOf = (node: Parameters<typeof renderData>[0]): A11yTree => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

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

  it("reads a blank name as the word Trend the page documents", () => {
    const tree = treeOf(<Sparkline aria-label="" values={[3, 6]} />);

    const images = withRole(tree, tree.root, "Image");
    expect(images).toHaveLength(1);
    expect(wordsOf(tree, images[0] ?? "").label).toBe("Trend");
  });

  it("reads a whitespace name as the word Trend the page documents", () => {
    const tree = treeOf(<Sparkline aria-label="   " values={[3, 6]} />);

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

    const palette = seriesColors(darkTheme);
    const revenue = seriesShapesOf(
      root!,
      "chart-zero",
      "revenue",
      palette[0] ?? "",
    );
    const cost = seriesShapesOf(root!, "chart-zero", "cost", palette[1] ?? "");
    expect(revenue.filter((shape) => shape.startsWith("<rect"))).toEqual([]);
    expect(cost.filter((shape) => shape.startsWith("<rect")).length).toBe(1);
  });

  it("reads a blank series label as the key the series is stored by", () => {
    const tree = treeOf(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2"]}
        series={[
          { key: "revenue", label: "", values: [3, 6] },
          { key: "cost", label: "   ", values: [1, 2] },
        ]}
        testId="chart-blank"
      />,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(Arr.map(images, (id) => wordsOf(tree, id).label)).toEqual([
      "revenue",
      "cost",
    ]);

    const words = root?.renderer.getAllText() ?? [];
    expect(words).toEqual(expect.arrayContaining(["revenue", "cost"]));
  });

  it("reads a blank ring datum and a blank legend item by their keys", () => {
    const tree = treeOf(
      <div>
        <DonutChart
          aria-label="Traffic by source"
          data={[
            { key: "direct", label: "", value: 40 },
            { key: "referral", label: "  ", value: 60 },
          ]}
          testId="ring-blank"
        />
        <ChartLegend
          items={[{ key: "sessions", label: "", color: "#3355FF" }]}
          testId="legend-blank"
        />
      </div>,
    );

    const ring = withRole(tree, tree.root, "Image");
    expect(Arr.map(ring, (id) => wordsOf(tree, id).label)).toEqual([
      "direct",
      "referral",
    ]);
    const words = root?.renderer.getAllText() ?? [];

    expect(words).toContain("direct");
    expect(words).toContain("referral");
    expect(words).toContain("sessions");
  });

  it("keeps a category's slot when its stored label is a hole", () => {
    const tree = treeOf(
      <div>
        <BarChart
          testId="holed"
          aria-label="Revenue"
          // @ts-expect-error — a label list a store wrote with a hole.
          labels={["Q1", null]}
          series={[{ key: "revenue", label: "Revenue", values: [3, 6] }]}
        />
      </div>,
    );

    const images = withRole(tree, tree.root, "Image");
    expect(images).toHaveLength(1);
    expect(wordsOf(tree, images[0] ?? "").description).toBe("Q1 3, 6");

    expect(root?.renderer.findByTestId("holed-label-1")).not.toBe(undefined);
    expect(root?.renderer.getAllText() ?? []).not.toContain("null");
  });
});
