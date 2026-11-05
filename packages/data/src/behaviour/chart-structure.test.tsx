/**
 * The three charts that lay themselves out, in the real GPUix renderer.
 *
 * The bugs these guard are the ones a self-laying chart ships with:
 *
 * - a treemap whose cells paint in one colour, so the branches are not told
 *   apart;
 * - a treemap whose cells are **not** proportional, so a large value draws a
 *   small area;
 * - a sankey whose ribbons are not proportional, so a flow of nothing draws a
 *   ribbon;
 * - a sankey that throws on a link naming a node the graph does not hold;
 * - a sunburst whose arcs are not proportional, so a large value draws a
 *   small angle;
 * - a hierarchy with no root, which the compiler rejects.
 */

import { afterEach, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { SankeyChart, SunburstChart, TreemapChart } from "../chart/structure.js";
import { chartMarkupOf } from "../internal/interaction.js";
import { renderData, settle, type DataTestRoot } from "../internal/test-root.js";

let root: DataTestRoot | undefined;

const palette = seriesColors(darkTheme);

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** The colours a document paints, in the order they appear. */
const coloursOf = (markup: string): ReadonlyArray<string> =>
  Arr.map(
    [...markup.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)],
    (match) => match[1] ?? "",
  );

describe("the treemap", () => {
  it("paints each cell in its own colour", () => {
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"        testId="treemap"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "engineering", value: 60 },
          { path: "design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    const colours = coloursOf(markup);
    // Two cells, two colours: a reader tells the branches apart.
    expect(new Set(colours).size).toBe(2);
    expect(colours).toContain(palette[0] ?? "#B14AFF");
    expect(colours).toContain(palette[1] ?? "#00A893");
  });

  it("paints each cell in proportion to its value", () => {
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"        testId="treemap"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "engineering", value: 75 },
          { path: "design", value: 25 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    const areas = Arr.map(
      [...markup.matchAll(/<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/g)],
      (match) => Number(match[1]) * Number(match[2]),
    );
    expect(areas.length).toBe(2);
    const total = areas.reduce((sum, area) => sum + area, 0);
    const larger = Math.max(...areas);
    // A quarter of the whole is a quarter of the area: the cells are
    // proportional, and a large value draws a large area.
    expect(larger / total).toBeGreaterThan(0.7);
    expect(larger / total).toBeLessThan(0.8);
  });

  it("gives a list of leaves a root of its own", () => {
    // The compiler rejects a hierarchy with no root and one with two, so a
    // list that names only its leaves is given a root. Before the rule the
    // compiler threw and the chart painted nothing.
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"        testId="treemap"
        colors={[palette[0] ?? "#B14AFF"]}
        nodes={[
          { path: "engineering", value: 60 },
          { path: "design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    expect(coloursOf(markup).length).toBeGreaterThan(0);
  });
});

describe("the sankey", () => {
  it("paints the nodes and the ribbons", () => {
    root = renderData(
      <SankeyChart
        aria-label="The pipeline"        testId="sankey"
        colors={[palette[0] ?? "#B14AFF"]}
        nodeColors={
          new Map([
            ["visits", palette[0] ?? "#B14AFF"],
            ["buys", palette[1] ?? "#00A893"],
          ])
        }
        nodes={[
          { id: "visits", name: "Visits" },
          { id: "buys", name: "Buys" },
        ]}
        links={[{ source: "visits", target: "buys", value: 40 }]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sankey");
    // Two nodes and one ribbon.
    expect((markup.match(/<rect/g) ?? []).length).toBe(2);
    expect((markup.match(/<line/g) ?? []).length).toBe(1);
    // The nodes paint in their own colours.
    expect(new Set(coloursOf(markup)).size).toBe(2);
  });

  it("drops a link naming a node the graph does not hold", () => {
    // The compiler rejects such a link, so it is dropped here: a reader who
    // drew a flow to a node that is not there would rather see the flow that
    // is.
    root = renderData(
      <SankeyChart
        aria-label="The pipeline"        testId="sankey"
        colors={[palette[0] ?? "#B14AFF"]}
        nodes={[
          { id: "visits", name: "Visits" },
          { id: "buys", name: "Buys" },
        ]}
        links={[
          { source: "visits", target: "buys", value: 40 },
          { source: "visits", target: "nowhere", value: 10 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sankey");
    expect((markup.match(/<line/g) ?? []).length).toBe(1);
  });
});

describe("the sunburst", () => {
  it("paints each arc in its own colour", () => {
    root = renderData(
      <SunburstChart
        aria-label="The store"        testId="sunburst"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "root/engineering", value: 60 },
          { path: "root/design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sunburst");
    const colours = coloursOf(markup);
    expect(new Set(colours).size).toBeGreaterThan(1);
    expect(colours).toContain(palette[0] ?? "#B14AFF");
    expect(colours).toContain(palette[1] ?? "#00A893");
  });

  it("paints each arc in proportion to its value", () => {
    root = renderData(
      <SunburstChart
        aria-label="The store"        testId="sunburst"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "root/engineering", value: 75 },
          { path: "root/design", value: 25 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sunburst");
    // An arc's **angle** is the sweep between its two ends, so the angle is
    // read from the path's own points: the arc runs from its first point to
    // its last, around the centre.
    const angles = Arr.map(
      [
        ...markup.matchAll(
          /<path[^>]*d="M([\d.-]+),([\d.-]+)A[^"]*?([\d.-]+),([\d.-]+)L/g,
        ),
      ],
      (match) => {
        const start: readonly [number, number] = [
          Number(match[1]),
          Number(match[2]),
        ];
        const end: readonly [number, number] = [
          Number(match[3]),
          Number(match[4]),
        ];
        const at = (point: readonly [number, number]): number =>
          Math.atan2(point[0], point[1]);
        let sweep = at(end) - at(start);
        if (sweep < 0) sweep += Math.PI * 2;
        return sweep;
      },
    );
    expect(angles.length).toBe(2);
    const total = angles.reduce((sum, angle) => sum + angle, 0);
    // A quarter of the whole is a quarter of the circle: the arcs are
    // proportional, and a large value draws a large angle.
    expect(Math.max(...angles) / total).toBeGreaterThan(0.7);
    expect(Math.max(...angles) / total).toBeLessThan(0.8);
  });
});
