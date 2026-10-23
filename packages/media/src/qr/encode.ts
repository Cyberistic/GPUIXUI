/**
 * The QR encoder `QrCode` ships — byte mode, versions 1–10, every error
 * correction level, Reed–Solomon over GF(256), the eight data masks and the
 * standard penalty search.
 *
 * A QR symbol is arithmetic, not a runtime capability: the playground's
 * `qr-matrix` probe settled that both paint routes (a grid of `div`s and one
 * tinted `<svg>` mask) render the module grid in a window, so what was missing
 * was an encoder. This module is it, kept out of the component so a caller can
 * draw the same symbol on paper, in a cell or in a test.
 *
 * The bit walks and the grid writes are imperative on purpose — the enforcer's
 * `imperative-loops` rule is a deliberate exception here. A byte buffer, a
 * Reed–Solomon remainder and the zigzag that fills the symbol's data area are
 * sequential state machines; expressing them as `reduce` over indices adds
 * aliasing without removing a single mutation. The same call is recorded in
 * `@gpuixui/editor`'s diff and `@gpuixui/testing`'s pixel readers. Everything
 * exported is pure, and every read is bounds-checked.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The four error correction levels, quietest first. */
export const QR_LEVELS = ["L", "M", "Q", "H"] as const;

/** A QR error correction level. */
export const QrLevel = Schema.Literals(QR_LEVELS);
/** A QR error correction level. */
export type QrLevel = typeof QrLevel.Type;

/** The highest version this encoder prints. */
export const QR_MAX_VERSION = 10;

