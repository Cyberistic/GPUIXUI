/**
 * The pure half of the QR rendering probe (plan `518`): a module matrix →
 * module boxes → an SVG path/document → a data URL.
 *
 * A future `QRCode` component owns the encoder; this module owns only the
 * geometry a renderer needs, so every rule is testable without a GPUix host.
 * Sizes and origins are pixels; the quiet zone is part of the box, not the
 * matrix.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** Module size and quiet-zone width, both in modules. */
export interface QrSpec {
  readonly module: number;
  readonly quiet: number;
}

/** One dark module, in matrix coordinates. */
export interface QrModule {
  readonly row: number;
  readonly col: number;
}

/** One module's painted box. */
export interface QrBox {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

const columnsIn = (matrix: ReadonlyArray<string>, row: number): number =>
  matrix[row]?.length ?? 0;

/** Every dark module, in reading order. */
export const darkModules = (
  matrix: ReadonlyArray<string>,
): ReadonlyArray<QrModule> =>
  Arr.flatMap(Arr.range(0, matrix.length - 1), (row) =>
    Arr.map(
      Arr.filter(
        Arr.range(0, columnsIn(matrix, row) - 1),
        (col) => matrix[row]?.[col] === "#",
      ),
      (col) => ({ row, col }),
    ),
  );

/** The painted box of one module, with the quiet zone applied. */
export const moduleOrigin = (
  row: number,
  col: number,
  spec: QrSpec,
): QrBox => ({
  x: (col + spec.quiet) * spec.module,
  y: (row + spec.quiet) * spec.module,
  size: spec.module,
});

/** The square the whole code paints, quiet zone included. */
export const matrixSize = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
): number => (matrix.length + spec.quiet * 2) * spec.module;

/** One `M…h…v…h-…z` sub-path per dark module, in pixel units. */
export const modulePath = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
): string =>
  Arr.join(
    Arr.map(darkModules(matrix), ({ row, col }) => {
      const box = moduleOrigin(row, col, spec);
      return `M${box.x} ${box.y}h${box.size}v${box.size}h-${box.size}z`;
    }),
    "",
  );

/**
 * An SVG document for the matrix.
 *
 * A sourced `<svg>` is tinted by the element's `color`, so the path is black and
 * the caller supplies the tint; an `<img>` keeps every fill, so it passes a
 * background colour to make the quiet zone real.
 */
export const svgSource = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
  background: Option.Option<string>,
): string => {
  const size = matrixSize(matrix, spec);
  const rect = Option.match(background, {
    onNone: () => "",
    onSome: (fill) =>
      `<rect x="0" y="0" width="${size}" height="${size}" fill="${fill}"/>`,
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rect}<path d="${modulePath(matrix, spec)}" fill="#000"/></svg>`;
};

/** The percent-encoded `data:image/svg+xml` URL an `<img>` accepts. */
export const dataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
