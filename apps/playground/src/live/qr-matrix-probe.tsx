/**
 * The `qr-matrix` probe: one version-1 QR symbol painted twice — a grid of
 * filled `div`s and one tinted `<svg>` mask — read back out of a window.
 *
 * Tier 5's **QR code** row said the runtime provides both routes and left the
 * claim unmeasured (`?`). The probe paints a fixed 21×21 matrix with a
 * four-module quiet zone at 6 points per module (174×174), scans every cell of
 * the 29×29 field from one capture, and compares the two routes pixel for
 * pixel. The encoder is the caller's: a matrix is data, and the runtime's part
 * is only whether a module grid paints.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { contrastRatio, textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import type { ReactNode } from "react";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale, colourAt, distanceFrom, differs } from "./frame.js";
import {
  QR_IDS,
  QR_INK_HEX,
  QR_PAPER_HEX,
  QR_SIDE,
  qrCellCentre,
  qrDarkCells,
  qrInkPixels,
  qrMismatches,
  qrModuleBox,
  qrPaperPixels,
  qrQuietCorners,
  qrReadout,
  qrSvgMarkup,
} from "./qr-matrix.js";

/** A capture needs a frame after the layout settles. */
const SETTLE = Duration.millis(40);

/** The capture a reader can look at. */
const FRAME = "qr-matrix";

/** One wrapper of the symbol's own box, in its paper colour. */
const QrFrame = ({
  id,
  children,
}: {
  readonly id: string;
  readonly children?: ReactNode;
}) => (
  <div
    testId={id}
    style={{
      position: "relative",
      width: QR_SIDE,
      height: QR_SIDE,
      backgroundColor: QR_PAPER_HEX,
    }}
  >
    {children}
  </div>
);

/** The probe's window: the same matrix as a module grid and as one svg mask. */
export const QrMatrixProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  return (
    <div
      testId={QR_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A 21×21 QR matrix painted twice: a grid of dark modules and one tinted
        svg mask, each on a four-module paper quiet zone. Both routes must paint
        every module, and the same ones.
      </text>
      <Readout testId={QR_IDS.readout}>{qrReadout()}</Readout>
      <div style={{ display: "flex", gap: theme.spacing.lg }}>
        <QrFrame id={QR_IDS.grid}>
          {Arr.map(qrDarkCells(), (cell) => {
            const box = qrModuleBox(cell.row, cell.col);
            return (
              <div
                key={`${cell.row}-${cell.col}`}
                style={{
                  position: "absolute",
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                  backgroundColor: QR_INK_HEX,
                }}
              />
            );
          })}
        </QrFrame>
        <QrFrame id={QR_IDS.svg}>
          <svg
            testId={QR_IDS.svgMask}
            source={qrSvgMarkup()}
            style={{ width: QR_SIDE, height: QR_SIDE, color: QR_INK_HEX }}
          />
        </QrFrame>
      </div>
    </div>
  );
};

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

/** Whether a sampled pixel is ink rather than paper, by the nearer colour. */
const isInk = (
  ink: Pixels.Rgba,
  paper: Pixels.Rgba,
  sample: Pixels.Rgba,
): boolean => distanceFrom(sample, ink) < distanceFrom(sample, paper);

