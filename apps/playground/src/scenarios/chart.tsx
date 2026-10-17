/**
 * `chart-svg` — the Tier 3 chart feasibility probe.
 *
 * Three claims decide whether the library can ship a chart:
 *
 * 1. **Geometry and colour** — bars composed from `div`s keep exact heights and
 *    per-series token colours, and a painted mark is hit-testable.
 * 2. **Vector drawing** — what a sourced `<svg>` actually paints. The pinned
 *    GPUI rasterizes it to an **alpha mask** and paints a `MonochromeSprite`
 *    with the element's `color`, so one document is one colour; SVG-internal
 *    text is pixels, not text.
 * 3. **Full-colour raster** — an `<img>` with an SVG data URL takes GPUI's image
 *    path, which keeps every fill and gradient.
 *
 * The recipe the probe proves: bars from `div`s, one `<svg>` layer per line
 * series, labels as `<text>` siblings, and `<img>` + SVG for full-colour
 * artwork. Pixel colour and gradients remain screenshot evidence; every asserted
 * value here comes from bounds, the style report, painted text or AccessKit.
 *
 * Measured facts: plan `180` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { fieldText, nodeFor } from "../a11y.js";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const PLOT_WIDTH = 320;
const PLOT_HEIGHT = 148;
const BAR_WIDTH = 56;
const BAR_GAP = 16;
const LINE_WIDTH = 480;
const LINE_HEIGHT = 160;
const IMAGE_WIDTH = 480;
const IMAGE_HEIGHT = 120;

type SeriesColour = "primary" | "success" | "destructive";

interface Bar {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly role: SeriesColour;
}

const BARS: ReadonlyArray<Bar> = [
  { id: "alpha", label: "Jan", value: 96, role: "primary" },
  { id: "beta", label: "Feb", value: 64, role: "success" },
  { id: "gamma", label: "Mar", value: 32, role: "destructive" },
];

const LINE_PRIMARY = `<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_WIDTH}" height="${LINE_HEIGHT}" viewBox="0 0 ${LINE_WIDTH} ${LINE_HEIGHT}"><path d="M0 140 L120 70 L240 100 L360 30 L480 55" fill="none" stroke="#000" stroke-width="2"/><text x="8" y="24" font-size="12" fill="#000">svg-internal-label</text></svg>`;

const LINE_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_WIDTH}" height="${LINE_HEIGHT}" viewBox="0 0 ${LINE_WIDTH} ${LINE_HEIGHT}"><path d="M0 120 L120 110 L240 60 L360 80 L480 20" fill="none" stroke="#000" stroke-width="2"/></svg>`;

const CHART_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7cff"/><stop offset="1" stop-color="#4f7cff" stop-opacity="0"/></linearGradient><radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient></defs><rect x="0" y="0" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" fill="url(#fade)"/><rect x="200" y="0" width="140" height="${IMAGE_HEIGHT}" fill="url(#glow)"/><rect x="24" y="56" width="48" height="56" fill="#e5484d"/><rect x="96" y="28" width="48" height="84" fill="#30a46c"/></svg>`;

/** A percent-encoded data URL: the `<img>` decoder accepts it as `image/svg+xml`. */
const chartImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CHART_IMAGE_SVG)}`;

const ChartProbe = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState("series=none value=0");

  return (
    <div
      testId="chart-root"
      aria-id="chart-root"
      role="img"
      aria-label="Revenue by month"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: 520,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="chart-selected">{selected}</Readout>

      <div
        testId="chart-bars-plot"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: BAR_GAP,
          width: PLOT_WIDTH,
          height: PLOT_HEIGHT,
        }}
      >
        {Arr.map(BARS, (bar, index) => (
          <div
            key={bar.id}
            testId={`chart-bar-${index}`}
            role="button"
            aria-label={`${bar.label} ${bar.value}`}
            onClick={() => setSelected(`series=${bar.id} value=${bar.value}`)}
            style={{
              width: BAR_WIDTH,
              height: bar.value,
              backgroundColor: theme.colors[bar.role],
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: BAR_GAP,
          width: PLOT_WIDTH,
        }}
      >
        {Arr.map(BARS, (bar, index) => (
          <div
            key={bar.id}
            style={{
              display: "flex",
              flexDirection: "column",
              width: BAR_WIDTH,
            }}
          >
            <text
              testId={`chart-value-${index}`}
              style={{ color: theme.colors.foreground }}
            >
              {`${bar.value}`}
            </text>
            <text
              testId={`chart-label-${index}`}
              style={{ color: theme.colors.mutedForeground }}
            >
              {bar.label}
            </text>
          </div>
        ))}
      </div>

      <div
        testId="chart-line-plot"
        style={{
          position: "relative",
          width: LINE_WIDTH,
          height: LINE_HEIGHT,
        }}
      >
        <svg
          testId="chart-series-0"
          source={LINE_PRIMARY}
          style={{
            width: LINE_WIDTH,
            height: LINE_HEIGHT,
            color: theme.colors.primary,
          }}
        >
          <text testId="chart-svg-child">svg-child-text</text>
        </svg>
        <svg
          testId="chart-series-1"
          source={LINE_SUCCESS}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: LINE_WIDTH,
            height: LINE_HEIGHT,
            color: theme.colors.success,
          }}
        />
      </div>

      <img
        testId="chart-image"
        src={chartImage}
        alt="Revenue chart"
        style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}
      />
    </div>
  );
};

const dark = palettes.dark;

const painted = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Arr.some(ctx.host.paintedText(), (entry) => Str.includes(needle)(entry));

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const boundsOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

const styleColour = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.color,
  );

const background = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.backgroundColor,
  );

/** Asserts one `<svg>` layer's type and box, and returns the box. */
const layer = (ctx: Smoke.SmokeContext, testId: string) =>
  Effect.gen(function* () {
    yield* ctx.expectEqual(
      `${testId} element type`,
      Option.getOrElse(
        Option.fromNullishOr(ctx.host.elementType(testId)),
        () => "none",
      ),
      "svg",
    );
    const box = yield* boundsOf(ctx, testId);
    yield* ctx.expectNear(
      `${testId} keeps the plot width`,
      box.width,
      LINE_WIDTH,
      0.5,
    );
    yield* ctx.expectNear(
      `${testId} keeps the plot height`,
      box.height,
      LINE_HEIGHT,
      0.5,
    );
    return box;
  });

export const chartScenario: PlaygroundScenario = {
  id: "chart-svg",
  title: "Chart: bars from divs, one svg layer per series, img for colour",
  capability: "chart",
  view: () => <ChartProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const plot = yield* boundsOf(ctx, "chart-bars-plot");
      yield* ctx.expectNear(
        "the plot keeps its declared width",
        plot.width,
        PLOT_WIDTH,
        0.5,
      );
      yield* ctx.expectNear(
        "the plot keeps its declared height",
        plot.height,
        PLOT_HEIGHT,
        0.5,
      );

      yield* Effect.forEach(
        BARS,
        (bar, index) =>
          Effect.gen(function* () {
            const box = yield* boundsOf(ctx, `chart-bar-${index}`);
            yield* ctx.expectNear(
              `bar ${bar.id} keeps its width`,
              box.width,
              BAR_WIDTH,
              0.5,
            );
            yield* ctx.expectNear(
              `bar ${bar.id} paints its value as its height`,
              box.height,
              bar.value,
              0.5,
            );
            yield* ctx.expectNear(
              `bar ${bar.id} stands on the plot baseline`,
              box.y + box.height,
              plot.y + plot.height,
              0.5,
            );
            yield* ctx.expectEqual(
              `bar ${bar.id} paints its own series colour`,
              Option.getOrElse(background(ctx, `chart-bar-${index}`), () => ""),
              dark.colors[bar.role],
            );
          }),
        { concurrency: 1 },
      );

      const firstBar = yield* boundsOf(ctx, "chart-bar-0");
      const secondBar = yield* boundsOf(ctx, "chart-bar-1");
      const thirdBar = yield* boundsOf(ctx, "chart-bar-2");
      yield* ctx.expectNear(
        "bars advance by their width plus the gap",
        secondBar.x - firstBar.x,
        BAR_WIDTH + BAR_GAP,
        0.5,
      );
      yield* ctx.expectNear(
        "the third bar follows the same rule",
        thirdBar.x - secondBar.x,
        BAR_WIDTH + BAR_GAP,
        0.5,
      );

      ctx.host.click("chart-bar-1");
      yield* ctx.expectEqual(
        "a painted bar is hit-testable and selects its series",
        readout(ctx, "chart-selected"),
        "series=beta value=64",
      );

      yield* ctx.expectEqual(
        "a value label paints the measurement",
        readout(ctx, "chart-value-1"),
        "64",
      );
      yield* ctx.expectEqual(
        "axis labels are real text nodes",
        readout(ctx, "chart-label-0"),
        "Jan",
      );

      const tree = yield* ctx.expectSome(
        "the runtime painted an accessibility tree",
        Option.fromNullishOr(ctx.host.a11y()),
      );
      const root = yield* ctx.expectSome(
        "the chart is one named accessibility node",
        nodeFor(tree, "chart-root"),
      );
      yield* ctx.expectEqual(
        "the chart reports the image role",
        fieldText(root.role),
        "Image",
      );
      yield* ctx.expectEqual(
        "the chart carries its accessible name",
        fieldText(root.label),
        "Revenue by month",
      );

      const primaryLayer = yield* layer(ctx, "chart-series-0");
      const successLayer = yield* layer(ctx, "chart-series-1");
      yield* ctx.expectNear(
        "both series layers paint the same box",
        successLayer.x,
        primaryLayer.x,
        0.5,
      );
      yield* ctx.expectNear(
        "both series layers share a top edge",
        successLayer.y,
        primaryLayer.y,
        0.5,
      );
      yield* ctx.expectEqual(
        "the primary series layer is tinted by its own colour",
        Option.getOrElse(styleColour(ctx, "chart-series-0"), () => ""),
        dark.colors.primary,
      );
      yield* ctx.expectEqual(
        "the success series layer is tinted independently",
        Option.getOrElse(styleColour(ctx, "chart-series-1"), () => ""),
        dark.colors.success,
      );

      yield* ctx.expectEqual(
        "text authored inside the svg is rasterized, not addressable",
        painted(ctx, "svg-internal-label"),
        false,
      );
      yield* ctx.expectContains(
        "svg children stay in the retained tree",
        readout(ctx, "chart-svg-child"),
        "svg-child-text",
      );
      yield* ctx.expectEqual(
        "svg children are dropped from the paint",
        painted(ctx, "svg-child-text"),
        false,
      );

      yield* ctx.expectEqual(
        "the colour chart is retained",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.elementType("chart-image")),
          () => "none",
        ),
        "img",
      );
      const image = yield* boundsOf(ctx, "chart-image");
      yield* ctx.expectNear(
        "the colour chart keeps its declared width",
        image.width,
        IMAGE_WIDTH,
        0.5,
      );
      yield* ctx.expectNear(
        "the colour chart keeps its declared height",
        image.height,
        IMAGE_HEIGHT,
        0.5,
      );
      yield* ctx.expectEqual(
        "an svg data URL decodes as a colour image",
        painted(ctx, "img: load failed"),
        false,
      );
      yield* ctx.expectContains(
        "the colour source carries a linear gradient",
        chartImage,
        "linearGradient",
      );
      yield* ctx.expectContains(
        "the colour source carries a radial gradient",
        chartImage,
        "radialGradient",
      );
    }),
};
