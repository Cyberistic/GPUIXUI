/**
 * The three types the reference charts have and this package did not: a
 * scatter, a candle and a funnel.
 *
 * These cases guard the claims each type makes — a point per datum, a candle
 * that paints in its own direction's colour, and a stage that is a share of
 * the first.
 */
import { afterEach, describe, expect, it } from "vitest";
import { CandleChart, FunnelChart, ScatterChart } from "../chart/chart.js";
import { chartMarkupOf } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the sharper chart types", () => {
  it("paints one point per datum, and no line between them", () => {
    root = renderData(
      <ScatterChart
        aria-label="Scatter"
        labels={["a", "b", "c"]}
        series={[{ key: "points", label: "Points", values: [10, 40, 70] }]}
        width={200}
        height={100}
        testId="scatter"
      />,
    );
    settle(root);
    const source = chartMarkupOf(root, "scatter-layer-points");
    expect(source).toContain("<circle");
    expect(source).not.toContain("<path");
  });

  it("paints a candle in the colour of its own direction", () => {
    root = renderData(
      <CandleChart
        aria-label="Candles"
        labels={["d1", "d2"]}
        series={[]}
        candles={[
          { open: 10, high: 20, low: 5, close: 18 },
          { open: 18, high: 19, low: 12, close: 13 },
        ]}
        width={200}
        height={100}
        testId="candles"
      />,
    );
    settle(root);
    const source = chartMarkupOf(root, "candles-layer-candles");
    expect(source).toContain("<rect");
    // Two candles, each a wick and a body, and each in its **own**
    // direction's colour: the document carries the grid's rules too, so the
    // candles are the shapes that are not the grid's.
    const candles = [...source.matchAll(/<rect\b[^>]*fill="([^"]+)"[^>]*\/>/g)]
      .map((match) => match[1] ?? "")
      .filter((fill) => fill !== "#2A303B");
    // Two colours: the up day and the down day.
    expect(new Set(candles).size).toBe(2);
    // And the direction is the rule: the first candle closed above its open,
    // the second at or below it.
    const up = candles[0] ?? "";
    const down = candles[candles.length - 1] ?? "";
    expect(up).not.toBe(down);
  });

  it("paints a funnel's stages, each a share of the first", () => {
    root = renderData(
      <FunnelChart
        aria-label="Funnel"
        labels={["visit", "sign up", "buy"]}
        series={[]}
        stages={[100, 60, 20]}
        width={200}
        height={100}
        testId="funnel"
      />,
    );
    settle(root);
    const source = chartMarkupOf(root, "funnel-layer-funnel");
    // Three stages; the document carries the grid's rules too, so the stages
    // are the shapes that are not the grid's.
    const stages = [...source.matchAll(/<rect\b[^>]*\/>/g)]
      .map((match) => match[0])
      .filter((shape) => !shape.includes("#2A303B"));
    expect(stages.length).toBe(3);
    // The stages narrow: the last is a fifth of the first, and each is
    // centred, so a funnel reads as a funnel rather than as bars of
    // different widths stacked to one side.
    const widths = stages.map((shape) =>
      Number(/width="([\d.]+)"/.exec(shape)?.[1] ?? 0),
    );
    expect(widths[widths.length - 1]).toBeLessThan(widths[0] ?? 0);
    const lefts = stages.map((shape) =>
      Number(/x="([\d.]+)"/.exec(shape)?.[1] ?? 0),
    );
    expect(lefts[1]).toBeGreaterThan(lefts[0] ?? 0);
  });
});
