/**
 * The `qr-matrix` probe's fixture: a version-1 QR matrix and the two ways the
 * runtime can paint it.
 *
 * Tier 5's **QR code** row said the matrix can be "a grid of `div`s or one
 * `<svg>`" and left the runtime half unmeasured (`?`). The encoder is not a
 * runtime question — a package supplies the modules — so the probe paints a
 * **synthetic** 21×21 matrix laid out like a version-1 symbol (three finder
 * patterns, their separators, the two timing strips and the dark module) and
 * asks only what the window does with it:
 *
 * 1. **Does a grid of filled `div`s paint the module grid?** One positioned box
 *    per dark module, at the module's own coordinates.
 * 2. **Does one tinted `<svg>` mask paint the same grid?** The runtime
 *    rasterises `<svg source>` into one mask and tints it with `style.color`,
 *    so a symbol needs a single `fill="#000"` and one ink colour.
 * 3. **Is the quiet zone paper?** A scanner needs four light modules around the
 *    symbol; the probe's scan covers the whole 29×29 cell field, so a dark
 *    neighbour or a page fill bleeding in is counted as a mismatch.
 *
 * The arithmetic lives here so the view, the steps, the README's table and the
 * unit test read one source. Kept native-free, as every fixture is.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A version-1 symbol is 21 modules square. */
export const QR_MODULES = 21;

/** A QR symbol needs a four-module light quiet zone on every side. */
export const QR_QUIET = 4;

/** One module's side in points; at the window's 2× it is 12 device pixels. */
export const QR_MODULE = 6;

/** The cell field the probe scans: the symbol and its quiet zone. */
export const QR_CELLS = QR_MODULES + 2 * QR_QUIET;

/** The painted side of one symbol: 29 modules × 6 points. */
export const QR_SIDE = QR_CELLS * QR_MODULE;

/** The ink: a fixed near-black, because a symbol's polarity is not themed. */
export const QR_INK = { r: 0x11, g: 0x11, b: 0x11 } as const;

/** The paper: fixed white, the light side a scanner expects under any theme. */
export const QR_PAPER = { r: 0xff, g: 0xff, b: 0xff } as const;

const hexOf = (colour: {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}): string =>
  `#${Arr.join(
    Arr.map([colour.r, colour.g, colour.b], (channel) =>
      channel.toString(16).padStart(2, "0"),
    ),
    "",
  )}`.toUpperCase();

/** The ink as `#rrggbb`, for the probe and the unit test to compare with. */
export const QR_INK_HEX = hexOf(QR_INK);

/** The paper as `#rrggbb`, for the probe and the unit test to compare with. */
export const QR_PAPER_HEX = hexOf(QR_PAPER);

/** The `testId`s the view and the steps share. */
export const QR_IDS = {
  probe: "qr-probe",
  readout: "qr-readout",
  grid: "qr-grid",
  svg: "qr-svg",
  svgMask: "qr-svg-mask",
} as const;

/** A module's position inside the symbol, 0-based. */
export interface QrCell {
  readonly row: number;
  readonly col: number;
}

/** A rectangle in the symbol's own coordinates. */
export interface QrBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A finder pattern's side. */
const FINDER = 7;

/** The timing strips are row 6 and column 6. */
const TIMING = 6;

/** Version 1's dark module, below the top-left separator. */
const DARK_MODULE = { row: 13, col: 8 } as const;

/** The three finder patterns' top-left corners. */
const FINDER_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, QR_MODULES - FINDER],
  [QR_MODULES - FINDER, 0],
];

const within = (value: number, low: number, high: number): boolean =>
  value >= low && value < high;

/**
 * The light separator ring around one finder pattern.
 *
 * A separator is the ring of paper modules on the finder's **inner** sides: the
 * row below and the column right of the top-left finder, the row below and the
 * column left of the top-right one, and so on. A finder at the symbol's edge has
 * no ring on that side, and a ring cell outside the symbol is not a module.
 */
