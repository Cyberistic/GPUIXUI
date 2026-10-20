/**
 * `qr-code` — the Tier 5 QR rendering probe (plan `518`).
 *
 * A QR is a matrix of dark modules. Three routes are possible on 0.10.0, and
 * the probe measures all three against the same fixture:
 *
 * 1. one absolutely positioned `div` per dark module — exact geometry, token
 *    colour and a real hit target, but one retained host node per module;
 * 2. one sourced `<svg>` — a single node, but an **alpha mask tinted by the
 *    element's `color`** (plan `180`), so the quiet zone is the container;
 * 3. one `<img>` with an SVG data URL — a single node and the full-colour path,
 *    so the quiet zone can be baked in and the code stays two-colour.
 *
 * The fixtures are real encoder output (Python `qrcode` 7.4.2, EC level M) and
 * are **renderer fixtures, not an encoder**. Scannability is still not asserted:
 * there is no decoder on this host. What plan `708` does assert is the sampled
 * precondition — every module centre in the decoded frame reconstructs the
 * authored matrix, inside a four-module quiet zone, on both the `div` route and
 * the full-colour `<img>` route.
 *
 * Measured facts: plan `518` §8, plan `708` §3.
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
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { captureHeadless, readSync } from "./frames.js";
import { qrFrameChecks } from "./qr-pixels.js";
import { QR_V1, QR_V4 } from "./qr-fixtures.js";
import {
  darkModules,
  dataUrl,
  matrixSize,
  moduleOrigin,
  svgSource,
} from "./qr-layout.js";

type QrMode = "div" | "svg" | "img";
type QrVersion = "v1" | "v4";

/** v1 at 6 px modules, v4 at 4 px: the quiet zone is always 4 modules. */
const SPECS = {
  v1: { module: 6, quiet: 4 },
  v4: { module: 4, quiet: 4 },
} as const;

const dark = palettes.dark;

const QrProbe = () => {
  const theme = useTheme();
  const [mode, setMode] = useState<QrMode>("div");
  const [version, setVersion] = useState<QrVersion>("v1");
  const [hit, setHit] = useState("none");

  const fixture = version === "v1" ? QR_V1 : QR_V4;
  const spec = SPECS[version];
  const modules = darkModules(fixture.matrix);
  const size = matrixSize(fixture.matrix, spec);
  const mask = svgSource(fixture.matrix, spec, Option.none());
  const image = dataUrl(
    svgSource(fixture.matrix, spec, Option.some("#ffffff")),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        width: 520,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {Arr.map(
          [
            { id: "div", label: "modules" },
            { id: "svg", label: "svg" },
            { id: "img", label: "image" },
          ] as const,
          (option) => (
            <Pressable
              key={option.id}
              testId={`qr-mode-${option.id}`}
              onClick={() => setMode(option.id)}
            >
              <text style={{ color: theme.colors.foreground }}>
                {option.label}
              </text>
            </Pressable>
          ),
        )}
        <Pressable
          testId="qr-version"
          onClick={() =>
            setVersion((current) => (current === "v1" ? "v4" : "v1"))
          }
        >
          <text
            style={{ color: theme.colors.foreground }}
          >{`version ${version}`}</text>
        </Pressable>
      </div>

      <Readout testId="qr-state">
        {`mode=${mode} version=${version} dark=${modules.length} size=${size} hit=${hit}`}
      </Readout>
      <Readout testId="qr-hit">{`hit=${hit}`}</Readout>

      <div
        testId="qr-root"
        aria-id="qr-root"
        role="img"
        aria-label={`QR code for ${fixture.payload}`}
      >
        <div
          testId="qr-matrix"
          style={{
            position: "relative",
            width: size,
            height: size,
            backgroundColor: theme.colors.background,
          }}
        >
          {mode === "div" ? (
            Arr.map(modules, ({ row, col }) => {
              const box = moduleOrigin(row, col, spec);
              return (
                <div
                  key={`${row}-${col}`}
                  testId={`qr-dot-${row}-${col}`}
                  onClick={() => setHit(`r${row}c${col}`)}
                  style={{
                    position: "absolute",
                    left: box.x,
                    top: box.y,
                    width: box.size,
                    height: box.size,
                    backgroundColor: theme.colors.foreground,
                  }}
                />
              );
            })
          ) : mode === "svg" ? (
            <svg
              testId="qr-svg"
              source={mask}
              style={{
                width: size,
                height: size,
                color: theme.colors.foreground,
              }}
            />
          ) : (
            <img
              testId="qr-img"
              src={image}
              alt={`QR code for ${fixture.payload}`}
              style={{ width: size, height: size }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const typeOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.elementType(testId)),
    () => "none",
  );

const boundsOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

const retained = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the host reports its retained tree",
    Option.fromNullishOr(ctx.host.retainedElements()),
  );

const styleOf = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.backgroundColor,
  );

const colourOf = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.color,
  );

