import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { examples } from "@gpuixui/data/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

const ChartExample = examples["chart"];

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

      yield* ctx.expectEqual(
        "the legend names the colour the plot paints",
        fillOf(ctx, "chart-bars-legend-swatch-revenue"),
        revenue,
      );

      yield* ctx.expectSome(
        "the first slice painted",
        Option.fromNullishOr(ctx.host.bounds("chart-donut-layer-direct")),
      );
      const tree = yield* ctx.expectSome(
        "the renderer reports an accessibility tree",
        Option.fromNullishOr(ctx.host.a11yTree()),
      );
      const zero = yield* ctx.expectSome(
        "the zero datum keeps its image in the tree",
        Arr.findFirst(tree.nodes, (node) =>
          Option.contains(node.label, "Referral"),
        ),
      );
      yield* ctx.expectEqual(
        "the zero datum reads its own value",
        Option.getOrElse(zero.description, () => ""),
        "0",
      );
      yield* ctx.expectEqual(
        "the sparkline agrees with the first series colour",
        colourOf(ctx, "chart-sparkline-layer-sparkline"),
        revenue,
      );

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
