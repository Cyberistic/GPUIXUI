/**
 * Holds the document-type probe's arithmetic and the claims its README section
 * prints.
 *
 * The probe's subject is a hand-off nothing had measured: `nativeTextTheme`
 * promises a `<code>`/`<diff>`/`<markdown>` host the type scale's metrics, and
 * only the pinned source said so. The fixture derives every expected number
 * from that seam, so a role change cannot leave the probe asserting an old size,
 * and the band reader is exercised on synthetic frames here — a band that
 * merges two lines, or a wash read that misses the side border, would make the
 * window measurement meaningless.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import {
  CODE_LEADING,
  CODE_LEADING_GAIN,
  CODE_SIZE,
  DIFF_LEADING_GAIN,
  DOCUMENT_TYPE_CHECKS,
  DOCUMENT_TYPE_HOST,
  DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_THEME,
  HEADER_HEIGHT,
  HEADER_INSET_X,
  HEADER_INSET_Y,
  HEADER_SIDE_INSET,
  HEADER_TOP_INSET,
  RUNTIME_CODE_LEADING,
  RUNTIME_CODE_SIZE,
  RUNTIME_DIFF_LEADING,
  RUNTIME_HEADER_SIZE,
  bandHeight,
  bandsOf,
  headerBands,
  inkBands,
  near,
} from "./document-type.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const view = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

/** The `documentTypeSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = view.indexOf("const documentTypeSteps");
  if (start === -1) return "";
  const after = [
    view.indexOf("\nconst ", start + 1),
    view.indexOf("\nexport const ", start + 1),
    view.indexOf("\n/** The bodies", start + 1),
  ].filter((end) => end > start);
  return view.slice(
    start,
    after.length === 0 ? view.length : Math.min(...after),
  );
})();

const PAGE = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });
const INK = new Pixels.Rgba({ r: 255, g: 255, b: 255, a: 255 });

/** A frame of `width × height` whose listed rows paint `ink` at `columns`. */
const frameOf = (
  width: number,
  height: number,
  inkRows: ReadonlyArray<number>,
  columns: { readonly from: number; readonly to: number } = {
    from: 0,
    to: width,
  },
): Pixels.Pixels => {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const at = (row * width + column) * 4;
      const colour =
        inkRows.includes(row) && column >= columns.from && column < columns.to
          ? INK
          : PAGE;
      data[at] = colour.r;
      data[at + 1] = colour.g;
      data[at + 2] = colour.b;
      data[at + 3] = colour.a;
    }
  }
  return new Pixels.Pixels({ width, height, data });
};

describe("the band reader", () => {
  it("turns consecutive rows into one band and keeps gaps apart", () => {
    expect(bandsOf([])).toEqual([]);
    expect(bandsOf([4])).toEqual([{ top: 4, bottom: 4 }]);
    expect(bandsOf([4, 5, 6, 9, 10])).toEqual([
      { top: 4, bottom: 6 },
      { top: 9, bottom: 10 },
    ]);
    // The contract is ascending, distinct rows; one row is one band either
    // way, and the walk does not fuse a gap.
    expect(bandsOf([2, 3])).toEqual([{ top: 2, bottom: 3 }]);
    expect(bandsOf([0, 4])).toEqual([
      { top: 0, bottom: 0 },
      { top: 4, bottom: 4 },
    ]);
  });

  it("measures a band's painted height", () => {
    expect(bandHeight({ top: 3, bottom: 8 })).toBe(6);
    expect(bandHeight({ top: 3, bottom: 3 })).toBe(1);
  });

  it("reports a size within its slack and not past it", () => {
    expect(near(26, 26)).toBe(true);
    expect(near(17, 16, 1)).toBe(true);
    expect(near(17, 16)).toBe(true);
    expect(near(20, 16)).toBe(false);
    expect(near(26, 26)).toBe(true);
  });
});

describe("the block's ink", () => {
  it("finds one band per code line against the page", () => {
    // Two 4-row lines with a 2-row gap, both narrower than the crop so the
    // margins are page.
    const frame = frameOf(40, 20, [2, 3, 4, 5, 8, 9, 10, 11], {
      from: 4,
      to: 20,
    });
    const bands = inkBands(frame, PAGE);
    expect(bands).toEqual([
      { top: 2, bottom: 5 },
      { top: 8, bottom: 11 },
    ]);
    expect(bandHeight(bands[0] ?? { top: 0, bottom: -1 })).toBe(4);
  });

  it("reports no band when every row is the reference", () => {
    expect(inkBands(frameOf(8, 8, []), PAGE)).toEqual([]);
    // A frame that is entirely ink is one band, not none.
    expect(inkBands(frameOf(8, 8, [0, 1, 2, 3, 4, 5, 6, 7]), PAGE)).toEqual([
      { top: 0, bottom: 7 },
    ]);
  });
});

