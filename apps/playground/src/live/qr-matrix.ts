import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const QR_MODULES = 21;

export const QR_QUIET = 4;

export const QR_MODULE = 6;

export const QR_CELLS = QR_MODULES + 2 * QR_QUIET;

export const QR_SIDE = QR_CELLS * QR_MODULE;

export const QR_INK = { r: 0x11, g: 0x11, b: 0x11 } as const;

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

export const QR_INK_HEX = hexOf(QR_INK);

export const QR_PAPER_HEX = hexOf(QR_PAPER);

export const QR_IDS = {
  probe: "qr-probe",
  readout: "qr-readout",
  grid: "qr-grid",
  svg: "qr-svg",
  svgMask: "qr-svg-mask",
} as const;

export interface QrCell {
  readonly row: number;
  readonly col: number;
}

export interface QrBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const FINDER = 7;

const TIMING = 6;

const DARK_MODULE = { row: 13, col: 8 } as const;

const FINDER_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, QR_MODULES - FINDER],
  [QR_MODULES - FINDER, 0],
];

const within = (value: number, low: number, high: number): boolean =>
  value >= low && value < high;

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

const SEPARATOR_CELLS: ReadonlyArray<QrCell> = Arr.flatMap(
  FINDER_ORIGINS,
  ([top, left]) => separatorCells(top, left),
);

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

const dataModule = (row: number, col: number): boolean =>
  (row * 37 + col * 17 + row * col * 5) % 7 < 3;

export const qrModule = (row: number, col: number): boolean =>
  pipe(
    finderAt(row, col),
    Option.match({
      onSome: (dark) => dark,
      onNone: () => {
        if (inSeparator(row, col)) return false;
        if (row === TIMING || col === TIMING) {
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

export const qrMatrix = (): ReadonlyArray<ReadonlyArray<boolean>> => MATRIX;

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

export const qrCellIsDark = (row: number, col: number): boolean =>
  within(row, QR_QUIET, QR_QUIET + QR_MODULES) &&
  within(col, QR_QUIET, QR_QUIET + QR_MODULES) &&
  (MATRIX[row - QR_QUIET]?.[col - QR_QUIET] ?? false);

export const qrModuleBox = (row: number, col: number): QrBox => ({
  x: (col + QR_QUIET) * QR_MODULE,
  y: (row + QR_QUIET) * QR_MODULE,
  width: QR_MODULE,
  height: QR_MODULE,
});

export const qrCellCentre = (
  row: number,
  col: number,
): { x: number; y: number } => ({
  x: (col + 0.5) * QR_MODULE,
  y: (row + 0.5) * QR_MODULE,
});

export const qrQuietCorners: ReadonlyArray<QrCell> = [
  { row: 0, col: 0 },
  { row: 0, col: QR_CELLS - 1 },
  { row: QR_CELLS - 1, col: 0 },
  { row: QR_CELLS - 1, col: QR_CELLS - 1 },
];

export const qrInkPixels = (scale: number): number =>
  Arr.length(qrDarkCells()) * QR_MODULE * QR_MODULE * scale * scale;

export const qrPaperPixels = (scale: number): number =>
  QR_SIDE * QR_SIDE * scale * scale - qrInkPixels(scale);

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

export const qrSvgMarkup = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIDE}" height="${QR_SIDE}" viewBox="0 0 ${QR_SIDE} ${QR_SIDE}">${Arr.join(
    Arr.map(qrDarkCells(), (cell) => {
      const box = qrModuleBox(cell.row, cell.col);
      return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#000"/>`;
    }),
    "",
  )}</svg>`;

export const qrReadout = (): string =>
  `qr=${QR_MODULES}x${QR_MODULES} dark=${Arr.length(qrDarkCells())} ` +
  `side=${QR_SIDE} quiet=${QR_QUIET}`;

export const QR_CHECKS = 33;
