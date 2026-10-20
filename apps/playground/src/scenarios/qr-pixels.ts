/**
 * QR pixels: what a decoder would sample, read back from the frame.
 *
 * The geometry probe (plan `518`/`599`) proves where the modules are. This
 * proves what each module centre paints, by reconstructing the matrix from the
 * decoded frame and comparing it with the authored fixture. It is still not a
 * decoder: there is no barcode reader on this host. The claim is the
 * precondition — the sampled module grid **is** the authored matrix, inside a
 * four-module quiet zone — not that a scanner reads the payload.
 *
 * Two routes are sampled. The `div` route paints the theme's foreground on its
 * background; the `<img>` SVG data URL bakes in `#000` on `#fff`. The sourced
 * `<svg>` route is not sampled: its dark geometry is the same `modulePath` the
 * `div` route proves, and its single-tint behaviour is the runtime property
 * plans `180`/`697` already measure.
 *
 * Sampling stays pure: `sampleMatrix` takes a sampler, so a unit test can feed
 * it a hand-built frame and prove one wrong module fails.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { FrameReader } from "./frames.js";
import { asHex, TOLERANCE } from "./frames.js";
import type { QrSpec } from "./qr-layout.js";

/** The two colours one route is allowed to paint. */
export interface QrRouteColours {
  readonly dark: Pixels.Rgba;
  readonly light: Pixels.Rgba;
}

/** One module whose painted colour is not its authored value. */
export interface QrPixelMismatch {
  readonly row: number;
  readonly col: number;
  readonly expected: "dark" | "light";
  readonly actual: string;
}

/** Everything one sampling pass yields. */
export interface QrFrameReading {
  /** The reconstructed matrix: `#` for a dark module, `.` for a light one. */
  readonly rows: ReadonlyArray<string>;
  readonly mismatches: ReadonlyArray<QrPixelMismatch>;
  readonly darkCount: number;
}

type Cell = "dark" | "light" | "unreadable";

/** The logical centre of one module, quiet zone included. */
export const moduleCentre = (
  row: number,
  col: number,
  spec: QrSpec,
  origin: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } => ({
  x: origin.x + (col + spec.quiet + 0.5) * spec.module,
  y: origin.y + (row + spec.quiet + 0.5) * spec.module,
});

/** The square the code paints, quiet zone included. */
export const frameMatrixSize = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
): number => (matrix.length + spec.quiet * 2) * spec.module;

/** The four quiet-zone corners, half a band in from the box's edge. */
export const quietZoneSamples = (
  spec: QrSpec,
  origin: { readonly x: number; readonly y: number },
  size: number,
): ReadonlyArray<{ readonly x: number; readonly y: number }> => {
  const inset = (spec.quiet * spec.module) / 2;
  const far = size - inset;
  return [
    { x: origin.x + inset, y: origin.y + inset },
    { x: origin.x + far, y: origin.y + inset },
    { x: origin.x + inset, y: origin.y + far },
    { x: origin.x + far, y: origin.y + far },
  ];
};

const classify = (
  colour: Option.Option<Pixels.Rgba>,
  colours: QrRouteColours,
): Cell =>
  Option.match(colour, {
    onNone: () => "unreadable",
    onSome: (value) =>
      Pixels.rgbaNear(value, colours.dark, TOLERANCE) ? "dark" : "light",
  });

/** How many dark modules the rows hold (authored or reconstructed). */
export const darkModuleCount = (rows: ReadonlyArray<string>): number =>
  Arr.reduce(
    rows,
    0,
    (total, row) =>
      total +
      Arr.reduce(Arr.range(0, row.length - 1), 0, (seen, index) =>
        row[index] === "#" ? seen + 1 : seen,
      ),
  );

/**
 * Reconstruct the matrix from module-centre samples.
 *
 * One sample per module; the quiet-zone offset is part of the coordinate, so a
 * sampler that forgets it reads its neighbour and fails. An unreadable sample
 * is a mismatch, never a silently skipped module.
 */
export const sampleMatrix = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
  origin: { readonly x: number; readonly y: number },
  colours: QrRouteColours,
  sample: (x: number, y: number) => Option.Option<Pixels.Rgba>,
): QrFrameReading => {
  const cells = Arr.map(Arr.range(0, matrix.length - 1), (row) =>
    Arr.map(Arr.range(0, (matrix[row]?.length ?? 0) - 1), (col) => {
      const point = moduleCentre(row, col, spec, origin);
      const colour = sample(point.x, point.y);
      return {
        cell: classify(colour, colours),
        actual: Option.match(colour, {
          onNone: () => "outside the frame",
          onSome: asHex,
        }),
      };
    }),
  );
  const rows = Arr.map(cells, (row) =>
    Arr.join(
      Arr.map(row, ({ cell }) => (cell === "dark" ? "#" : ".")),
      "",
    ),
  );
  const mismatches = Arr.flatMap(cells, (row, index) =>
    Arr.flatMap(row, (sampled, col) => {
      const expected: "dark" | "light" =
        matrix[index]?.[col] === "#" ? "dark" : "light";
      const matched =
        expected === "dark"
          ? sampled.cell === "dark"
          : sampled.cell === "light";
      return matched
        ? []
        : [{ row: index, col, expected, actual: sampled.actual }];
    }),
  );
  return { rows, mismatches, darkCount: darkModuleCount(rows) };
};

