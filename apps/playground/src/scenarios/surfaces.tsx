/**
 * `native-surfaces` — `<svg>`, `<img>`, `<diff>` and the `<canvas>` trap.
 *
 * Icons, image preview and the diff viewer rest on element types no scenario
 * had measured, and `<canvas>` is typed in the JSX runtime while the runtime
 * registers no factory for it. The probe answers both with a run: which types
 * the tree retains, which of them paint (`getElementBounds` fires from GPUI's
 * `on_painted`, so bounds are paint evidence), and what `<canvas>` does to its
 * children.
 *
 * The trap, measured: `<canvas>` is retained as a node, paints nothing, has no
 * bounds, and discards its children from the paint log. Charts and the colour
 * picker's SV square cannot be built on it here; `<svg>` and `<img>` are the
 * honest alternatives.
 *
 * Two limits this scenario records rather than hides: there is no pixel
 * readback, so `getPaintedText` and bounds are the strongest evidence a leaf
 * paint leaves, and a *sourced* `<svg>` and an empty one lay out identically.
 * A valid `<img>` data URL is proven accepted (no invalid-source fallback) and
 * laid out; whether GPUI decoded the bitmap is visible only in the artifact.
 *
 * Measured facts: plan `161` §8.
 */
import { useLayoutEffect, useRef } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { ImgInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";

/** A 1 × 1 transparent PNG, verified by `file` as `PNG image data, 1 x 1`. */
const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** A data URL whose MIME type no decoder claims: `ImgSource::Invalid`. */
const INVALID_IMAGE = "data:image/nope;base64,AAAA";

const SEARCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

const PATCH = [
  "diff --git a/example.ts b/example.ts",
  "--- a/example.ts",
  "+++ b/example.ts",
  "@@ -1,2 +1,2 @@",
  "-const removed = 1",
  "+const added = 1",
].join("\n");

/** Uploads raw RGBA through the image ref: the binary path, no JSON. */
const LiveImage = ({
  testId,
  width,
  height,
}: {
  readonly testId: string;
  readonly width: number;
  readonly height: number;
}) => {
  const image = useRef<ImgInstance>(null);
  useLayoutEffect(() => {
    const pixels = new Uint8Array(width * height * 4);
    Arr.forEach(Arr.range(0, width * height - 1), (pixel) => {
      pixels[pixel * 4] = 90;
      pixels[pixel * 4 + 1] = 122;
      pixels[pixel * 4 + 2] = 246;
      pixels[pixel * 4 + 3] = 255;
    });
    image.current?.setImagePixels(width, height, pixels);
  }, [width, height]);
  return (
    <img
      ref={image}
      testId={testId}
      style={{ width: width * 16, height: height * 16 }}
    />
  );
};

const SurfacesProbe = () => {
  const theme = useTheme();
  const column = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    padding: 8,
    width: 680,
    backgroundColor: theme.colors.background,
  } as const;

  return (
    <div style={column}>
      <svg
        testId="surface-svg"
        source={SEARCH_SVG}
        style={{ width: 48, height: 48, color: theme.colors.foreground }}
      />
      <img
        testId="surface-img-empty"
        style={{ width: 96, height: 64, backgroundColor: theme.colors.muted }}
      />
      <img
        testId="surface-img-invalid"
        src={INVALID_IMAGE}
        alt="invalid"
        style={{ width: 96, height: 64 }}
      />
      <img
        testId="surface-img-data"
        src={ONE_PIXEL_PNG}
        style={{ width: 64, height: 64 }}
      />
      <LiveImage testId="surface-img-live" width={2} height={2} />
      <diff
        testId="surface-diff"
        patch={PATCH}
        style={{ width: 640, color: theme.colors.foreground }}
      />
      <canvas testId="surface-canvas" style={{ width: 80, height: 80 }}>
        <text style={{ color: theme.colors.foreground }}>canvas-child</text>
      </canvas>
    </div>
  );
};

/** Asserts a `testId`'s retained element type. */
const type = (ctx: Smoke.SmokeContext, testId: string, expected: string) =>
  Effect.gen(function* () {
    const actual = yield* ctx.expectSome(
      `${testId} is retained`,
      Option.fromNullishOr(ctx.host.elementType(testId)),
    );
    yield* ctx.expectEqual(`${testId} element type`, actual, expected);
  });

