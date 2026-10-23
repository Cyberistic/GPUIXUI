/**
 * Holds the `qr-matrix` fixture, the probe that paints it, and the numbers the
 * README teaches.
 *
 * The gap this closes: Tier 5's *QR code* row claimed the runtime "provides
 * both routes" — a grid of `div`s and one `<svg>` — and left the claim at
 * `?`. The probe measures both in a window; this suite keeps the arithmetic it
 * paints and the prose a reader plans from pointing at the same numbers.
 *
 * The bug this guards is the fixture's own coordinate space. The scanned field
 * is the symbol **and** its quiet zone, while a module's box is the symbol's
 * own module grid; mixing the two sampled a quiet zone away from the module it
 * was compared with, and the probe reported 502 mismatches for a symbol that
 * painted exactly right. The cases below hold the two spaces apart, in both
 * directions.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  QR_CELLS,
  QR_CHECKS,
  QR_IDS,
  QR_INK,
  QR_INK_HEX,
  QR_MODULE,
  QR_MODULES,
  QR_PAPER,
  QR_PAPER_HEX,
  QR_QUIET,
  QR_SIDE,
  qrCellCentre,
  qrCellIsDark,
  qrDarkCells,
  qrInkPixels,
  qrMismatches,
  qrModule,
  qrModuleBox,
  qrPaperPixels,
  qrQuietCorners,
  qrReadout,
  qrSvgMarkup,
} from "./qr-matrix.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./qr-matrix-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

describe("the matrix", () => {
  it("is a version-1 symbol: 21 modules with three finder patterns", () => {
    expect(QR_MODULES).toBe(21);
    // A finder is a dark ring, a light ring and a 3×3 dark centre.
    expect(qrModule(0, 0)).toBe(true);
    expect(qrModule(1, 1)).toBe(false);
    expect(qrModule(3, 3)).toBe(true);
    expect(qrModule(6, 6)).toBe(true);
    // The separator is the light ring on the finder's inner sides.
    expect(qrModule(7, 0)).toBe(false);
    expect(qrModule(0, 7)).toBe(false);
    // The top-right finder: the separator is below it and to its left.
    expect(qrModule(0, 14)).toBe(true);
    expect(qrModule(3, 17)).toBe(true);
    expect(qrModule(7, 14)).toBe(false);
    expect(qrModule(0, 13)).toBe(false);
    // The bottom-left finder: the separator is above it and to its right.
    expect(qrModule(14, 0)).toBe(true);
    expect(qrModule(17, 3)).toBe(true);
    expect(qrModule(13, 0)).toBe(false);
    expect(qrModule(14, 7)).toBe(false);
    // The bottom-right finder: the separator is above it and to its left.
    expect(qrModule(14, 14)).toBe(true);
    expect(qrModule(13, 14)).toBe(false);
    expect(qrModule(14, 13)).toBe(false);
  });

  it("carries the two timing strips and the dark module", () => {
    // Row 6 and column 6 alternate between the finders, dark first and last.
    expect(qrModule(6, 8)).toBe(true);
    expect(qrModule(6, 9)).toBe(false);
    expect(qrModule(6, 10)).toBe(true);
    expect(qrModule(6, 12)).toBe(true);
    expect(qrModule(8, 6)).toBe(true);
    expect(qrModule(9, 6)).toBe(false);
    expect(qrModule(10, 6)).toBe(true);
    // The always-dark module below the top-left separator.
    expect(qrModule(13, 8)).toBe(true);
  });

  it("fills the data area unevenly, so a solid block cannot pass for a matrix", () => {
    const data = Arr.filter(Arr.range(0, QR_MODULES * QR_MODULES - 1), (at) => {
      const row = Math.floor(at / QR_MODULES);
      const col = at % QR_MODULES;
      return row > 8 && row < 12 && col > 8 && col < 12;
    });
    const dark = Arr.filter(data, (at) => {
      const row = Math.floor(at / QR_MODULES);
      const col = at % QR_MODULES;
      return qrModule(row, col);
    });
    expect(dark.length).toBeGreaterThan(0);
    expect(dark.length).toBeLessThan(data.length);
    // The whole symbol is neither empty nor solid.
    const cells = qrDarkCells();
    expect(cells.length).toBeGreaterThan(QR_MODULES * 8);
    expect(cells.length).toBeLessThan(QR_MODULES * QR_MODULES);
  });
});

describe("the two coordinate spaces", () => {
  it("puts a scanned field cell one module from the symbol's own origin", () => {
    // The field's first cell is the first quiet module, not the symbol's first
    // module: the quiet zone is a module step in.
    expect(qrCellCentre(0, 0)).toEqual({ x: QR_MODULE / 2, y: QR_MODULE / 2 });
    expect(qrCellCentre(QR_CELLS - 1, QR_CELLS - 1)).toEqual({
      x: (QR_CELLS - 0.5) * QR_MODULE,
      y: (QR_CELLS - 0.5) * QR_MODULE,
    });
  });

  it("puts a module's box a quiet zone in", () => {
    // The matrix's first module starts after the quiet zone.
    expect(qrModuleBox(0, 0)).toEqual({
      x: QR_QUIET * QR_MODULE,
      y: QR_QUIET * QR_MODULE,
      width: QR_MODULE,
      height: QR_MODULE,
    });
    expect(qrModuleBox(QR_MODULES - 1, QR_MODULES - 1)).toEqual({
      x: (QR_QUIET + QR_MODULES - 1) * QR_MODULE,
      y: (QR_QUIET + QR_MODULES - 1) * QR_MODULE,
      width: QR_MODULE,
      height: QR_MODULE,
    });
  });

  it("reads the field and the matrix in the same space", () => {
    // The field's cell (4, 4) is the matrix's module (0, 0), so the field
    // predicate and the sample point must agree on it.
    expect(qrCellIsDark(4, 4)).toBe(qrModule(0, 0));
    expect(qrCellIsDark(0, 0)).toBe(false);
    expect(qrCellIsDark(QR_CELLS - 1, QR_CELLS - 1)).toBe(false);
    // A field cell's centre sits inside the module the predicate names.
    const centre = qrCellCentre(4, 4);
    expect(centre.x).toBeGreaterThanOrEqual(qrModuleBox(0, 0).x);
    expect(centre.x).toBeLessThan(qrModuleBox(0, 0).x + QR_MODULE);
  });

  it("finds no mismatch in a symbol that paints exactly right", () => {
    const sample = (row: number, col: number): Option.Option<boolean> =>
      Option.some(qrCellIsDark(row, col));
    expect(qrMismatches(sample)).toBe(0);
  });

  it("finds every mismatch in a sample a quiet zone away", () => {
    // The defect the fixture had: the sample was taken a quiet zone from the
    // module it was compared with, so a correct symbol read as wrong.
    const shifted = (row: number, col: number): Option.Option<boolean> =>
      Option.some(qrCellIsDark(row + QR_QUIET, col + QR_QUIET));
    expect(qrMismatches(shifted)).toBeGreaterThan(0);
  });

  it("counts a cell the capture cannot hold as a mismatch", () => {
    expect(qrMismatches(() => Option.none())).toBe(QR_CELLS * QR_CELLS);
  });

  it("names the quiet zone's four corners in the scanned field", () => {
    expect(qrQuietCorners).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: QR_CELLS - 1 },
      { row: QR_CELLS - 1, col: 0 },
      { row: QR_CELLS - 1, col: QR_CELLS - 1 },
    ]);
    // Every corner is paper, and every corner is outside the symbol.
    expect(
      Arr.every(qrQuietCorners, ({ row, col }) => !qrCellIsDark(row, col)),
    ).toBe(true);
  });
});

describe("the painted arithmetic", () => {
  it("adds the ink and the paper to the frame's own area", () => {
    expect(QR_SIDE).toBe(QR_CELLS * QR_MODULE);
    expect(QR_CELLS).toBe(QR_MODULES + 2 * QR_QUIET);
    Arr.forEach([1, 2, 3], (scale) => {
      expect(qrInkPixels(scale) + qrPaperPixels(scale)).toBe(
        QR_SIDE * QR_SIDE * scale * scale,
      );
    });
    expect(qrInkPixels(2)).toBe(
      qrDarkCells().length * QR_MODULE * QR_MODULE * 4,
    );
  });

  it("paints a fixed polarity, so a symbol is dark on light under any theme", () => {
    expect(QR_INK_HEX).toBe("#111111");
    expect(QR_PAPER_HEX).toBe("#FFFFFF");
    expect(QR_INK).toEqual({ r: 0x11, g: 0x11, b: 0x11 });
    expect(QR_PAPER).toEqual({ r: 0xff, g: 0xff, b: 0xff });
  });

  it("writes one rectangle per dark module, in the symbol's own coordinates", () => {
    const markup = qrSvgMarkup();
    const rects = [...markup.matchAll(/<rect /g)];
    expect(rects.length).toBe(qrDarkCells().length);
    // The mask the runtime paints is one tint, so every shape is black.
    expect(markup.match(/fill="#000"/g)?.length).toBe(qrDarkCells().length);
    const first = qrModuleBox(0, 0);
    expect(markup).toContain(
      `<rect x="${first.x}" y="${first.y}" width="${first.width}" height="${first.height}" fill="#000"/>`,
    );
    // The view box is the symbol's own side, so the mask is not scaled.
    expect(markup).toContain(`viewBox="0 0 ${QR_SIDE} ${QR_SIDE}"`);
  });

  it("prints the matrix it paints", () => {
    expect(qrReadout()).toBe(
      `qr=21x21 dark=${qrDarkCells().length} side=${QR_SIDE} quiet=${QR_QUIET}`,
    );
  });
});

describe("the probe and the registry", () => {
  it("registers the probe as a content measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "qr-matrix",
      title:
        "Content: a 21×21 matrix paints the same module for module as a grid of boxes and as one tinted svg mask, and its quiet zone stays paper",
      capability: "content",
    });
    expect(QR_IDS.grid).toBe("qr-grid");
    expect(QR_IDS.svg).toBe("qr-svg");
  });

  it("mounts the probe in the live registry", () => {
    expect(scenarios).toContain(
      'import { QrMatrixProbe, qrMatrixSteps } from "./qr-matrix-probe.js";',
    );
    expect(scenarios).toContain('"qr-matrix": {');
    expect(scenarios).toContain("view: () => <QrMatrixProbe />,");
    expect(scenarios).toContain("steps: qrMatrixSteps,");
  });

  it("drives both routes through the fixture", () => {
    // A probe that re-implemented the matrix could pass while the README
    // taught the fixture's numbers, so the composition is the claim.
    expect(probe).toContain("qrDarkCells()");
    expect(probe).toContain("qrModuleBox(cell.row, cell.col)");
    expect(probe).toContain("qrSvgMarkup()");
    expect(probe).toContain("qrMismatches(");
    expect(probe).toContain("qrCellCentre(row, col)");
    expect(probe).toContain("qrQuietCorners");
  });

  it("counts the checks the probe can assert", () => {
    // The printed count is the run's own, so it cannot be derived statically;
    // the assertion sites are the floor a hollow probe cannot fall below.
    const steps = probe.slice(probe.indexOf("export const qrMatrixSteps"));
    const sites = Arr.length(
      Arr.fromIterable(steps.matchAll(/ctx\.expect[A-Za-z]+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(QR_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain("### `qr-matrix` — measured on 0.11.0 here");
    expect(readme).toContain(`${QR_CHECKS} checks`);
    expect(readme).toContain("`src/live/qr-matrix.ts`");
    expect(readme).toContain("qr-matrix.test.ts");
  });

  it("prints the values the fixture computes", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(qrReadout());
    expect(flat).toContain(String(qrInkPixels(2)));
    expect(flat).toContain(String(qrDarkCells().length));
    expect(flat).toContain(String(QR_SIDE));
    expect(flat).toContain(String(QR_QUIET));
  });

  it("names the limits it did not measure rather than implying them", () => {
    // The probe paints a synthetic matrix: it says nothing about a real
    // encoder's error correction, and a page that implied otherwise would
    // promise a scannable symbol the probe never made.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("synthetic");
    expect(flat).toContain("no encoder");
  });
});
