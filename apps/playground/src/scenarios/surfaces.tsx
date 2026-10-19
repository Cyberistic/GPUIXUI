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
 * The image sources are measured separately (plan `586`): a data URL and
 * `setImagePixels` were the only evidence for years, while an `<img src>` can
 * also be a file path or an http(s) URL. Bytes uploaded through
 * `ImgInstance.setImage` are assertable; a path or URL load is **not** on the
 * offscreen renderer — `gpui::img(path|uri)`'s fallback text never reaches
 * `getPaintedText()` or the tree, there is no load/error event, and the
 * offscreen loader never settles. The path nodes therefore assert only their
 * box here. The **live** twin goes further (plan `690`): it decodes the frame
 * and samples the 1 × 1 red fixture in the path box, and proves the missing
 * path and refused URL boxes do not paint it, so the path/http(s) route is
 * pixel evidence in a window while the offscreen limitation stands.
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
 * Measured facts: plan `161` §8 (surfaces) and plan `586` §2/§9 (sources).
 */
import { useLayoutEffect, useRef, useState } from "react";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type { ImgInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";

/** A 1 × 1 red RGBA pixel, verified by `file` as `PNG image data, 1 x 1`. */
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** The same pixel as a data URL: the decoded-image source. */
const ONE_PIXEL_PNG = `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`;

/** The same pixel as bytes: what `setImage` takes. */
const ONE_PIXEL_PNG_BYTES = Schema.decodeUnknownSync(
  Schema.Uint8ArrayFromBase64,
)(ONE_PIXEL_PNG_BASE64);

/**
 * The same pixel as a real file, for the path source.
 *
 * `src/scenarios/` and `dist/scenarios/` are both two directories below
 * `apps/playground/`, so `../../fixtures` resolves to
 * `apps/playground/fixtures/` in the app and in the built runner.
 */
const ONE_PIXEL_PNG_PATH = fileURLToPath(
  new URL("../../fixtures/one-pixel.png", import.meta.url),
);

/** A path no decoder can open: the runtime logs and paints nothing text-wise. */
const MISSING_PNG_PATH = fileURLToPath(
  new URL("../../fixtures/does-not-exist.png", import.meta.url),
);

/** Bytes no decoder claims, so `setImage` throws at the boundary. */
const NOT_AN_IMAGE = new Uint8Array([1, 2, 3, 4]);

/** A refused connection: the http(s) branch, with no server in the test. */
const REFUSED_IMAGE_URL = "https://127.0.0.1:1/none.png";

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

/** How the probe draws an image-source case; one size keeps the boxes comparable. */
const SOURCE_SIZE = 48;

/** Caption under an image source, in the probe's muted colour. */
const Caption = ({
  testId,
  children,
  tone,
}: {
  readonly testId?: string;
  readonly children: string;
  readonly tone: string;
}) => (
  <text testId={testId} style={{ color: tone, fontSize: 11 }}>
    {children}
  </text>
);

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

/**
 * Uploads bytes through the image ref: the documented dynamic path.
 *
 * `setImage` throws on bytes no decoder claims, so the boundary catches it and
 * paints the message. The readout is the assertion; the fallback under the
 * image is the runtime's own (`img: no src`) and stays there when the upload
 * fails.
 */
const BytesImage = ({
  testId,
  bytes,
  tone,
}: {
  readonly testId: string;
  readonly bytes: Uint8Array;
  readonly tone: string;
}) => {
  const image = useRef<ImgInstance>(null);
  const [state, setState] = useState("pending");
  useLayoutEffect(() => {
    // The runtime throws across the napi boundary on undecodable bytes; that
    // is the one failure a caller must handle, so it is recorded, not hidden.
    // (A React layout effect is a boundary; there is no Effect to lift into.)
    try {
      image.current?.setImage(bytes);
      setState("ok");
    } catch (error) {
      setState(`error: ${String(error)}`);
    }
  }, [bytes]);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 2, width: 96 }}
    >
      <img
        ref={image}
        testId={testId}
        style={{ width: SOURCE_SIZE, height: SOURCE_SIZE }}
      />
      <Caption testId={`${testId}-state`} tone={tone}>
        {state}
      </Caption>
    </div>
  );
};