describe("the language strip", () => {
  it("reads the text against the strip's wash, off the card's borders", () => {
    // A card: white top/side borders, a grey wash, and one white text run.
    const width = 60;
    const height = 30;
    const wash = 10;
    const data = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const at = (row * width + column) * 4;
        const border = row <= 1 || column <= 1 || column >= width - 2;
        const text = row >= 8 && row <= 10 && column >= 12 && column <= 24;
        const value = border || text ? 255 : wash;
        data[at] = value;
        data[at + 1] = value;
        data[at + 2] = value;
        data[at + 3] = 255;
      }
    }
    const bands = headerBands(new Pixels.Pixels({ width, height, data }), 1);
    expect(bands[0]).toEqual({ top: 5, bottom: 7 });
    expect(bandHeight(bands[0] ?? { top: 0, bottom: -1 })).toBe(3);
  });

  it("samples its wash and top inside the card it reads", () => {
    expect(HEADER_INSET_Y).toBeLessThan(HEADER_HEIGHT);
    expect(HEADER_TOP_INSET).toBeLessThan(HEADER_HEIGHT);
    expect(HEADER_SIDE_INSET).toBeGreaterThan(1);
    expect(HEADER_INSET_X).toBeGreaterThanOrEqual(HEADER_SIDE_INSET);
  });
});

describe("the theme the probe hands over", () => {
  it("names a code role the runtime's own size cannot satisfy", () => {
    expect(DOCUMENT_TYPE_THEME.typography.codeBlock.fontSize).toBe(CODE_SIZE);
    expect(DOCUMENT_TYPE_THEME.typography.codeBlock.lineHeight).toBe(
      CODE_LEADING,
    );
    expect(DOCUMENT_TYPE_THEME.typography.caption.fontSize).toBe(18);
    expect(CODE_SIZE).not.toBe(RUNTIME_CODE_SIZE);
    expect(CODE_LEADING).not.toBe(RUNTIME_CODE_LEADING);
    expect(18).not.toBe(RUNTIME_HEADER_SIZE);
  });

  it("carries that role through the seam the hosts read", () => {
    // The one mapping the probe is evidence for: the object handed to a host
    // names the role's numbers, not a second table.
    expect(DOCUMENT_TYPE_HOST.metrics?.codeTextSize).toBe(CODE_SIZE);
    expect(DOCUMENT_TYPE_HOST.metrics?.codeLineHeight).toBe(CODE_LEADING);
    expect(DOCUMENT_TYPE_HOST.metrics?.diffTextSize).toBe(CODE_SIZE);
    expect(DOCUMENT_TYPE_HOST.metrics?.diffLineHeight).toBe(CODE_LEADING);
    expect(DOCUMENT_TYPE_HOST.metrics?.mdCodeHeaderTextSize).toBe(18);
  });

  it("derives the two gains the window measures", () => {
    expect(CODE_LEADING_GAIN).toBe(2 * (CODE_LEADING - RUNTIME_CODE_LEADING));
    expect(DIFF_LEADING_GAIN).toBe(4 * (CODE_LEADING - RUNTIME_DIFF_LEADING));
    expect(CODE_LEADING_GAIN).toBe(12);
    expect(DIFF_LEADING_GAIN).toBe(12);
  });
});

describe("the document-type probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "document-type"),
    ).toEqual([
      {
        id: "document-type",
        title: expect.stringContaining("the theme hands it"),
        capability: "text",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `document-type` — measured on 0.11.0 here");
  });

  it("prints the number of checks the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only document-type`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(DOCUMENT_TYPE_CHECKS);
    expect(DOCUMENT_TYPE_CHECKS).toBe(11);
  });

  it("asks the view for every host and the band reader", () => {
    expect(view).toContain("theme={DOCUMENT_TYPE_HOST}");
    expect(steps).toContain("inkBands(");
    expect(steps).toContain("headerBands(");
    expect(steps).toContain("near(");
    expect(steps).toContain('ctx.host.capture("document-type")');
    expect(view).toContain("testId={DOCUMENT_TYPE_IDS.diffThemed}");
    expect(view).toContain("testId={DOCUMENT_TYPE_IDS.markdownThemed}");
    expect(view).toContain("testId={DOCUMENT_TYPE_IDS.codePlain}");
  });

  it("prints the measured sizes, the stripped values and the controls", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("12.5/18");
    expect(flat).toContain("20/24");
    expect(flat).toContain("the runtime's 11");
    // The exact band heights the window read, so a palette or font move that
    // changes them fails the sentence rather than passing silently.
    expect(flat).toContain("32");
    expect(flat).toContain("26");
    expect(flat).toContain("expected 32, got 20");
    expect(flat).toContain("expected 12, got 0");
  });
});

describe("the id table", () => {
  it("keeps every id distinct", () => {
    expect(new Set(Object.values(DOCUMENT_TYPE_IDS)).size).toBe(
      Object.keys(DOCUMENT_TYPE_IDS).length,
    );
  });
});
