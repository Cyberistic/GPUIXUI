/**
 * Zoom and pan on the real renderer.
 *
 * The bugs these guard: a pan that moves the strip but not the plot, a wheel
 * that reports a zoom but paints the same window, and a reset that leaves the
 * reader where the pan ended.
 */

import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { BarChart } from "../chart/chart.js";
import { requireStyle } from "../internal/interaction.js";
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

const Zoomed = ({
  onView,
  initial = [0, 2],
}: {
  readonly onView: (view: readonly [number, number]) => void;
  readonly initial?: readonly [number, number];
}) => {
  const [view, setView] = useState<readonly [number, number]>(initial);
  return (
    <BarChart
      aria-label="Revenue"
      labels={["Q1", "Q2", "Q3", "Q4"]}
      series={[{ key: "a", label: "A", values: [10, 20, 30, 40] }]}
      view={view}
      zoom
      onViewChange={(next) => {
        onView(next);
        setView(next);
      }}
      width={200}
      height={120}
      testId="chart-zoom"
    />
  );
};

const strip = (tree: DataTestRoot) => {
  const element = tree.renderer.findByTestId("chart-zoom-zoom");
  if (element === undefined) throw new Error("behaviour: no zoom strip");
  const bounds = tree.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error("behaviour: no zoom bounds");
  return bounds;
};

const plot = (tree: DataTestRoot) => {
  const element = tree.renderer.findByTestId("chart-zoom-gesture");
  if (element === undefined) throw new Error("behaviour: no gesture layer");
  const bounds = tree.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error("behaviour: no gesture bounds");
  return bounds;
};

describe("a chart's zoom strip", () => {
  it("zooms to the band dragged over the plot", () => {
    const views: Array<readonly [number, number]> = [];
    root = renderData(
      <Zoomed initial={[0, 4]} onView={(view) => views.push(view)} />,
    );
    settle(root);
    const bounds = plot(root);
    const y = bounds.y + bounds.height / 2;

    root.renderer.nativeSimulateMouseDown(bounds.x + 50, y);
    root.renderer.nativeSimulateMouseMove(bounds.x + 150, y, 0);
    root.renderer.nativeSimulateMouseUp(bounds.x + 150, y);
    root.renderer.dispatchNativeEvents();

    const last = views.at(-1);
    expect(last).toBeDefined();
    expect((last?.[1] ?? 4) - (last?.[0] ?? 0)).toBeLessThan(4);
    expect(last?.[0]).toBeGreaterThan(0.9);
  });

  it("zooms on a wheel over the plot", () => {
    const views: Array<readonly [number, number]> = [];
    root = renderData(
      <Zoomed initial={[0, 4]} onView={(view) => views.push(view)} />,
    );
    settle(root);
    const bounds = plot(root);

    root.renderer.nativeSimulateScrollWheel(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
      -120,
    );
    root.renderer.dispatchNativeEvents();

    const last = views.at(-1);
    expect((last?.[1] ?? 4) - (last?.[0] ?? 0)).toBeLessThan(4);
  });

  it("pans the window when the strip is dragged", () => {
    const views: Array<readonly [number, number]> = [];
    root = renderData(<Zoomed onView={(view) => views.push(view)} />);
    settle(root);
    const bounds = strip(root);
    const y = bounds.y + bounds.height / 2;

    root.renderer.nativeSimulateMouseDown(bounds.x + 150, y);
    root.renderer.nativeSimulateMouseMove(bounds.x + 50, y, 0);
    root.renderer.nativeSimulateMouseUp(bounds.x + 50, y);
    root.renderer.dispatchNativeEvents();

    const last = views.at(-1);
    expect(last).toBeDefined();
    expect(last?.[0]).toBeGreaterThan(0);
    expect(last?.[1]).toBeLessThanOrEqual(4);
    // The categories move with the window: the first label is clipped left.
    expect(requireStyle(root, "chart-zoom-label-0").left).toBeLessThan(0);
  });

  it("zooms in on the wheel and widens a category", () => {
    const views: Array<readonly [number, number]> = [];
    root = renderData(<Zoomed onView={(view) => views.push(view)} />);
    settle(root);
    const before = requireStyle(root, "chart-zoom-label-0").width;
    const bounds = strip(root);

    root.renderer.nativeSimulateScrollWheel(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
      -120,
    );
    root.renderer.dispatchNativeEvents();

    const last = views.at(-1);
    expect(last).toBeDefined();
    expect((last?.[1] ?? 4) - (last?.[0] ?? 0)).toBeLessThan(4);
    expect(requireStyle(root, "chart-zoom-label-0").width).not.toBe(before);
  });

  it("restores every category on reset", () => {
    const views: Array<readonly [number, number]> = [];
    root = renderData(<Zoomed onView={(view) => views.push(view)} />);
    settle(root);
    const bounds = strip(root);
    root.renderer.nativeSimulateMouseDown(bounds.x + 150, bounds.y + 8);
    root.renderer.nativeSimulateMouseMove(bounds.x + 50, bounds.y + 8, 0);
    root.renderer.nativeSimulateMouseUp(bounds.x + 50, bounds.y + 8);
    root.renderer.dispatchNativeEvents();
    expect(views.at(-1)?.[0]).toBeGreaterThan(0);

    const reset = root.renderer.findByTestId("chart-zoom-zoom-reset");
    if (reset === undefined) throw new Error("behaviour: no reset");
    const resetBounds = root.renderer.getElementBounds(reset.id);
    if (resetBounds === null) throw new Error("behaviour: no reset bounds");
    root.renderer.nativeSimulateMouseDown(
      resetBounds.x + resetBounds.width / 2,
      resetBounds.y + resetBounds.height / 2,
    );
    root.renderer.nativeSimulateMouseUp(
      resetBounds.x + resetBounds.width / 2,
      resetBounds.y + resetBounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(views.at(-1)).toEqual([0, 4]);
  });
});