/** A path/URL source: only the box is assertable (plan `586` §2). */
const SourceImage = ({
  testId,
  src,
  caption,
  tone,
}: {
  readonly testId: string;
  readonly src: string;
  readonly caption: string;
  readonly tone: string;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 96 }}>
    <img
      testId={testId}
      src={src}
      style={{ width: SOURCE_SIZE, height: SOURCE_SIZE }}
    />
    <Caption tone={tone}>{caption}</Caption>
  </div>
);

const SurfacesProbe = ({
  liveSources = false,
}: {
  readonly liveSources?: boolean;
}) => {
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
      <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
        <BytesImage
          testId="surface-img-bytes"
          bytes={ONE_PIXEL_PNG_BYTES}
          tone={theme.colors.mutedForeground}
        />
        <BytesImage
          testId="surface-img-bytes-bad"
          bytes={NOT_AN_IMAGE}
          tone={theme.colors.mutedForeground}
        />
        <SourceImage
          testId="surface-img-path"
          src={ONE_PIXEL_PNG_PATH}
          caption="path"
          tone={theme.colors.mutedForeground}
        />
        <SourceImage
          testId="surface-img-path-missing"
          src={MISSING_PNG_PATH}
          caption="missing path"
          tone={theme.colors.mutedForeground}
        />
        {liveSources ? (
          <SourceImage
            testId="surface-img-url-refused"
            src={REFUSED_IMAGE_URL}
            caption="refused url"
            tone={theme.colors.mutedForeground}
          />
        ) : null}
      </div>
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

/** The live twin's view: the same probe plus the http(s) source. */
export const liveSurfacesView = () => <SurfacesProbe liveSources />;

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

/** A readout node's text, or `""` when it never mounted. */
const stateText = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

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
        "the empty-src and failed-bytes nodes paint the no-src fallback",
        occurrences(ctx, "img: no src"),
        2,
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

      // 4. The image sources (plan `586`): bytes are assertable; a path is not.
      yield* type(ctx, "surface-img-bytes", "img");
      const bytes = yield* painted(ctx, "surface-img-bytes");
      yield* ctx.expectNear("the bytes-upload box width", bytes.width, 48, 0.5);
      yield* ctx.expectNear(
        "the bytes-upload box height",
        bytes.height,
        48,
        0.5,
      );
      yield* ctx.expectEqual(
        "a valid byte upload reports success",
        stateText(ctx, "surface-img-bytes-state"),
        "ok",
      );

      yield* type(ctx, "surface-img-bytes-bad", "img");
      const badBytes = yield* painted(ctx, "surface-img-bytes-bad");
      // The fallback surface has a 1 px border per axis (the plan-529 box rule).
      yield* ctx.expectNear(
        "the failed byte upload keeps the fallback box",
        badBytes.width,
        46,
        0.5,
      );
      yield* ctx.expectNear(
        "the failed byte upload keeps the fallback height",
        badBytes.height,
        46,
        0.5,
      );
      yield* ctx.expectContains(
        "an undecodable byte buffer reports the runtime's throw",
        stateText(ctx, "surface-img-bytes-bad-state"),
        "unrecognized image format",
      );

      // A path source loads asynchronously with no load/error event, so the
      // offscreen renderer only proves the box. Measured in plan `586` §2: the
      // GPUI fallback for a path/URL is not a retained text node and is absent
      // from `getPaintedText()`; the live twin carries the screenshot.
      yield* type(ctx, "surface-img-path", "img");
      const path = yield* painted(ctx, "surface-img-path");
      yield* ctx.expectNear("the path-source box width", path.width, 48, 0.5);
      yield* type(ctx, "surface-img-path-missing", "img");
      const missing = yield* painted(ctx, "surface-img-path-missing");
      yield* ctx.expectNear(
        "the missing-path box width",
        missing.width,
        48,
        0.5,
      );
      yield* ctx.expectEqual(
        "a path source paints no fallback text the harness can see",
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