const separatorCells = (top: number, left: number): ReadonlyArray<QrCell> => {
  const below = Arr.makeBy(FINDER, (at) => ({
    row: top + FINDER,
    col: left + at,
  }));
  const right = Arr.makeBy(FINDER, (at) => ({
    row: top + at,
    col: left + FINDER,
  }));
  const above =
    top > 0
      ? Arr.makeBy(FINDER, (at) => ({ row: top - 1, col: left + at }))
      : [];
  const beside =
    left > 0
      ? Arr.makeBy(FINDER, (at) => ({ row: top + at, col: left - 1 }))
      : [];
  return Arr.filter(
    Arr.appendAll(Arr.appendAll(below, right), Arr.appendAll(above, beside)),
    ({ row, col }) => within(row, 0, QR_MODULES) && within(col, 0, QR_MODULES),
  );
};

/** Every separator cell of the symbol. */
const SEPARATOR_CELLS: ReadonlyArray<QrCell> = Arr.flatMap(
  FINDER_ORIGINS,
  ([top, left]) => separatorCells(top, left),
);

/**
 * One finder module: a dark ring, a light ring and a 3×3 dark centre.
 *
 * Read relative to the pattern's own corner, so the three patterns share it.
 */
const finderModule = (row: number, col: number): boolean =>
  row === 0 ||
  row === FINDER - 1 ||
  col === 0 ||
  col === FINDER - 1 ||
  (row >= 2 && row <= 4 && col >= 2 && col <= 4);

const finderAt = (row: number, col: number): Option.Option<boolean> =>
  pipe(
    Arr.findFirst(
      FINDER_ORIGINS,
      ([top, left]) =>
        within(row, top, top + FINDER) && within(col, left, left + FINDER),
    ),
    Option.map(([top, left]) => finderModule(row - top, col - left)),
  );

const inSeparator = (row: number, col: number): boolean =>
  Arr.some(SEPARATOR_CELLS, (cell) => cell.row === row && cell.col === col);

/**
 * The data area's modules.
 *
 * A real encoder fills these; the probe only needs a fixed, uneven pattern so a
 * misaligned scan cannot pass by reading a solid block.
 */
const dataModule = (row: number, col: number): boolean =>
  (row * 37 + col * 17 + row * col * 5) % 7 < 3;

/** One module of the symbol: dark or light, function patterns included. */
export const qrModule = (row: number, col: number): boolean =>
  pipe(
    finderAt(row, col),
    Option.match({
      onSome: (dark) => dark,
      onNone: () => {
        if (inSeparator(row, col)) return false;
        if (row === TIMING || col === TIMING) {
          // Both strips alternate dark/light starting and ending dark.
          return (row === TIMING ? col : row) % 2 === 0;
        }
        if (row === DARK_MODULE.row && col === DARK_MODULE.col) return true;
        return dataModule(row, col);
      },
    }),
  );

const MATRIX: ReadonlyArray<ReadonlyArray<boolean>> = Arr.makeBy(
  QR_MODULES,
  (row) => Arr.makeBy(QR_MODULES, (col) => qrModule(row, col)),
);

/** The whole symbol, row by row. */
export const qrMatrix = (): ReadonlyArray<ReadonlyArray<boolean>> => MATRIX;

/** Every dark module, in row-major order, at its position in the symbol. */
export const qrDarkCells = (): ReadonlyArray<QrCell> =>
  Arr.flatMap(
    Arr.makeBy(QR_MODULES, (row) => row),
    (row) =>
      Arr.map(
        Arr.filter(
          Arr.makeBy(QR_MODULES, (col) => col),
          (col) => qrModule(row, col),
        ),
        (col) => ({ row, col }),
      ),
  );

/**
 * Whether a cell of the **scanned field** is dark.
 *
 * The field includes the quiet zone, where every cell is paper; a scan that
 * ignores the ring would pass a symbol whose neighbours paint into it.
 */
export const qrCellIsDark = (row: number, col: number): boolean =>
  within(row, QR_QUIET, QR_QUIET + QR_MODULES) &&
  within(col, QR_QUIET, QR_QUIET + QR_MODULES) &&
  (MATRIX[row - QR_QUIET]?.[col - QR_QUIET] ?? false);