export const qrMatrixSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(QR_IDS.grid);
    yield* Effect.sleep(SETTLE);

    const readout = yield* ctx.host.text(QR_IDS.readout);
    yield* ctx.expectEqual(
      "the probe prints the matrix it paints",
      readout,
      qrReadout(),
    );

    const gridBounds = yield* paintedBox(ctx, QR_IDS.grid);
    const svgBounds = yield* paintedBox(ctx, QR_IDS.svg);
    const maskBounds = yield* paintedBox(ctx, QR_IDS.svgMask);

    yield* ctx.expectNear(
      "the module grid paints the symbol's width",
      gridBounds.width,
      QR_SIDE,
      1,
    );
    yield* ctx.expectNear(
      "the module grid paints the symbol's height",
      gridBounds.height,
      QR_SIDE,
      1,
    );
    yield* ctx.expectNear(
      "the svg frame paints the symbol's width",
      svgBounds.width,
      QR_SIDE,
      1,
    );
    yield* ctx.expectNear(
      "the svg frame paints the symbol's height",
      svgBounds.height,
      QR_SIDE,
      1,
    );
    yield* ctx.expectNear(
      "the svg mask paints the frame's own width",
      maskBounds.width,
      QR_SIDE,
      1,
    );
    yield* ctx.expectNear(
      "the svg mask paints the frame's own height",
      maskBounds.height,
      QR_SIDE,
      1,
    );

    yield* ctx.host.capture(FRAME);
    const frame = yield* ctx.host.pixels(FRAME);
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    const ink = yield* ctx.expectSome(
      "the QR ink is a colour a capture can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(QR_INK_HEX)),
    );
    const paper = yield* ctx.expectSome(
      "the QR paper is a colour a capture can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(QR_PAPER_HEX)),
    );

    /** The captured pixels inside a route's own painted box. */
    const inside = (box: Smoke.Bounds): Option.Option<Pixels.Pixels> =>
      Option.fromNullishOr(
        Pixels.crop(frame, {
          x: Math.round(box.x * scale),
          y: Math.round(box.y * scale),
          width: Math.round(box.width * scale),
          height: Math.round(box.height * scale),
        }),
      );

    /** How many of a route's scanned cells disagree with the matrix. */
    const mismatches = (crop: Pixels.Pixels): number =>
      qrMismatches((row, col) => {
        const centre = qrCellCentre(row, col);
        return Option.map(
          colourAt(crop, { x: centre.x, y: centre.y }, scale),
          (sample) => isInk(ink, paper, sample),
        );
      });

    /** The quiet zone's four corners, read as paper on one route. */
    const quiet = (crop: Pixels.Pixels): boolean =>
      Arr.every(qrQuietCorners, ({ row, col }) =>
        Option.match(colourAt(crop, qrCellCentre(row, col), scale), {
          onNone: () => false,
          onSome: (sample) => !isInk(ink, paper, sample),
        }),
      );

    const grid = yield* ctx.expectSome(
      "the capture holds the module grid's own box",
      inside(gridBounds),
    );
    const svg = yield* ctx.expectSome(
      "the capture holds the svg mask's own box",
      inside(svgBounds),
    );

    yield* ctx.expectEqual(
      "every cell of the module grid's field is the module the matrix names",
      mismatches(grid),
      0,
    );
    yield* ctx.expectEqual(
      "every cell of the svg mask's field is the module the matrix names",
      mismatches(svg),
      0,
    );
    yield* ctx.expectEqual(
      "the module grid paints the ink its dark modules cover",
      Pixels.countColour(grid, ink),
      qrInkPixels(scale),
    );
    yield* ctx.expectEqual(
      "the svg mask paints the ink its dark modules cover",
      Pixels.countColour(svg, ink),
      qrInkPixels(scale),
    );
    yield* ctx.expectEqual(
      "the module grid leaves its quiet zone and light modules in the paper",
      Pixels.countColour(grid, paper),
      qrPaperPixels(scale),
    );
    yield* ctx.expectEqual(
      "the svg mask leaves its quiet zone and light modules in the paper",
      Pixels.countColour(svg, paper),
      qrPaperPixels(scale),
    );
    yield* ctx.expectEqual(
      "the module grid's quiet zone is paper at all four corners",
      quiet(grid),
      true,
    );
    yield* ctx.expectEqual(
      "the svg mask's quiet zone is paper at all four corners",
      quiet(svg),
      true,
    );
    yield* ctx.expectEqual(
      "both routes paint the same pixels",
      yield* ctx.expectSome(
        "the two routes' boxes are the same size",
        Option.fromNullishOr(Pixels.countDifferingPixels(grid, svg)),
      ),
      0,
    );

    // 5. The symbol is dark on light whatever the page wears, and the pair is
    //    far above the contrast a scanner needs.
    const ratio = yield* ctx.expectSome(
      "the ink and paper have a contrast ratio",
      Option.fromNullishOr(contrastRatio(QR_INK_HEX, QR_PAPER_HEX)),
    );
    yield* ctx.expectEqual(
      "the ink and paper clear the contrast a symbol needs",
      ratio >= 7,
      true,
    );
    yield* ctx.expectEqual(
      "the ink is the symbol's own dark, not the page's foreground",
      differs(
        ink,
        yield* ctx.expectSome(
          "the page theme reports a foreground",
          Option.fromNullishOr(
            Pixels.hexToRgba(palettes.dark.colors.foreground),
          ),
        ),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the paper is the symbol's own white, not the page's background",
      differs(
        paper,
        yield* ctx.expectSome(
          "the page theme reports a background",
          Option.fromNullishOr(
            Pixels.hexToRgba(palettes.dark.colors.background),
          ),
        ),
      ),
      true,
    );

    yield* ctx.host.capture(FRAME);
  });
