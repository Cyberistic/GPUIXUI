/**
 * Tier 3 probe: the shipped `@gpuixui/data` charts, mounted from their example.
 *
 * The package behaviour suite owns the paint in the offscreen renderer; this
 * probe is the second host a plan can read, and it asserts the one fact the
 * runtime forces: an `<svg source>` is one tinted mask, so every series is its
 * **own** element and its own colour. A chart that stacked its series into one
 * element paints one colour and fails here by name.
 *
 * The ids are the example's own (`chart-bars-layer-revenue`, …), so a probe that
 * drifts from the shipped screen fails instead of measuring a copy.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { examples } from "@gpuixui/data/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

const ChartExample = examples["chart"];

/** The colour a mask or swatch paints, as the renderer reports it. */
const colourOf = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(ctx.host.paintedStyle(id)),
      (style) => style.color,
    ),
    () => "",
  );

const fillOf = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(ctx.host.paintedStyle(id)),
      (style) => style.backgroundColor,
    ),
    () => "",
  );

export const dataChartsScenario: ScenarioBody = {
  view: () => (ChartExample === undefined ? null : <ChartExample />),
  steps: (ctx) =>
    Effect.gen(function* () {
      // One mask per series, each its own colour: the whole reason a chart is a
      // stack of elements rather than one drawing.
      const revenue = colourOf(ctx, "chart-bars-layer-revenue");
      const cost = colourOf(ctx, "chart-bars-layer-cost");
      yield* ctx.expectEqual(
        "the first series paints a mask",
        revenue.length > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the second series paints its own mask",
        cost.length > 0 && cost !== revenue,
        true,
      );

      // The mask covers the plot, so a mark is not clipped or offset.
      const plot = yield* ctx.expectSome(
        "the plot painted",
        Option.fromNullishOr(ctx.host.bounds("chart-bars-plot")),
      );
      const layer = yield* ctx.expectSome(
        "the series layer painted",
        Option.fromNullishOr(ctx.host.bounds("chart-bars-layer-revenue")),
      );
      yield* ctx.expectNear(
        "the mask starts with the plot",
        layer.x,
        plot.x,
        1,
      );
      yield* ctx.expectNear(
        "the mask covers the plot's width",
        layer.width,
        plot.width,
        1,
      );
      yield* ctx.expectNear(
        "the mask covers the plot's height",
        layer.height,
        plot.height,
        1,
      );

      // The legend's swatch is the colour the plot paints, not a second palette.
      yield* ctx.expectEqual(
        "the legend names the colour the plot paints",
        fillOf(ctx, "chart-bars-legend-swatch-revenue"),
        revenue,
      );

      // A zero datum paints no slice, and the sparkline shares the chart's
      // first colour.
      yield* ctx.expectSome(
        "the first slice painted",
        Option.fromNullishOr(ctx.host.bounds("chart-donut-layer-direct")),
      );
      yield* ctx.expectEqual(
        "a zero datum paints no slice",
        ctx.host.bounds("chart-donut-layer-referral") === null,
        true,
      );
      yield* ctx.expectEqual(
        "the sparkline agrees with the first series colour",
        colourOf(ctx, "chart-sparkline-layer-sparkline"),
        revenue,
      );

      // The axis and the category labels are text beside the plot.
      yield* ctx.expectEqual(
        "the axis painted its zero tick",
        ctx.host.bounds("chart-bars-tick-0") !== null,
        true,
      );
      yield* ctx.expectEqual(
        "the axis painted the top of the scale",
        ctx.host.bounds("chart-bars-tick-100") !== null,
        true,
      );
      yield* ctx.expectSome(
        "the first category label painted",
        Option.fromNullishOr(ctx.host.bounds("chart-bars-label-0")),
      );
    }),
};