/** Every version this encoder prints. */
export const QrVersion = Schema.Literals([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
/** Every version this encoder prints. */
export type QrVersion = typeof QrVersion.Type;

/** A version-1 symbol's side, in modules. */
const BASE_MODULES = 21;

/** The quiet zone a scanner needs: four light modules on every side. */
export const QR_QUIET_ZONE = 4;

/** One block group: how many blocks, and the data codewords each holds. */
interface EcSpec {
  readonly ec: number;
  readonly groups: ReadonlyArray<readonly [number, number]>;
}

/** The block table's shape: one spec per version and level. */
type EcTable = Readonly<Record<QrVersion, EcSpec>>;

/**
 * ISO/IEC 18004's block table, versions 1–10, by level.
 *
 * Each entry is the level's spec for its version: the EC codewords per block
 * and the groups of `[blocks, data codewords each]`. A version whose data
 * codewords do not divide evenly carries the remainder in a second group, which
 * is why a symbol's blocks are not all the same size.
 */
const EC_BLOCKS: Readonly<Record<QrLevel, EcTable>> = {
  L: {
    1: { ec: 7, groups: [[1, 19]] },
    2: { ec: 10, groups: [[1, 34]] },
    3: { ec: 15, groups: [[1, 55]] },
    4: { ec: 20, groups: [[1, 80]] },
    5: { ec: 26, groups: [[1, 108]] },
    6: { ec: 18, groups: [[2, 68]] },
    7: { ec: 20, groups: [[2, 78]] },
    8: { ec: 24, groups: [[2, 97]] },
    9: { ec: 30, groups: [[2, 116]] },
    10: {
      ec: 18,
      groups: [
        [2, 68],
        [2, 69],
      ],
    },
  },
  M: {
    1: { ec: 10, groups: [[1, 16]] },
    2: { ec: 16, groups: [[1, 28]] },
    3: { ec: 26, groups: [[1, 44]] },
    4: { ec: 18, groups: [[2, 32]] },
    5: { ec: 24, groups: [[2, 43]] },
    6: { ec: 16, groups: [[4, 27]] },
    7: { ec: 18, groups: [[4, 31]] },
    8: {
      ec: 22,
      groups: [
        [2, 38],
        [2, 39],
      ],
    },
    9: {
      ec: 22,
      groups: [
        [3, 36],
        [2, 37],
      ],
    },
    10: {
      ec: 26,
      groups: [
        [4, 43],
        [1, 44],
      ],
    },
  },
  Q: {
    1: { ec: 13, groups: [[1, 13]] },
    2: { ec: 22, groups: [[1, 22]] },
    3: { ec: 18, groups: [[2, 17]] },
    4: { ec: 26, groups: [[2, 24]] },
    5: {
      ec: 18,
      groups: [
        [2, 15],
        [2, 16],
      ],
    },
    6: { ec: 24, groups: [[4, 19]] },
    7: {
      ec: 18,
      groups: [
        [2, 14],
        [4, 15],
      ],
    },
    8: {
      ec: 22,
      groups: [
        [4, 18],
        [2, 19],
      ],
    },
    9: {
      ec: 20,
      groups: [
        [4, 16],
        [4, 17],
      ],
    },
    10: {
      ec: 24,
      groups: [
        [6, 19],
        [2, 20],
      ],
    },
  },
  H: {
    1: { ec: 17, groups: [[1, 9]] },
    2: { ec: 28, groups: [[1, 16]] },
    3: { ec: 22, groups: [[2, 13]] },
    4: { ec: 16, groups: [[4, 9]] },
    5: {
      ec: 22,
      groups: [
        [2, 11],
        [2, 12],
      ],
    },
    6: { ec: 28, groups: [[4, 15]] },
    7: {
      ec: 26,
      groups: [
        [4, 13],
        [1, 14],
      ],
    },
    8: {
      ec: 26,
      groups: [
        [4, 14],
        [2, 15],
      ],
    },
    9: {
      ec: 24,
      groups: [
        [4, 12],
        [4, 13],
      ],
    },
    10: {
      ec: 28,
      groups: [
        [6, 15],
        [2, 16],
      ],
    },
  },
};

/** The alignment pattern centres each version carries; version 1 has none. */
const ALIGNMENT_CENTRES: Readonly<Record<QrVersion, ReadonlyArray<number>>> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

/** Mask 0, the one a symbol falls back to when a caller names no valid mask. */
const MASK_ZERO = (row: number, col: number): boolean => (row + col) % 2 === 0;

/** The mask that painted a module, ordered as the format field numbers them. */
const MASKS: ReadonlyArray<(row: number, col: number) => boolean> = [
  MASK_ZERO,
  (row) => row % 2 === 0,
  (_row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0,
];

/** The bits the format field carries per level (ISO/IEC 18004 table 12). */
const LEVEL_BITS: Readonly<Record<QrLevel, number>> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

/** Every version this encoder prints, in order. */
export const QR_VERSIONS: ReadonlyArray<QrVersion> = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

/** A version's side in modules, before the quiet zone. */
export const qrModules = (version: QrVersion): number =>
  BASE_MODULES + (version - 1) * 4;

const spec = (version: QrVersion, level: QrLevel): EcSpec =>
  EC_BLOCKS[level][version];

/** The data codewords one version/level holds, EC excluded. */
export const qrDataCodewords = (version: QrVersion, level: QrLevel): number =>
  Arr.reduce(
    spec(version, level).groups,
    0,
    (total, [blocks, data]) => total + blocks * data,
  );

/** The bits a byte-mode character count takes at one version. */
const countBits = (version: QrVersion): number => (version <= 9 ? 8 : 16);

/** The most UTF-8 bytes one version/level holds in byte mode. */
export const qrByteCapacity = (version: QrVersion, level: QrLevel): number =>
  Math.floor(
    (qrDataCodewords(version, level) * 8 - 4 - countBits(version)) / 8,
  );

/** The smallest version whose byte capacity holds `bytes`, if any. */
export const qrVersionFor = (
  bytes: number,
  level: QrLevel,
): Option.Option<QrVersion> =>
  Arr.findFirst(
    QR_VERSIONS,
    (version) => qrByteCapacity(version, level) >= bytes,
  );

const utf8 = (value: string): ReadonlyArray<number> =>
  Arr.fromIterable(new TextEncoder().encode(value));

/** A symbol that was encoded. */
export class QrSymbol extends Schema.Class<QrSymbol>("QrSymbol")({
  _tag: Schema.tag("symbol"),
  version: QrVersion,
  level: QrLevel,
  mask: Schema.Int,
  matrix: Schema.Array(Schema.Array(Schema.Boolean)),
}) {
  /** The symbol's side in modules, without the quiet zone. */
  get modules(): number {
    return qrModules(this.version);
  }

  /** The dark module at `row`, `col`; a cell outside the symbol is light. */
  isDark = (row: number, col: number): boolean =>
    this.matrix[row]?.[col] ?? false;
}

/** A value that does not fit the largest symbol this encoder prints. */
export class QrOverflow extends Schema.Class<QrOverflow>("QrOverflow")({
  _tag: Schema.tag("overflow"),
  bytes: Schema.Int,
  capacity: Schema.Int,
  level: QrLevel,
}) {}

/** What {@link encodeQr} answers: a symbol, or the capacity it needed. */
export const QrEncoding = Schema.Union([QrSymbol, QrOverflow]).pipe(
  Schema.toTaggedUnion("_tag"),
);

/** What {@link encodeQr} answers: a symbol, or the capacity it needed. */
export type QrEncoding = typeof QrEncoding.Type;

/* -------------------------------------------------------------------------- */
/* Reed–Solomon over GF(256)                                                   */
/* -------------------------------------------------------------------------- */

/** Antilog table for the field's primitive polynomial, `x^8+x^4+x^3+x^2+1`. */
const GF_EXP = new Uint8Array(512);

/** Log table for the same field. */
const GF_LOG = new Uint8Array(256);

{
  let value = 1;
  for (let at = 0; at < 255; at += 1) {
    GF_EXP[at] = value;
    GF_LOG[value] = at;
    value <<= 1;
    if ((value & 0x100) !== 0) value ^= 0x11d;
  }
  for (let at = 255; at < 512; at += 1) GF_EXP[at] = GF_EXP[at - 255] ?? 0;
}

const gfMul = (left: number, right: number): number =>
  left === 0 || right === 0
    ? 0
    : (GF_EXP[(GF_LOG[left] ?? 0) + (GF_LOG[right] ?? 0)] ?? 0);

/** The generator polynomial of `degree` EC codewords, highest power first. */
const generator = (degree: number): ReadonlyArray<number> => {
  let polynomial: ReadonlyArray<number> = [1];
  for (let root = 0; root < degree; root += 1) {
    const next = Arr.makeBy(polynomial.length + 1, () => 0);
    polynomial.forEach((coefficient, at) => {
      next[at] = (next[at] ?? 0) ^ coefficient;
      next[at + 1] =
        (next[at + 1] ?? 0) ^ gfMul(coefficient, GF_EXP[root] ?? 0);
    });
    polynomial = next;
  }
  return polynomial;
};

/**
 * The EC codewords for one block.
 *
 * Division by the generator polynomial's remainder: a symbol's EC part is what
 * a scanner subtracts to prove the data survived the trip.
 */
const errorCorrection = (
  data: ReadonlyArray<number>,
  degree: number,
): ReadonlyArray<number> => {
  const polynomial = generator(degree);
  const remainder = Arr.makeBy(degree, () => 0);
  for (const byte of data) {
    const factor = byte ^ (remainder[0] ?? 0);
    for (let at = 0; at < degree - 1; at += 1) {
      remainder[at] =
        (remainder[at + 1] ?? 0) ^ gfMul(polynomial[at + 1] ?? 0, factor);
    }
    remainder[degree - 1] = gfMul(polynomial[degree] ?? 0, factor);
  }
  return remainder;
};

/* -------------------------------------------------------------------------- */
/* Data codewords                                                              */
/* -------------------------------------------------------------------------- */

const appendBits = (bits: number[], value: number, length: number): void => {
  for (let at = length - 1; at >= 0; at -= 1) bits.push((value >>> at) & 1);
};

/** The data codewords, terminated, bit-padded and padded to `total`. */
const dataCodewords = (
  bytes: ReadonlyArray<number>,
  version: QrVersion,
  level: QrLevel,
): ReadonlyArray<number> => {
  const total = qrDataCodewords(version, level);
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, countBits(version));
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacity = total * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);

  const codewords: number[] = [];
  for (let at = 0; at < bits.length; at += 8) {
    codewords.push(
      Arr.reduce(
        Arr.makeBy(8, (offset) => bits[at + offset] ?? 0),
        0,
        (byte, bit) => (byte << 1) | bit,
      ),
    );
  }
  for (let pad = 0; codewords.length < total; pad += 1) {
    codewords.push(pad % 2 === 0 ? 0xec : 0x11);
  }
  return codewords;
};

/** One block's data and its EC codewords. */
interface Block {
  readonly data: ReadonlyArray<number>;
  readonly ec: ReadonlyArray<number>;
}

/** Split the data codewords into the version/level's blocks and add their EC. */
const blocksOf = (
  codewords: ReadonlyArray<number>,
  version: QrVersion,
  level: QrLevel,
): ReadonlyArray<Block> => {
  const { ec, groups } = spec(version, level);
  const sizes = Arr.flatMap(groups, ([blocks, data]) =>
    Arr.makeBy(blocks, () => data),
  );
  const offsets = Arr.reduce(sizes, [0], (starts, size) =>
    Arr.append(starts, Option.getOrElse(Arr.last(starts), () => 0) + size),
  );
  return Arr.map(sizes, (size, at) => {
    const data = Arr.take(Arr.drop(codewords, offsets[at] ?? 0), size);
    return { data, ec: errorCorrection(data, ec) };
  });
};

/** The interleaved codeword stream a symbol's data area carries. */
const interleave = (blocks: ReadonlyArray<Block>): ReadonlyArray<number> => {
  const widest = Arr.reduce(blocks, 0, (most, block) =>
    Math.max(most, block.data.length),
  );
  const data = Arr.flatMap(
    Arr.makeBy(widest, (at) => at),
    (at) =>
      Arr.flatMap(blocks, (block) => {
        const byte = block.data[at];
        return byte === undefined ? [] : [byte];
      }),
  );
  const degree = blocks[0]?.ec.length ?? 0;
  const ecc = Arr.flatMap(
    Arr.makeBy(degree, (at) => at),
    (at) =>
      Arr.flatMap(blocks, (block) => {
        const byte = block.ec[at];
        return byte === undefined ? [] : [byte];
      }),
  );
  return Arr.appendAll(data, ecc);
};

/* -------------------------------------------------------------------------- */
/* The symbol                                                                  */
/* -------------------------------------------------------------------------- */

/** A grid being drawn: the modules and the cells a data bit may not take. */
interface Canvas {
  readonly modules: boolean[][];
  readonly reserved: boolean[][];
}

const blank = (size: number): Canvas => ({
  modules: Arr.makeBy(size, () => Arr.makeBy(size, () => false)),
  reserved: Arr.makeBy(size, () => Arr.makeBy(size, () => false)),
});

const put = (canvas: Canvas, row: number, col: number, dark: boolean): void => {
  const line = canvas.modules[row];
  const taken = canvas.reserved[row];
  if (line === undefined || taken === undefined) return;
  line[col] = dark;
  taken[col] = true;
};

/** One finder pattern and the light separator ring around it. */
const drawFinder = (canvas: Canvas, top: number, left: number): void => {
  const size = canvas.modules.length;
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const row = top + dy;
      const col = left + dx;
      if (row < 0 || row >= size || col < 0 || col >= size) continue;
      const inPattern = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
      const dark =
        inPattern &&
        (dy === 0 ||
          dy === 6 ||
          dx === 0 ||
          dx === 6 ||
          (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4));
      put(canvas, row, col, dark);
    }
  }
};