export const qrScenario: PlaygroundScenario = {
  id: "qr-code",
  title: "QR code: module grid, svg mask, img data URL and the node cost",
  capability: "qr",
  view: () => <QrProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The module grid: box, quiet zone, module origin, colour.
      const matrix = yield* boundsOf(ctx, "qr-matrix");
      yield* ctx.expectNear(
        "the v1 matrix keeps its box",
        matrix.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the v1 matrix keeps its height",
        matrix.height,
        174,
        0.5,
      );

      const corner = yield* boundsOf(ctx, "qr-dot-0-0");
      yield* ctx.expectNear(
        "the quiet zone offsets x",
        corner.x - matrix.x,
        24,
        0.5,
      );
      yield* ctx.expectNear(
        "the quiet zone offsets y",
        corner.y - matrix.y,
        24,
        0.5,
      );
      yield* ctx.expectNear("a module keeps its size", corner.width, 6, 0.5);

      const next = yield* boundsOf(ctx, "qr-dot-0-1");
      yield* ctx.expectNear(
        "a module advances by its size on x",
        next.x - corner.x,
        6,
        0.5,
      );
      const rightFinder = yield* boundsOf(ctx, "qr-dot-0-6");
      yield* ctx.expectNear(
        "the top-right finder starts",
        rightFinder.x - matrix.x,
        60,
        0.5,
      );
      const lowerFinder = yield* boundsOf(ctx, "qr-dot-6-0");
      yield* ctx.expectNear(
        "the bottom-left finder starts",
        lowerFinder.y - matrix.y,
        60,
        0.5,
      );
      const centre = yield* boundsOf(ctx, "qr-dot-3-3");
      yield* ctx.expectNear(
        "the finder centre is at (42, 42)",
        centre.x - matrix.x,
        42,
        0.5,
      );
      yield* ctx.expectNear(
        "the finder centre is at (42, 42)",
        centre.y - matrix.y,
        42,
        0.5,
      );

      yield* ctx.expectEqual(
        "a light module has no node",
        typeOf(ctx, "qr-dot-1-1"),
        "none",
      );
      yield* ctx.expectEqual(
        "a light module paints nothing",
        ctx.host.bounds("qr-dot-1-1") === null,
        true,
      );

      yield* ctx.expectEqual(
        "a module paints the foreground role",
        Option.getOrElse(styleOf(ctx, "qr-dot-0-0"), () => ""),
        dark.colors.foreground,
      );
      yield* ctx.expectEqual(
        "the matrix paints the background role",
        Option.getOrElse(styleOf(ctx, "qr-matrix"), () => ""),
        dark.colors.background,
      );

      ctx.host.click("qr-dot-3-3");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a module is a real hit target",
        readout(ctx, "qr-hit"),
        "hit=r3c3",
      );
      yield* ctx.expectContains(
        "the model and the fixture agree on the dark count",
        readout(ctx, "qr-state"),
        "dark=226",
      );

      // 2. The composed matrix is one named accessibility node.
      const tree = yield* ctx.expectSome(
        "the accessibility tree is reported",
        Option.fromNullishOr(ctx.host.a11y()),
      );
      const root = yield* ctx.expectSome(
        "the QR is an accessibility node",
        nodeFor(tree, "qr-root"),
      );
      yield* ctx.expectEqual(
        "the QR role is Image",
        fieldText(root.role),
        "Image",
      );
      yield* ctx.expectEqual(
        "the QR is named for its payload",
        fieldText(root.label),
        `QR code for ${QR_V1.payload}`,
      );

      // 3. Pixels: the frame's module centres are the authored matrix.
      const divFrame = yield* captureHeadless(ctx.host);
      const divRows = yield* qrFrameChecks(ctx, readSync(ctx.host), divFrame, {
        label: "the module grid",
        matrix: QR_V1.matrix,
        spec: SPECS.v1,
        dark: dark.colors.foreground,
        light: dark.colors.background,
      });

      // 4. Cost: one retained node per dark module.
      const divNodes = yield* retained(ctx);
      ctx.host.click("qr-mode-svg");
      ctx.host.advance(0);
      const svgNodes = yield* retained(ctx);
      yield* ctx.expectEqual(
        "the module grid costs one node per dark module",
        divNodes - svgNodes,
        darkModules(QR_V1.matrix).length - 1,
      );

      // 5. The single tinted SVG mask.
      yield* ctx.expectEqual(
        "the svg route is one svg node",
        typeOf(ctx, "qr-svg"),
        "svg",
      );
      const svgBox = yield* boundsOf(ctx, "qr-svg");
      yield* ctx.expectNear(
        "the svg keeps the matrix width",
        svgBox.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the svg keeps the matrix height",
        svgBox.height,
        174,
        0.5,
      );
      yield* ctx.expectEqual(
        "the svg mask takes the foreground tint",
        Option.getOrElse(colourOf(ctx, "qr-svg"), () => ""),
        dark.colors.foreground,
      );
      yield* ctx.expectEqual(
        "the svg route has no module nodes",
        typeOf(ctx, "qr-dot-3-3"),
        "none",
      );

      // 6. The full-colour image route is also one node.
      ctx.host.click("qr-mode-img");
      ctx.host.advance(0);
      const imgNodes = yield* retained(ctx);
      yield* ctx.expectEqual(
        "the image route costs the same one node",
        imgNodes,
        svgNodes,
      );
      yield* ctx.expectEqual(
        "the data URL paints as an img node",
        typeOf(ctx, "qr-img"),
        "img",
      );
      const imgBox = yield* boundsOf(ctx, "qr-img");
      yield* ctx.expectNear(
        "the image keeps the matrix width",
        imgBox.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the image keeps the matrix height",
        imgBox.height,
        174,
        0.5,
      );
      yield* ctx.expectEqual(
        "the data URL decodes without a load fallback",
        Arr.some(ctx.host.paintedText(), Str.includes("img: load failed")),
        false,
      );
      yield* ctx.expectEqual(
        "the data URL has a source",
        Arr.some(ctx.host.paintedText(), Str.includes("img: no src")),
        false,
      );

      // 7. Pixels: the single-node route paints the same code, in its own
      // two colours (`#000` on `#fff`, baked into the SVG).
      const imgFrame = yield* captureHeadless(ctx.host);
      const imgRows = yield* qrFrameChecks(ctx, readSync(ctx.host), imgFrame, {
        label: "the image route",
        matrix: QR_V1.matrix,
        spec: SPECS.v1,
        dark: "#000000",
        light: "#ffffff",
      });
      yield* ctx.expectEqual(
        "the image route and the module grid paint the same matrix",
        Arr.join(imgRows, "\n"),
        Arr.join(divRows, "\n"),
      );

      // 8. Switching back leaves no residue, and version 4 scales the cost.
      ctx.host.click("qr-mode-div");
      ctx.host.advance(0);
      const restored = yield* retained(ctx);
      yield* ctx.expectEqual(
        "the module grid remounts exactly",
        restored,
        divNodes,
      );

      ctx.host.click("qr-version");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the version toggle swaps the fixture",
        readout(ctx, "qr-state"),
        "dark=591",
      );
      const v4 = yield* boundsOf(ctx, "qr-matrix");
      yield* ctx.expectNear("the v4 matrix keeps its box", v4.width, 164, 0.5);
      const v4Corner = yield* boundsOf(ctx, "qr-dot-0-0");
      yield* ctx.expectNear(
        "the v4 quiet zone is exact",
        v4Corner.x - v4.x,
        16,
        0.5,
      );
      yield* ctx.expectNear(
        "a v4 module keeps its size",
        v4Corner.width,
        4,
        0.5,
      );
      const v4Nodes = yield* retained(ctx);
      yield* ctx.expectEqual(
        "retention scales with the dark-module count",
        v4Nodes - restored,
        darkModules(QR_V4.matrix).length - darkModules(QR_V1.matrix).length,
      );

      ctx.host.screenshot("apps/playground/.artifacts/screenshots/qr-code.png");
    }),
};
