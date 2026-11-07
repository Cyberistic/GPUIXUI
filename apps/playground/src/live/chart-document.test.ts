import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { barMarksInRange, chartRange } from "@gpuixui/data/chart/geometry";
import {
  CHART_DOCUMENT_CHECKS,
  CHART_DOCUMENT_COST,
  CHART_DOCUMENT_LABELS,
  CHART_DOCUMENT_POINTS,
  CHART_DOCUMENT_REVENUE,
  CHART_DOCUMENT_SIZES,
} from "./chart-document.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const series = [CHART_DOCUMENT_REVENUE, CHART_DOCUMENT_COST];

const box = {
  width: CHART_DOCUMENT_SIZES.bars.width,
  height: CHART_DOCUMENT_SIZES.bars.height,
};

const range = chartRange(series, CHART_DOCUMENT_LABELS.length);

const laidOut = barMarksInRange(
  series,
  box,
  range,
  CHART_DOCUMENT_LABELS.length,
);

describe("the chart-document fixture", () => {
  it("holds every sample point to a mark the geometry draws", () => {
    const first = laidOut[0]?.[0];
    expect(first).toBeDefined();
    if (first === undefined || first.kind !== "rect") {
      throw new Error("the first series paints no bar");
    }
    const centre = first.x + first.width / 2;
    expect(centre).toBeCloseTo(CHART_DOCUMENT_POINTS.revenue.x, 1);
    expect(CHART_DOCUMENT_POINTS.revenue.y).toBeGreaterThan(first.y);
    expect(CHART_DOCUMENT_POINTS.revenue.y).toBeLessThan(
      first.y + first.height,
    );

    const second = laidOut[1]?.[0];
    expect(second).toBeDefined();
    if (second === undefined || second.kind !== "rect") {
      throw new Error("the second series paints no bar");
    }
    expect(second.x + second.width / 2).toBeCloseTo(
      CHART_DOCUMENT_POINTS.cost.x,
      1,
    );
    expect(second.x).toBeGreaterThan(first.x + first.width - 1);
  });

  it("names the probe in the registry", () => {
    const entry = Arr.findFirst(
      liveRegistry,
      (candidate) => candidate.id === "chart-document-lifecycle",
    );
    expect(Option.isSome(entry)).toBe(true);
  });

  it("prints the check count the fixture declares", () => {
    const readme = read("../../README.md");
    const section = readme.slice(
      readme.indexOf("### `chart-document-lifecycle`"),
    );
    expect(section).toContain(`${CHART_DOCUMENT_CHECKS} checks`);
    expect(section).toContain("--only chart-document-lifecycle");
  });
});