/** One 5×5 alignment pattern: a dark centre, a light ring, a dark ring. */
const drawAlignment = (canvas: Canvas, row: number, col: number): void => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      put(
        canvas,
        row + dy,
        col + dx,
        Math.max(Math.abs(dy), Math.abs(dx)) !== 1,
      );
    }
  }
};

/** The 15-bit format field for a level and mask, BCH(15,5) and its XOR mask. */
export const qrFormatBits = (level: QrLevel, mask: number): number => {
  const data = (LEVEL_BITS[level] << 3) | mask;
  let remainder = data;
  for (let at = 0; at < 10; at += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
};

/** The 18-bit version field for versions 7 and up, BCH(18,6). */
export const qrVersionBits = (version: number): number => {
  let remainder = version;
  for (let at = 0; at < 12; at += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return (version << 12) | remainder;
};

const bitOf = (bits: number, at: number): boolean => ((bits >>> at) & 1) !== 0;

/** Write both copies of the format field, and the always-dark module. */
const drawFormat = (canvas: Canvas, level: QrLevel, mask: number): void => {
  const size = canvas.modules.length;
  const bits = qrFormatBits(level, mask);
  for (let at = 0; at <= 5; at += 1) put(canvas, at, 8, bitOf(bits, at));
  put(canvas, 7, 8, bitOf(bits, 6));
  put(canvas, 8, 8, bitOf(bits, 7));
  put(canvas, 8, 7, bitOf(bits, 8));
  for (let at = 9; at < 15; at += 1) put(canvas, 8, 14 - at, bitOf(bits, at));
  for (let at = 0; at < 8; at += 1)
    put(canvas, 8, size - 1 - at, bitOf(bits, at));
  for (let at = 8; at < 15; at += 1)
    put(canvas, size - 15 + at, 8, bitOf(bits, at));
  put(canvas, size - 8, 8, true);
};

/** Write both copies of the version field, for versions 7 and up. */
const drawVersion = (canvas: Canvas, version: number): void => {
  if (version < 7) return;
  const size = canvas.modules.length;
  const bits = qrVersionBits(version);
  for (let at = 0; at < 18; at += 1) {
    const dark = bitOf(bits, at);
    const lead = size - 11 + (at % 3);
    const trail = Math.floor(at / 3);
    put(canvas, trail, lead, dark);
    put(canvas, lead, trail, dark);
  }
};

/** Every function pattern of one version, with the format field reserved. */
const functionCanvas = (version: QrVersion, level: QrLevel): Canvas => {
  const size = qrModules(version);
  const canvas = blank(size);
  drawFinder(canvas, 0, 0);
  drawFinder(canvas, 0, size - 7);
  drawFinder(canvas, size - 7, 0);
  for (let at = 8; at < size - 8; at += 1) {
    put(canvas, 6, at, at % 2 === 0);
    put(canvas, at, 6, at % 2 === 0);
  }
  const centres = ALIGNMENT_CENTRES[version];
  for (const row of centres) {
    for (const col of centres) {
      const overlapsFinder =
        (row === 6 && col === 6) ||
        (row === 6 && col === size - 7) ||
        (row === size - 7 && col === 6);
      if (!overlapsFinder) drawAlignment(canvas, row, col);
    }
  }
  drawFormat(canvas, level, 0);
  drawVersion(canvas, version);
  return canvas;
};

/** Place the interleaved codewords in the two-module zigzag, right to left. */
const drawCodewords = (
  canvas: Canvas,
  codewords: ReadonlyArray<number>,
): void => {
  const size = canvas.modules.length;
  const total = codewords.length * 8;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step += 1) {
      for (let offset = 0; offset < 2; offset += 1) {
        const col = right - offset;
        const row = upward ? size - 1 - step : step;
        if (canvas.reserved[row]?.[col] !== false) continue;
        const line = canvas.modules[row];
        if (line === undefined) continue;
        if (index < total) {
          line[col] = bitOf(codewords[index >>> 3] ?? 0, 7 - (index & 7));
          index += 1;
        }
      }
    }
  }
};

