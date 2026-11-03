/**
 * A chart's data change, in the real GPUix renderer.
 *
 * The bugs these guard are the ones a tween ships with: a change that snaps to
 * the target (no frames were ever painted), a run that never lands on the data
 * the caller handed over, and a reader who asked for less motion still watching
 * the growth. The frame is read from the marks' own geometry, because that is
 * what a reader sees.
 */

import { afterEach, describe, expect, it } from "vitest";
import { MotionProvider } from "@gpuixui/motion/react";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { BarChart } from "../chart/chart.js";
import { seriesShapesOf } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

/** The colour the first series paints in. */
const colourAt = (index: number): string =>
  seriesColors(darkTheme)[index] ?? "#000000";

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** The height the first bar paints, in plot pixels. */
/**
 * The height of the first bar a series painted.
 *
 * The document carries the grid and every series, so the bar is the first
 * shape in the **series' own colour** — the one thing that tells its bars
 * from the grid's rules.
 */
const firstBarHeight = (tree: DataTestRoot, testId: string): number => {
  const shapes = seriesShapesOf(tree, testId, "a", colourAt(0));
  const match = /<rect[^>]*height="([\d.]+)"/.exec(shapes.join(" "));
  if (match?.[1] === undefined)
    throw new Error(`behaviour: no bar in ${testId}`);
  return Number(match[1]);
};

/** Wait for the tween's clock, then flush the paint it caused. */
const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (root !== undefined) settle(root);
};

describe("a chart's data change", () => {
  it("paints the frames between the two data sets", async () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [10] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={160}
        width={200}
        height={160}
        testId="chart-anim"
      />,
    );
    settle(root);
    const start = firstBarHeight(root, "chart-anim");

    root.rerender(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [100] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={160}
        width={200}
        height={160}
        testId="chart-anim"
      />,
    );
    settle(root);
    await wait(48);
    const middle = firstBarHeight(root, "chart-anim");
    await wait(200);
    const end = firstBarHeight(root, "chart-anim");

    expect(start).toBe(16);
    expect(end).toBe(160);
    expect(middle).toBeGreaterThan(start);
    expect(middle).toBeLessThan(end);
  });

  it("lands exactly on the target when the tween ends", async () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [100] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={40}
        width={200}
        height={160}
        testId="chart-anim-end"
      />,
    );
    settle(root);
    root.rerender(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [10] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={40}
        width={200}
        height={160}
        testId="chart-anim-end"
      />,
    );
    settle(root);
    await wait(120);

    expect(firstBarHeight(root, "chart-anim-end")).toBe(16);
  });

  it("paints the target at once when the reader asked for less motion", async () => {
    const chart = (value: number) => (
      <MotionProvider preference="reduced">
        <BarChart
          aria-label="Revenue"
          labels={["Q1"]}
          series={[
            { key: "a", label: "A", values: [value] },
            { key: "b", label: "B", values: [100] },
          ]}
          animate
          animationDuration={160}
          width={200}
          height={160}
          testId="chart-reduced"
        />
      </MotionProvider>
    );
    root = renderData(chart(10));
    settle(root);
    expect(firstBarHeight(root, "chart-reduced")).toBe(16);

    root.rerender(chart(100));
    settle(root);
    expect(firstBarHeight(root, "chart-reduced")).toBe(160);
  });
});