/** One route's claim: the frame's grid, count and quiet zone. */
export interface QrPixelRoute {
  readonly label: string;
  readonly matrix: ReadonlyArray<string>;
  readonly spec: QrSpec;
  /** The route's dark module colour, as a theme token or literal hex. */
  readonly dark: string;
  /** The route's light module (and quiet zone) colour. */
  readonly light: string;
}

const failure = (
  label: string,
  expected: string,
  actual: string,
): Smoke.SmokeAssertionError =>
  new Smoke.SmokeAssertionError({ label, expected, actual });

const parseColour = (
  label: string,
  hex: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Option.match(Pixels.hexToRgba(hex), {
    onNone: () =>
      Effect.fail(
        failure(label, "a #RRGGBB or #RRGGBBAA colour", `unparseable ${hex}`),
      ),
    onSome: Effect.succeed,
  });

/** A frame sample in logical window coordinates, or `None` outside the frame. */
const frameSampler =
  (frame: Pixels.Pixels, window: Smoke.WindowSize) =>
  (x: number, y: number): Option.Option<Pixels.Rgba> =>
    Option.flatMap(Pixels.framePoint(frame, window, x, y), (point) =>
      Pixels.pixelAt(frame, point.x, point.y),
    );

/**
 * Run the three frame checks for one route and return the reconstructed rows.
 *
 * The matrix box is read from `qr-matrix`, so the sample points follow the
 * runtime's layout rather than a hard-coded offset. A missing box fails the
 * first check by name; no sampling helper in this module records its own check,
 * so the counts stay three per route.
 */
export const qrFrameChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  route: QrPixelRoute,
): Effect.Effect<ReadonlyArray<string>, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = Option.fromNullishOr(yield* reader.bounds("qr-matrix"));
    const window = yield* reader.windowSize();
    const colours = {
      dark: yield* parseColour(
        `${route.label}: the dark colour parses`,
        route.dark,
      ),
      light: yield* parseColour(
        `${route.label}: the light colour parses`,
        route.light,
      ),
    };
    const sample = frameSampler(frame, window);
    const reading = Option.map(box, (origin) =>
      sampleMatrix(route.matrix, route.spec, origin, colours, sample),
    );

    const matrixLabel = `${route.label}: the frame's module grid reconstructs the authored matrix`;
    yield* ctx.check(
      matrixLabel,
      Option.match(reading, {
        onNone: () =>
          Effect.fail(failure(matrixLabel, "qr-matrix is painted", "no box")),
        onSome: ({ mismatches }) =>
          Arr.match(mismatches, {
            onEmpty: () => Effect.void,
            onNonEmpty: (wrong) => {
              const first = wrong[0];
              return Effect.fail(
                failure(
                  matrixLabel,
                  "every module centre paints its authored colour",
                  first === undefined
                    ? "a mismatch with no entry"
                    : `${wrong.length} mismatches; first r${first.row}c${first.col} is ${first.expected}, painted ${first.actual}`,
                ),
              );
            },
          }),
      }),
    );

    const authored = darkModuleCount(route.matrix);
    const countLabel = `${route.label}: the painted dark modules match the fixture`;
    yield* ctx.check(
      countLabel,
      Option.match(reading, {
        onNone: () =>
          Effect.fail(failure(countLabel, `${authored}`, "no reading")),
        onSome: ({ darkCount }) =>
          darkCount === authored
            ? Effect.void
            : Effect.fail(failure(countLabel, `${authored}`, `${darkCount}`)),
      }),
    );

    const quietLabel = `${route.label}: the quiet zone paints the light colour`;
    const origin = yield* Option.match(box, {
      onNone: () =>
        Effect.fail(failure(quietLabel, "qr-matrix is painted", "no box")),
      onSome: Effect.succeed,
    });
    const quiet = Arr.map(
      quietZoneSamples(
        route.spec,
        origin,
        frameMatrixSize(route.matrix, route.spec),
      ),
      (point) =>
        Option.match(sample(point.x, point.y), {
          onNone: () => "outside the frame",
          onSome: (colour) =>
            Pixels.rgbaNear(colour, colours.light, TOLERANCE)
              ? ""
              : asHex(colour),
        }),
    );
    const off = Arr.filter(quiet, (result) => result !== "");
    yield* ctx.check(
      quietLabel,
      Arr.match(off, {
        onEmpty: () => Effect.void,
        onNonEmpty: (wrong) => {
          const first = wrong[0];
          return Effect.fail(
            failure(
              quietLabel,
              asHex(colours.light),
              first === undefined ? "a wrong sample with no colour" : first,
            ),
          );
        },
      }),
    );

    // The first check already failed if the box was missing, so this only
    // reports the rows of a reading the frame checks have accepted.
    return Option.getOrElse(
      Option.map(reading, (value) => value.rows),
      () => [],
    );
  });