/** Read a grid's cell; outside it is light. */
const cellAt = (
  grid: ReadonlyArray<ReadonlyArray<boolean>>,
  row: number,
  col: number,
): boolean => grid[row]?.[col] ?? false;

/** The eight masks' penalty: runs, blocks, finder look-alikes and balance. */
export const qrPenalty = (
  grid: ReadonlyArray<ReadonlyArray<boolean>>,
): number => {
  const size = grid.length;
  const lookalike = [true, false, true, true, true, false, true];

  const runPenalty = (run: number): number => (run >= 5 ? 3 + (run - 5) : 0);

  const linePenalty = (line: ReadonlyArray<boolean>): number => {
    let penalty = 0;
    let run = 1;
    for (let at = 1; at < line.length; at += 1) {
      if (line[at] === line[at - 1]) {
        run += 1;
        continue;
      }
      penalty += runPenalty(run);
      run = 1;
    }
    penalty += runPenalty(run);
    for (let at = 0; at + 6 < line.length; at += 1) {
      const matches = Arr.every(
        lookalike,
        (expected, step) => (line[at + step] ?? false) === expected,
      );
      if (!matches) continue;
      const quietBefore = Arr.every(
        Arr.makeBy(4, (step) => at - 1 - step),
        (col) => col < 0 || (line[col] ?? false) === false,
      );
      const quietAfter = Arr.every(
        Arr.makeBy(4, (step) => at + 7 + step),
        (col) => col >= line.length || (line[col] ?? false) === false,
      );
      if (quietBefore || quietAfter) penalty += 40;
    }
    return penalty;
  };

  const lines = Arr.flatMap(
    Arr.makeBy(size, (at) => at),
    (at) => [grid[at] ?? [], Arr.map(grid, (row) => row[at] ?? false)],
  );
  let total = Arr.reduce(lines, 0, (sum, line) => sum + linePenalty(line));

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const colour = cellAt(grid, row, col);
      if (
        cellAt(grid, row, col + 1) === colour &&
        cellAt(grid, row + 1, col) === colour &&
        cellAt(grid, row + 1, col + 1) === colour
      ) {
        total += 3;
      }
    }
  }

  const dark = Arr.reduce(
    Arr.map(grid, (row) => Arr.filter(row, (cell) => cell)),
    0,
    (count, row) => count + row.length,
  );
  const cells = size * size;
  const percent = cells === 0 ? 50 : (dark * 100) / cells;
  total += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return total;
};

