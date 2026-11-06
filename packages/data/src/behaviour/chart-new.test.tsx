import { afterEach, describe, expect, it } from "vitest";
import {
  CandleChart,
  FunnelChart,
  LineChart,
  ScatterChart,
} from "../chart/chart.js";
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

    const candles = [...source.matchAll(/<rect\b[^>]*fill="([^"]+)"[^>]*\/>/g)]
      .map((match) => match[1] ?? "")
      .filter((fill) => fill !== "#2A303B");

    expect(new Set(candles).size).toBe(2);

    const up = candles[0] ?? "";
    const down = candles[candles.length - 1] ?? "";
    expect(up).not.toBe(down);
  });

  it("paints a crosshair at the hovered column, and none without a pointer", () => {
    root = renderData(
      <LineChart
        aria-label="Churn"
        labels={["Q1", "Q2", "Q3"]}
        series={[{ key: "churn", label: "Churn", values: [3, 6, 4] }]}
        crosshair
        width={200}
        height={100}
        testId="crossed"
      />,
    );
    settle(root);

    expect(root.renderer.findByTestId("crossed-crosshair")).toBeUndefined();

    const zone = root.renderer.findByTestId("crossed-zone-1");
    if (zone === undefined) throw new Error("behaviour: no zone 1");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no zone bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    const crosshair = root.renderer.findByTestId("crossed-crosshair");
    expect(crosshair).toBeDefined();

    const rule = root.renderer.getElementBounds(crosshair?.id ?? 0);
    const column = root.renderer.getElementBounds(zone.id);
    if (rule === null || column === null)
      throw new Error("behaviour: no bounds");
    expect(rule.x).toBeGreaterThan(column.x);
    expect(rule.x).toBeLessThan(column.x + column.width);
  });

  it("grows the point under the pointer, and only that one", () => {
    root = renderData(
      <LineChart
        aria-label="Churn"
        labels={["Q1", "Q2", "Q3"]}
        series={[{ key: "churn", label: "Churn", values: [3, 6, 4] }]}
        dots
        width={200}
        height={100}
        testId="emphasised"
      />,
    );
    settle(root);

    const mounted = root;
    const radiiOf = (): ReadonlyArray<number> => {
      const source = chartMarkupOf(mounted, "emphasised-layer-churn-dots");
      return [...source.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map((match) =>
        Number(match[1]),
      );
    };
    const before = radiiOf();
    expect(before.length).toBe(3);
    expect(new Set(before).size).toBe(1);

    const zone = root.renderer.findByTestId("emphasised-zone-1");
    if (zone === undefined) throw new Error("behaviour: no zone 1");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no zone bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    const after = radiiOf();

    expect(after.filter((radius) => radius > (before[0] ?? 0)).length).toBe(1);
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

    const stages = [...source.matchAll(/<rect\b[^>]*\/>/g)]
      .map((match) => match[0])
      .filter((shape) => !shape.includes("#2A303B"));
    expect(stages.length).toBe(3);

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