/** Asserts a `testId` is painted, and returns its box. */
const painted = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

/** How many painted strings contain `needle`. */
const occurrences = (ctx: Smoke.SmokeContext, needle: string): number =>
  Arr.length(
    Arr.filter(ctx.host.paintedText(), (entry) => Str.includes(needle)(entry)),
  );

export const nativeSurfacesScenario: PlaygroundScenario = {
  id: "native-surfaces",
  title: "Native content surfaces: svg, img, diff and canvas",
  capability: "content",
  view: () => <SurfacesProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* type(ctx, "surface-svg", "svg");
      const svg = yield* painted(ctx, "surface-svg");
      yield* ctx.expectNear(
        "the icon keeps its declared width",
        svg.width,
        48,
        0.5,
      );
      yield* ctx.expectNear(
        "the icon keeps its declared height",
        svg.height,
        48,
        0.5,
      );

      yield* type(ctx, "surface-img-empty", "img");
      const empty = yield* painted(ctx, "surface-img-empty");
      // An <img> loses 1 px per axis in the 0.10.0 tracker (plan 529 §6.3).
      yield* ctx.expectNear("the no-src box width", empty.width, 94, 0.5);
      yield* ctx.expectNear("the no-src box height", empty.height, 62, 0.5);
      yield* ctx.expectEqual(
        "a missing src paints its own fallback",
        occurrences(ctx, "img: no src"),
        1,
      );

      yield* type(ctx, "surface-img-invalid", "img");
      yield* ctx.expectEqual(
        "an undecodable data URL paints the load-failure fallback",
        occurrences(ctx, "img: load failed"),
        1,
      );

      yield* type(ctx, "surface-img-data", "img");
      const data = yield* painted(ctx, "surface-img-data");
      yield* ctx.expectNear("the data-URL box width", data.width, 64, 0.5);
      yield* ctx.expectNear("the data-URL box height", data.height, 64, 0.5);
      yield* ctx.expectEqual(
        "a valid data URL adds no fallback",
        occurrences(ctx, "img: load failed"),
        1,
      );

      yield* type(ctx, "surface-img-live", "img");
      const live = yield* painted(ctx, "surface-img-live");
      yield* ctx.expectNear("the ref-uploaded box width", live.width, 32, 0.5);
      yield* ctx.expectNear(
        "the ref-uploaded box height",
        live.height,
        32,
        0.5,
      );
      yield* ctx.expectEqual(
        "pixels uploaded through the ref add no fallback",
        occurrences(ctx, "img: load failed"),
        1,
      );

      yield* type(ctx, "surface-diff", "diff");
      const diff = yield* painted(ctx, "surface-diff");
      yield* ctx.expectNear(
        "the diff keeps its declared width",
        diff.width,
        640,
        0.5,
      );
      yield* ctx.expectEqual(
        "the diff has a painted height",
        diff.height > 0,
        true,
      );
      const text = Arr.join(ctx.host.paintedText(), "\n");
      yield* ctx.expectContains(
        "the diff paints its file header",
        text,
        "example.ts",
      );
      yield* ctx.expectContains(
        "the diff paints its hunk header",
        text,
        "@@ -1,2 +1,2 @@",
      );
      yield* ctx.expectContains(
        "the diff paints an added line",
        text,
        "const added = 1",
      );
      yield* ctx.expectContains(
        "the diff paints a removed line",
        text,
        "const removed = 1",
      );

      yield* type(ctx, "surface-canvas", "canvas");
      yield* ctx.expectEqual(
        "canvas paints nothing, so it has no bounds",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("surface-canvas"))),
        true,
      );
      yield* ctx.expectContains(
        "canvas keeps its child in the retained tree",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("surface-canvas")),
          () => "",
        ),
        "canvas-child",
      );
      yield* ctx.expectEqual(
        "canvas drops its child from the paint log",
        Arr.some(ctx.host.paintedText(), (entry) =>
          Str.includes("canvas-child")(entry),
        ),
        false,
      );
    }),
};