/** One candidate mask and the grid it painted. */
interface Candidate {
  readonly mask: number;
  readonly matrix: ReadonlyArray<ReadonlyArray<boolean>>;
}

/** The masked copy of a canvas, with this mask's format field written. */
const masked = (
  canvas: Canvas,
  paint: (row: number, col: number) => boolean,
  mask: number,
  level: QrLevel,
): ReadonlyArray<ReadonlyArray<boolean>> => {
  const copy: Canvas = {
    modules: Arr.map(canvas.modules, (row) => Arr.fromIterable(row)),
    reserved: Arr.map(canvas.reserved, (row) => Arr.fromIterable(row)),
  };
  drawFormat(copy, level, mask);
  return Arr.map(copy.modules, (row, rowIndex) =>
    Arr.map(row, (dark, col) => {
      if (canvas.reserved[rowIndex]?.[col] === true) return dark;
      return paint(rowIndex, col) ? !dark : dark;
    }),
  );
};

/** Options for {@link encodeQr}. */
export interface QrEncodeOptions {
  /** The error correction level. Default `"M"`. */
  readonly level?: QrLevel;
  /** Force one of the eight data masks instead of searching. */
  readonly mask?: number;
}

/**
 * Encode a string as a QR symbol.
 *
 * The value is UTF-8 bytes in byte mode, at the smallest version (1–10) that
 * holds it. A value the largest symbol cannot hold is answered with a
 * {@link QrOverflow} naming the byte count and the capacity, never truncated.
 */
