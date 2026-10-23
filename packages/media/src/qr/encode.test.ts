/**
 * The QR encoder, held to an independent implementation and to the arithmetic
 * the standard defines.
 *
 * The three full symbols in `QR_REFERENCES` were produced by `python-qrcode`
 * (a separate implementation, byte mode, `box_size=1`, `border=0`) and the mask
 * that painted each one is read from its own format field, so this suite
 * compares every module of a version-1, a version-6 and a version-10 symbol —
 * data, EC codewords, interleaving, mask application, alignment patterns,
 * format bits and the version field. A wrong block split, a mis-masked cell or
 * a misplaced format bit fails it module by module.
 *
 * The bug guarded: the encoder existed only in the playground's probe, which
 * painted a synthetic matrix. Every value now encodes to a scannable symbol,
 * and one that does not fit is refused with its capacity rather than truncated.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  encodeQr,
  qrByteCapacity,
  qrFormatBits,
  qrModules,
  qrPenalty,
  qrPlacement,
  qrSvgSource,
  qrVersionBits,
  qrVersionFor,
  QR_MAX_VERSION,
  QR_VERSIONS,
  QrOverflow,
  QrSymbol,
  type QrLevel,
  type QrVersion,
} from "./encode.js";

interface Reference {
  readonly value: string;
  readonly level: QrLevel;
  readonly version: number;
  readonly mask: number;
  readonly rows: ReadonlyArray<string>;
}

const QR_REFERENCES: ReadonlyArray<Reference> = [
  {
    value: "Hello, World!",
    level: "M",
    version: 1,
    mask: 5,
    rows: [
      "111111100010001111111",
      "100000101101101000001",
      "101110101011101011101",
      "101110101011001011101",
      "101110100010101011101",
      "100000100111001000001",
      "111111101010101111111",
      "000000001100000000000",
      "100000101011011001110",
      "000101010010111111100",
      "011111101010111001110",
      "011010011101110001100",
      "110110111001110111010",
      "000000001010011011000",
      "111111100000111100110",
      "100000100000111011111",
      "101110100011111010011",
      "101110100010000011000",
      "101110100010110111111",
      "100000100010110111100",
      "111111101101001010010",
    ],
  },
  {
    value: "https://gpuixui.dev/docs/components/qr-code?platform=macos&level=Q",
    level: "Q",
    version: 6,
    mask: 2,
    rows: [
      "11111110101111000010110110001111101111111",
      "10000010010011111001001100010000001000001",
      "10111010010010001101100100100000101011101",
      "10111010010100110011101100010001001011101",
      "10111010110101100101010000101001101011101",
      "10000010111111000101110000111100101000001",
      "11111110101010101010101010101010101111111",
      "00000000011100001001010000111001100000000",
      "01111111000000000110101001111101000110001",
      "10111001001111011110111001001101111110101",
      "11001011011011011101010101110000100010000",
      "10111100110100110100111110010001100111001",
      "11111011011110001100010101100101100101101",
      "10100001111101011110110011111001001111111",
      "11100111011111010011000000100010010101110",
      "10011001110001001100011010101000101011011",
      "11110111101010111011000011001101010100110",
      "11011101011000111100110101101001101111111",
      "01101110111010110111011001111010010011010",
      "01011100001111010100111011001000001011011",
      "01111010101110001100100000100010010000100",
      "10001001001101110011110101001011111110011",
      "10110011001101100100010000010010100011100",
      "11110000101100011011111100101011000100011",
      "01111110000010000110111111001100010000110",
      "11010101100101111100100100001001001111011",
      "11000011110001110111011010111010100100000",
      "00100001001110111010101000010011111101001",
      "10110011110011001011101011101101000001110",
      "11110100011110100000001001110011111111001",
      "10000010101101011101110110111000111100000",
      "10000000010100100010001100110010111101000",
      "10110010110001111101001111110100111110110",
      "00000000100110010011011100001111100010001",
      "11111110100111110111011000010101101011100",
      "10000010111011100100100000101111100011000",
      "10111010110111010000100110010000111110100",
      "10111010100110110101010111101011110101010",
      "10111010101001000101011001111001111110100",
      "10000010100001111101001110001000101011010",
      "11111110000111101000011011100101001110100",
    ],
  },
  {
    value: "x".repeat(250),
    level: "L",
    version: 10,
    mask: 0,
    rows: [
      "111111100101110111011101111011101110111011101011001111111",
      "100000100110111101110111001110111011101110111101001000001",
      "101110101110001000100010000100010001000100010011001011101",
      "101110100100100100000001010001000100010001000001001011101",
      "101110100001010101001101001111101110111011101101001011101",
      "100000100111111111100111101000111011101110111010001000001",
      "111111101010101010101010101010101010101010101010101111111",
      "000000001100110011010100101000101110111011101111100000000",
      "111011111111011101110111011111111011101110111011011000100",
      "111001001100101000100010011100010001000100010000000101101",
      "000100100111001011001010101001000100010001000100110000111",
      "110110011101100111111001100011101110111011101111111010010",
      "010000100010101101010011010110111011101110111011001111000",
      "011001010111000001000000011100010001000100010000000101101",
      "111111111010000010001000101001000100010001000100110000111",
      "000100011010110111011101100011101110111011101111111010010",
      "011101111100011101110111010110111011101110111011001111000",
      "011101011000101000100010011100010001000100010000000101101",
      "011110101100110010001000101001000100010001000100110000111",
      "011000000100011111011101100011101110111011101111111010010",
      "111111101100110111101111110110111011101110111011001111000",
      "001101001110010100101011011100010001000100010000000101101",
      "011111111010010110000001101001000100010001000100110000111",
      "010110011000010101001101010011101110111011101111111010011",
      "010100110000010101110111001110111011101110111011001111000",
      "101010001100111000100010011100010001000100010000000101101",
      "111111111001011010101100101111100100010001000100111110111",
      "001110001001100110011111111000101110111011101111100010010",
      "000010101010010100110101001010111011101110111010101011000",
      "101110001101100000000100001000110001000100010000100011101",
      "111111111101011010001000111111100100010001000101111110111",
      "110100001010011111011101101110101110111011101110101110010",
      "100000110001101101110111001100011011101110111010100101000",
      "001111010001111000100010010001010001000100010001010001101",
      "100101111111101010001000110011100100010001000101011010111",
      "101011011110001111011101101110101110111011101110101110010",
      "111011101001111011111110101100011011101110111010100101000",
      "101110010011111010110010110001010001000100010001010001101",
      "111001100111011000011000010011100100010001000101011010110",
      "110001011100100011010100101110101110111011101110101110010",
      "011001110100111101110111010100011011101110111010100101001",
      "111001001101100000100010000001010001000100010001010001101",
      "001000111110101011001010100011100100010001000101011010111",
      "111101011011100111111001100110101110111011101110101110010",
      "100010110110001101010011001100011011101110111010100101000",
      "100101011000101001000000010001010001000100010001010001101",
      "101001101110111010001000110011100100010001000101011010111",
      "111110011010011111011101101110101110111011101110101110010",
      "000000110001011101110111001111111011101110111010111111000",
      "000000001001011000100010011000110001000100010001100011101",
      "111111101001001010001000101010100100010001000100101010111",
      "100000101011110111011101111000101110111011101111100010010",
      "101110101111100111101111111111111011101110111011111111000",
      "101110100011100100101011001011110001000100010000111011110",
      "101110101011001110000001100110100100010001000101101110101",
      "100000101110000101001101010100001110111011101111000100010",
      "111111101010110101110111011001011011101110111010010001011",
    ],
  },
];

const rowsOf = (symbol: QrSymbol): ReadonlyArray<string> =>
  Arr.map(symbol.matrix, (row) =>
    Arr.join(
      Arr.map(row, (dark) => (dark ? "1" : "0")),
      "",
    ),
  );

describe("encodeQr", () => {
  for (const reference of QR_REFERENCES) {
    it(`matches an independent encoder for a version-${reference.version} symbol`, () => {
      const result = encodeQr(reference.value, {
        level: reference.level,
        mask: reference.mask,
      });
      expect(result).toBeInstanceOf(QrSymbol);
      if (!(result instanceof QrSymbol)) return expect.fail("no symbol");
      expect(result.version).toBe(reference.version);
      expect(rowsOf(result)).toStrictEqual(reference.rows);
    });
  }

  it("refuses a value larger than the largest symbol, naming the capacity", () => {
    const capacity = qrByteCapacity(10, "M");
    const result = encodeQr("y".repeat(capacity + 1), { level: "M" });
    expect(result).toBeInstanceOf(QrOverflow);
    if (!(result instanceof QrOverflow)) return expect.fail("no overflow");
    expect(result.bytes).toBe(capacity + 1);
    expect(result.capacity).toBe(capacity);
  });

  it("fits a value at the exact capacity of version 10", () => {
    const capacity = qrByteCapacity(10, "M");
    const result = encodeQr("y".repeat(capacity), { level: "M" });
    expect(result).toBeInstanceOf(QrSymbol);
    if (result instanceof QrSymbol) expect(result.version).toBe(QR_MAX_VERSION);
  });

  it("selects the smallest version that holds the value", () => {
    for (const version of QR_VERSIONS) {
      const capacity = qrByteCapacity(version, "L");
      expect(Option.getOrNull(qrVersionFor(capacity, "L"))).toBe(version);
      const previous =
        version === 1 ? 0 : qrByteCapacity((version - 1) as QrVersion, "L");
      if (previous > 0) {
        expect(Option.getOrNull(qrVersionFor(previous + 1, "L"))).toBe(version);
      }
    }
  });

  it("spends more symbol for a stronger level", () => {
    const value = "z".repeat(40);
    const low = encodeQr(value, { level: "L" });
    const high = encodeQr(value, { level: "H" });
    expect(low).toBeInstanceOf(QrSymbol);
    expect(high).toBeInstanceOf(QrSymbol);
    if (low instanceof QrSymbol && high instanceof QrSymbol) {
      expect(high.version).toBeGreaterThan(low.version);
    }
  });

  it("picks the mask with the lowest penalty of the eight", () => {
    const value = "https://gpuixui.dev/docs";
    const auto = encodeQr(value, { level: "Q" });
    expect(auto).toBeInstanceOf(QrSymbol);
    if (!(auto instanceof QrSymbol)) return;
    const scores = Arr.map(
      Arr.makeBy(8, (mask) => mask),
      (mask) => {
        const candidate = encodeQr(value, { level: "Q", mask });
        if (!(candidate instanceof QrSymbol)) return Number.POSITIVE_INFINITY;
        return qrPenalty(candidate.matrix);
      },
    );
    expect(qrPenalty(auto.matrix)).toBe(Math.min(...scores));
  });

  it("writes a format field that names its own level and mask", () => {
    for (const level of ["L", "M", "Q", "H"] as const) {
      const result = encodeQr("format", { level });
      if (!(result instanceof QrSymbol)) return expect.fail("no symbol");
      const size = result.modules;
      const bit = (row: number, col: number): number =>
        result.isDark(row, col) ? 1 : 0;
      const positions = Arr.appendAll(
        Arr.appendAll(
          Arr.makeBy(6, (at) => [at, 8]),
          [
            [7, 8],
            [8, 8],
            [8, 7],
          ],
        ),
        Arr.makeBy(6, (at) => [8, 14 - (at + 9)]),
      );
      const read = Arr.reduce(
        positions,
        0,
        (bits, [row, col], at) => bits | (bit(row ?? 0, col ?? 0) << at),
      );
      expect(read).toBe(qrFormatBits(level, result.mask));
      const copy = Arr.reduce(
        Arr.makeBy(8, (at) => at),
        0,
        (bits, at) => bits | (bit(8, size - 1 - at) << at),
      );
      expect(copy).toBe(qrFormatBits(level, result.mask) & 0xff);
    }
  });

  it("writes the version field for versions 7 and up", () => {
    const result = encodeQr("v".repeat(120), { level: "Q" });
    if (!(result instanceof QrSymbol)) return expect.fail("no symbol");
    expect(result.version).toBeGreaterThanOrEqual(7);
    const read = Arr.reduce(
      Arr.makeBy(18, (at) => at),
      0,
      (bits, at) =>
        bits |
        ((result.isDark(Math.floor(at / 3), result.modules - 11 + (at % 3))
          ? 1
          : 0) <<
          at),
    );
    expect(read).toBe(qrVersionBits(result.version));
  });
});

describe("the symbol's function patterns", () => {
  it("draws three finder patterns, their separators and the timing strips", () => {
    for (const version of QR_VERSIONS) {
      const result = encodeQr("p".repeat(qrByteCapacity(version, "M")), {
        level: "M",
      });
      if (!(result instanceof QrSymbol)) return expect.fail("no symbol");
      expect(result.version).toBe(version);
      const size = qrModules(version);
      expect(result.matrix.length).toBe(size);
      expect(Arr.every(result.matrix, (row) => row.length === size)).toBe(true);
      for (const [top, left] of [
        [0, 0],
        [0, size - 7],
        [size - 7, 0],
      ] as const) {
        expect(result.isDark(top, left)).toBe(true);
        expect(result.isDark(top + 3, left + 3)).toBe(true);
        expect(result.isDark(top + 1, left + 1)).toBe(false);
        expect(result.isDark(top, left + 7)).toBe(false);
      }
      for (let at = 8; at < size - 8; at += 1) {
        expect(result.isDark(6, at)).toBe(at % 2 === 0);
        expect(result.isDark(at, 6)).toBe(at % 2 === 0);
      }
      expect(result.isDark(size - 8, 8)).toBe(true);
    }
  });
});

describe("qrPenalty", () => {
  const grid = (
    rows: ReadonlyArray<string>,
  ): ReadonlyArray<ReadonlyArray<boolean>> =>
    Arr.map(rows, (row) =>
      Arr.map(Arr.fromIterable(row), (cell) => cell === "1"),
    );

  it("charges five-module runs and 2×2 blocks on an all-light grid", () => {
    expect(qrPenalty(grid(Arr.makeBy(8, () => "00000000")))).toBe(343);
  });

  it("charges nothing for a balanced checkerboard", () => {
    const board = Arr.makeBy(8, (row) =>
      Arr.join(
        Arr.makeBy(8, (col) => ((row + col) % 2 === 0 ? "1" : "0")),
        "",
      ),
    );
    expect(qrPenalty(grid(board))).toBe(0);
  });

  it("charges the finder-shaped run when the quiet zone follows it", () => {
    // The four light modules a look-alike needs may cross the symbol's edge:
    // the quiet zone is as light as the modules inside it, so the pattern at
    // column 3 has its four after it (one cell plus three outside).
    const rows = Arr.makeBy(11, (row) =>
      row === 3 ? "00010111010" : "00000000000",
    );
    expect(qrPenalty(grid(rows))).toBe(551);
  });
});

describe("qrPlacement", () => {
  it("fits whole modules into the asked side, quiet zone included", () => {
    const symbol = encodeQr("place", { level: "L" });
    if (!(symbol instanceof QrSymbol)) return expect.fail("no symbol");
    expect(qrPlacement(symbol, 160)).toStrictEqual({
      module: 5,
      quiet: 4,
      side: 145,
      cells: 29,
    });
    expect(qrPlacement(symbol, 160, 0).cells).toBe(21);
    const bare = qrPlacement(symbol, 160, 0);
    expect(bare.module).toBe(7);
    expect(bare.side).toBe(147);
  });

  it("reads an unlayable side as the default rather than collapsing", () => {
    const symbol = encodeQr("place", { level: "L" });
    if (!(symbol instanceof QrSymbol)) return expect.fail("no symbol");
    expect(qrPlacement(symbol, Number.NaN).side).toBe(145);
    expect(qrPlacement(symbol, -20).side).toBe(145);
  });
});

describe("qrSvgSource", () => {
  it("carries every dark module and the quiet zone in one path", () => {
    const symbol = encodeQr("svg", { level: "L" });
    if (!(symbol instanceof QrSymbol)) return expect.fail("no symbol");
    const source = qrSvgSource(symbol, 4);
    const dark = Arr.reduce(
      Arr.map(symbol.matrix, (row) => Arr.filter(row, (cell) => cell)),
      0,
      (total, row) => total + row.length,
    );
    expect(source).toContain(
      `viewBox="0 0 ${symbol.modules + 8} ${symbol.modules + 8}"`,
    );
    expect(
      Arr.length(
        Arr.filter(Arr.fromIterable(source.matchAll(/M/g) ?? []), () => true),
      ),
    ).toBe(dark);
    expect(source).toContain('fill="#000"');
  });
});
