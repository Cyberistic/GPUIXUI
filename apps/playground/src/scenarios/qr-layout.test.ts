/**
 * The QR geometry rules (plan `518`).
 *
 * The bug these guard: a renderer that drops the quiet zone, swaps the row/col
 * axes, or emits one path command per matrix cell instead of per **dark** module
 * still looks like a QR at a glance but is not the fixture's code. The counts
 * also pin the committed fixtures to the encoder output they were generated from.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { QR_V1, QR_V4 } from "./qr-fixtures.js";
import {
  darkModules,
  dataUrl,
  matrixSize,
  moduleOrigin,
  modulePath,
  svgSource,
} from "./qr-layout.js";

const V1 = { module: 6, quiet: 4 } as const;
const V4 = { module: 4, quiet: 4 } as const;

const commands = (path: string): number => Arr.length(Str.split("M")(path)) - 1;

describe("the fixtures", () => {
  it("are square, 21 and 33 modules across", () => {
    expect(QR_V1.matrix).toHaveLength(21);
    expect(QR_V1.matrix.every((row) => row.length === 21)).toBe(true);
    expect(QR_V4.matrix).toHaveLength(33);
    expect(QR_V4.matrix.every((row) => row.length === 33)).toBe(true);
  });

  it("hold the encoder's dark-module counts", () => {
    expect(darkModules(QR_V1.matrix)).toHaveLength(226);
    expect(darkModules(QR_V4.matrix)).toHaveLength(591);
  });
});

describe("moduleOrigin", () => {
  it("offsets by the quiet zone on both axes", () => {
    expect(moduleOrigin(0, 0, V1)).toEqual({ x: 24, y: 24, size: 6 });
    expect(moduleOrigin(3, 3, V1)).toEqual({ x: 42, y: 42, size: 6 });
    expect(moduleOrigin(6, 0, V1)).toEqual({ x: 24, y: 60, size: 6 });
    expect(moduleOrigin(0, 6, V1)).toEqual({ x: 60, y: 24, size: 6 });
  });

  it("treats row and column independently", () => {
    expect(moduleOrigin(2, 5, { module: 10, quiet: 1 })).toEqual({
      x: 60,
      y: 30,
      size: 10,
    });
  });

  it("has no quiet zone when the spec asks for none", () => {
    expect(moduleOrigin(0, 0, { module: 6, quiet: 0 }).x).toBe(0);
  });
});

describe("matrixSize", () => {
  it("includes the quiet zone on both sides", () => {
    expect(matrixSize(QR_V1.matrix, V1)).toBe(174);
    expect(matrixSize(QR_V4.matrix, V4)).toBe(164);
  });

  it("changes with the module size", () => {
    expect(matrixSize(QR_V1.matrix, { module: 8, quiet: 4 })).toBe(232);
  });
});

describe("modulePath", () => {
  it("emits exactly one sub-path per dark module", () => {
    expect(commands(modulePath(QR_V1.matrix, V1))).toBe(226);
    expect(commands(modulePath(QR_V4.matrix, V4))).toBe(591);
  });

  it("starts at the first module and ends at the last", () => {
    const path = modulePath(QR_V1.matrix, V1);
    expect(Str.startsWith("M24 24h6v6h-6z")(path)).toBe(true);
    expect(Str.endsWith("M144 144h6v6h-6z")(path)).toBe(true);
  });

  it("draws only dark modules", () => {
    const path = modulePath(QR_V1.matrix, V1);
    // (1, 1) is the light ring inside the top-left finder.
    expect(Str.includes("M30 30h6v6h-6z")(path)).toBe(false);
  });
});

describe("svgSource", () => {
  it("declares the painted size and one path", () => {
    const svg = svgSource(QR_V1.matrix, V1, Option.none());
    expect(Str.includes('width="174" height="174"')(svg)).toBe(true);
    expect(Str.includes('viewBox="0 0 174 174"')(svg)).toBe(true);
    expect(commands(svg)).toBe(226);
  });

  it("adds a background rect only when asked", () => {
    const plain = svgSource(QR_V1.matrix, V1, Option.none());
    const backed = svgSource(QR_V1.matrix, V1, Option.some("#ffffff"));
    expect(Str.includes("<rect")(plain)).toBe(false);
    expect(
      Str.includes(
        '<rect x="0" y="0" width="174" height="174" fill="#ffffff"/>',
      )(backed),
    ).toBe(true);
  });
});

describe("dataUrl", () => {
  it("percent-encodes the document", () => {
    const url = dataUrl(svgSource(QR_V1.matrix, V1, Option.none()));
    expect(Str.startsWith("data:image/svg+xml;charset=utf-8,")(url)).toBe(true);
    expect(Str.includes("%3Csvg")(url)).toBe(true);
    expect(Str.includes("<svg")(url)).toBe(false);
  });
});