export const encodeQr = (
  value: string,
  options: QrEncodeOptions = {},
): QrEncoding => {
  const level = options.level ?? "M";
  const bytes = utf8(value);
  const capacity = qrByteCapacity(QR_MAX_VERSION, level);
  const versionOf = qrVersionFor(bytes.length, level);
  if (Option.isNone(versionOf)) {
    return new QrOverflow({ bytes: bytes.length, capacity, level });
  }
  const version = versionOf.value;
  const codewords = interleave(
    blocksOf(dataCodewords(bytes, version, level), version, level),
  );
  const canvas = functionCanvas(version, level);
  drawCodewords(canvas, codewords);

  const candidates = Arr.map(
    MASKS,
    (paint, mask): Candidate => ({
      mask,
      matrix: masked(canvas, paint, mask, level),
    }),
  );
  const fallback: Candidate = {
    mask: 0,
    matrix: masked(canvas, MASK_ZERO, 0, level),
  };
  const best = Option.getOrElse(
    Arr.reduce(
      Arr.drop(candidates, 1),
      Arr.head(candidates),
      (winner, candidate) =>
        Option.match(winner, {
          onNone: () => Option.some(candidate),
          onSome: (current) =>
            qrPenalty(candidate.matrix) < qrPenalty(current.matrix)
              ? Option.some(candidate)
              : winner,
        }),
    ),
    () => fallback,
  );
  const chosen = Option.match(Option.fromNullishOr(options.mask), {
    onNone: () => best,
    onSome: (mask) =>
      Option.getOrElse(
        Arr.findFirst(candidates, (candidate) => candidate.mask === mask),
        () => best,
      ),
  });

  return new QrSymbol({
    version,
    level,
    mask: chosen.mask,
    matrix: chosen.matrix,
  });
};

