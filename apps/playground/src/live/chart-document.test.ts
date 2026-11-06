/**
 * Guards the fixture `chart-document-lifecycle` samples the shipped charts and
 * the shipped diagram with.
 *
 * The live probe's checks are pixel counts and samples, so two things must
 * hold before a green run means anything:
 *
 * 1. **A sample point is a mark the shipped geometry draws.** The points are
 *    written in each plot's own coordinates, and a window that reads a pixel
 *    there proves the paint only if the bar really covers it. The case below
 *    derives the marks from `@gpuixui/data/chart/logic` and holds every point
 *    to them, so a data or size change moves the check to the new mark
 *    instead of measuring the old empty box.
 * 2. **The view mounts the supplied parts with the fixture's ids.** The probe
 *    composes the shipped `BarChart` and the shipped `Diagram`; a probe that
 *    drew its own `<svg>`, or renamed an id only on one side, would pass while
 *    measuring a copy.
 *
 * The last two cases are the record: the probe is registered, and its README
 * section prints the check count the fixture declares.
 *
 * `node:fs` is a check over the repository's own source, the shape
 * `chart-surface.test.ts` and `registry.test.ts` use.
 */
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

/** The chart's series, in the order the fixture declares them. */
const series = [CHART_DOCUMENT_REVENUE, CHART_DOCUMENT_COST];

/** The chart's box, from the fixture's sizes. */
const box = {
  width: CHART_DOCUMENT_SIZES.bars.width,
  height: CHART_DOCUMENT_SIZES.bars.height,
};

/** The range the marks are laid out against. */
const range = chartRange(series, CHART_DOCUMENT_LABELS.length);

/**
 * The marks the shipped geometry draws, per series.
 *
 * The chart lays **both** series out at once, so the bars are **grouped**: the
 * first series' bar stands beside the second's in the same slot, and each is
 * half the slot's width. Laying one series out alone would give it the whole
 * slot and a different place on the plot.
 */
const laidOut = barMarksInRange(
  series,
  box,
  range,
  CHART_DOCUMENT_LABELS.length,
);

describe("the chart-document fixture", () => {
  it("holds every sample point to a mark the geometry draws", () => {
    // The first category's two bars are **beside** each other in the same
    // slot, so the two points are the centres of the first series' bar and
    // of the second's. A point that missed its bar would measure the surface
    // behind the plot.
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

    // The second series' bar stands beside the first, so its centre is the
    // first's plus one bar's width.
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
