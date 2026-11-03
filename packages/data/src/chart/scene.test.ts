/**
 * The scene bridge: our chart's props become a scene, and the scene becomes
 * one SVG document.
 *
 * These cases guard the claims the bridge makes — the ones a chart's quality
 * rests on:
 *
 * - the scene path runs with **no DOM**, which is what makes it usable on a
 *   runtime that has none;
 * - one document carries **every series' own colour**, which is the thing
 *   the one-tint mask route cannot do;
 * - the hit test is **geometric**, so the hover readout names a datum without
 *   a per-mark event;
 * - the rows are **flat**, one field per series, because a channel that
 *   names a field the row does not carry reads nothing.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  chartScene,
  scenePointAt,
  sceneRows,
  sceneSvg,
} from "./scene.js";
import type { ChartSeries } from "./logic.js";

const series: ReadonlyArray<ChartSeries> = [
  { key: "revenue", label: "Revenue", values: [32, 48, 41] },
  { key: "cost", label: "Cost", values: [18, 22, 26] },
];

const labels = ["Q1", "Q2", "Q3"];

const options = {
  series,
  labels,
  box: { width: 320, height: 160 },
  range: { min: 0, max: 60 },
  colours: ["#2563eb", "#60a5fa"],
  kind: "bar" as const,
  label: "Revenue against cost",
  description: "Q1 32, Q2 48, Q3 41",
};

describe("the scene bridge", () => {
  it("has no document and no window to lean on", () => {
    // The scene compiler is a pure function over a definition and a size. If
    // it ever reaches for a DOM, this is the case that catches it. The
    // package ships no DOM lib, so the globals are read off `globalThis`.
    const globals: { readonly [key: string]: unknown } = globalThis;
    expect(globals["document"]).toBeUndefined();
    expect(globals["window"]).toBeUndefined();
  });

  it("lays the rows out flat, one field per series", () => {
    const rows = sceneRows(series, labels);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual({ category: "Q1", revenue: 32, cost: 18 });
    expect(rows[2]).toEqual({ category: "Q3", revenue: 41, cost: 26 });
  });

  it("reads a value the data does not carry as zero, not as a hole", () => {
    const rows = sceneRows(
      [{ key: "revenue", label: "Revenue", values: [1] }],
      ["Q1", "Q2"],
    );
    expect(rows[1]).toEqual({ category: "Q2", revenue: 0 });
  });

  it("compiles a definition into a scene with points for every datum", () => {
    const scene = chartScene(options);
    // Every painted datum keeps its identity beside the paint: the scene's
    // points are the chart's data, not a hit-test artefact.
    const seriesPoints = Arr.filter(
      scene.points,
      (point) => point.markId.startsWith("bar-"),
    );
    expect(seriesPoints.length).toBe(6);
    // The points are grouped by the mark that owns them: the first series'
    // three categories, then the second series' three.
    expect(Arr.map(seriesPoints, (point) => point.datum.category)).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q1",
      "Q2",
      "Q3",
    ]);
  });

  it("serialises the scene into one document carrying every series' colour", () => {
    const svg = sceneSvg(options);
    // The claim the whole route rests on: two series, two colours, one
    // element. A tinted <svg source> mask cannot do this.
    expect(svg).toContain("#2563eb");
    expect(svg).toContain("#60a5fa");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    // One document, not one per series.
    expect(svg.split("<svg").length - 1).toBe(1);
  });

  it("names the chart and its values for a reader", () => {
    const svg = sceneSvg(options);
    expect(svg).toContain('aria-label="Revenue against cost"');
  });

  it("answers which datum is under the pointer, by geometry", () => {
    const scene = chartScene(options);
    const point = scene.points.find(
      (candidate) => candidate.datum.category === "Q2",
    );
    expect(point).toBeDefined();
    if (point === undefined) return;
    const found = scenePointAt(scene, point.x, point.y, 4);
    expect(Option.isSome(found)).toBe(true);
    expect(Option.getOrElse(found, () => undefined)?.datum.category).toBe("Q2");
  });

  it("names nothing when the pointer is far from every datum", () => {
    const scene = chartScene(options);
    // A pointer in the plot's margin is not over a datum, so the readout has
    // nothing to say — the rule every hit zone follows. The points are the
    // chart's own, so a point that is nowhere near the pointer is not under
    // it whatever its mark.
    expect(Option.isNone(scenePointAt(scene, -100, -100, 4))).toBe(true);
  });

  it("paints a line chart's series as a stroked path, not as bars", () => {
    const svg = sceneSvg({ ...options, kind: "line" });
    // A line is a path with no fill and a stroke of its own; a bar is a
    // filled rect. The two cannot be mistaken for each other.
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="#2563eb"');
    expect(svg).not.toContain("<rect");
  });

  it("paints an area chart's series as a filled area", () => {
    const svg = sceneSvg({ ...options, kind: "area" });
    expect(svg).toContain("<path");
    expect(svg).toContain("#60a5fa");
  });
});