/* -------------------------------------------------------------------------- */
/* Markup                                                                      */
/* -------------------------------------------------------------------------- */

/** Where a symbol sits in a painted square: whole modules, quiet zone included. */
export interface QrPlacement {
  /** The side of one module in points. */
  readonly module: number;
  /** The quiet zone in modules. */
  readonly quiet: number;
  /** The painted side in points, quiet zone included. */
  readonly side: number;
  /** The quiet zone's side in modules. */
  readonly cells: number;
}

/**
 * Resolve a painted square.
 *
 * Modules are whole points so the grid stays crisp; the square is the largest
 * one the caller's side can hold, never larger. A side that cannot be laid out
 * reads as `fallback`.
 */
export const qrPlacement = (
  symbol: QrSymbol,
  side: number,
  quiet: number = QR_QUIET_ZONE,
  fallback = 160,
): QrPlacement => {
  const zone = Math.max(0, Math.floor(quiet));
  const cells = symbol.modules + zone * 2;
  const asked = Number.isFinite(side) && side > 0 ? side : fallback;
  const module = Math.max(1, Math.floor(asked / cells));
  return { module, quiet: zone, side: module * cells, cells };
};

/** The SVG source string: one path holding every dark module, in module units. */
export const qrSvgSource = (
  symbol: QrSymbol,
  quiet: number = QR_QUIET_ZONE,
): string => {
  const offset = Math.max(0, Math.floor(quiet));
  const cells = symbol.modules + offset * 2;
  const runs = Arr.flatMap(
    Arr.makeBy(symbol.modules, (row) => row),
    (row) =>
      Arr.flatMap(
        Arr.makeBy(symbol.modules, (col) => col),
        (col) =>
          symbol.isDark(row, col)
            ? [`M${col + offset} ${row + offset}h1v1h-1z`]
            : [],
      ),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}"><path fill="#000" d="${Arr.join(runs, "")}"/></svg>`;
};