/**
 * A module's box in the symbol's own coordinates.
 *
 * The matrix's module (0, 0) is the first module **inside** the quiet zone, so
 * its box starts a quiet zone in. {@link qrCellCentre} reads the scanned field
 * instead, which is the other coordinate space.
 */
export const qrModuleBox = (row: number, col: number): QrBox => ({
  x: (col + QR_QUIET) * QR_MODULE,
  y: (row + QR_QUIET) * QR_MODULE,
  width: QR_MODULE,
  height: QR_MODULE,
});

/**
 * A scanned field cell's centre, in the symbol's own coordinates.
 *
 * The field is the symbol **and** its quiet zone, so a field cell's centre is
 * one module step from the symbol's own origin: field cell (0, 0) is the first
 * quiet module, not the symbol's first module. {@link qrCellIsDark} reads the
 * field in the same space, so a sample and the module it is compared with are
 * never a quiet zone apart.
 */
export const qrCellCentre = (
  row: number,
  col: number,
): { x: number; y: number } => ({
  x: (col + 0.5) * QR_MODULE,
  y: (row + 0.5) * QR_MODULE,
});

/** The quiet zone's four corner cells, where a neighbour would bleed in. */
export const qrQuietCorners: ReadonlyArray<QrCell> = [
  { row: 0, col: 0 },
  { row: 0, col: QR_CELLS - 1 },
  { row: QR_CELLS - 1, col: 0 },
  { row: QR_CELLS - 1, col: QR_CELLS - 1 },
];

/** The pixels the dark modules cover at one device scale. */
export const qrInkPixels = (scale: number): number =>
  Arr.length(qrDarkCells()) * QR_MODULE * QR_MODULE * scale * scale;

/** The pixels the paper covers inside one symbol, at one device scale. */
export const qrPaperPixels = (scale: number): number =>
  QR_SIDE * QR_SIDE * scale * scale - qrInkPixels(scale);

/**
 * How many scanned cells disagree with the matrix.
 *
 * `sample` classifies a cell from the capture; a cell the capture cannot hold
 * is a mismatch, so a clipped or short frame fails instead of shrinking the
 * count. The whole field is walked, quiet zone included.
 */
export const qrMismatches = (
  sample: (row: number, col: number) => Option.Option<boolean>,
): number =>
  Arr.length(
    Arr.filter(
      Arr.makeBy(QR_CELLS * QR_CELLS, (at) => ({
        row: Math.floor(at / QR_CELLS),
        col: at % QR_CELLS,
      })),
      ({ row, col }) =>
        Option.match(sample(row, col), {
          onNone: () => true,
          onSome: (dark) => dark !== qrCellIsDark(row, col),
        }),
    ),
  );

/**
 * The one tinted mask both routes could be: every dark module as a black
 * `rect` in the symbol's coordinates.
 *
 * `<svg source>` is rasterised into one mask and tinted by the element's
 * `color`, so a symbol needs one fill and one ink.
 */
export const qrSvgMarkup = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIDE}" height="${QR_SIDE}" viewBox="0 0 ${QR_SIDE} ${QR_SIDE}">${Arr.join(
    Arr.map(qrDarkCells(), (cell) => {
      const box = qrModuleBox(cell.row, cell.col);
      return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#000"/>`;
    }),
    "",
  )}</svg>`;

/** What the probe's readout prints, so every check reads one line. */
export const qrReadout = (): string =>
  `qr=${QR_MODULES}x${QR_MODULES} dark=${Arr.length(qrDarkCells())} ` +
  `side=${QR_SIDE} quiet=${QR_QUIET}`;

/**
 * The checks the probe asserts, so its documentation cannot drift.
 *
 * The readout, the three painted boxes, the six size reads, the capture's
 * scale, the two colour reads, the two crops, the two module scans, the four
 * fill counts, the two quiet-zone reads, the route comparison, the contrast
 * floor and the two polarity reads add thirty-three.
 */
export const QR_CHECKS = 33;
