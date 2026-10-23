/**
 * The type a document host actually paints, for the `document-type` probe.
 *
 * `nativeTextTheme` hands a `<code>`, `<diff>` or `<markdown>` host the type
 * scale's own metrics — the code role's size and leading, the body role's, the
 * caption's for a fenced card's language strip — and that hand-off has only ever
 * been read from the pinned source (`MetricsOverride` is `camelCase`). A brand
 * that rescales its code role is promised a paint nobody measured.
 *
 * The probe gives the seam a theme whose roles are unmistakable — `codeBlock`
 * 20/24 against the runtime's 12.5/18, the caption 18 against its 11 — and
 * measures three things a window can show:
 *
 * - **a block's glyph and line**: the ink height of one code line against a
 *   `<text>` painted at 20 (and a second at the runtime's 12.5), and the
 *   distance between two lines, which the host lays out at its leading;
 * - **a diff row's advance**: the same four-row patch in a themed and a plain
 *   host, whose height difference is the four rows' leading difference;
 * - **a fenced card's language strip**: the language text's ink against a
 *   caption-sized `<text>` and the runtime's own 11.
 *
 * The arithmetic lives here rather than in the view so the band reader and the
 * expectations can be held without a window: a row is ink when a pixel differs
 * from the page (a `<code>` paints no surface), and the language strip is read
 * by the exact `mutedForeground` glyph pixels it paints, because the card's
 * washes are not the page.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import {
  extendTheme,
  nativeTextTheme,
  type NativeTextTheme,
  type Theme,
} from "@gpuixui/tokens";
import { palettes } from "../palettes.js";

/** The ids the view and the steps share. */
export const DOCUMENT_TYPE_IDS = {
  probe: "document-type-probe",
  codeThemed: "document-code-themed",
  codePlain: "document-code-plain",
  codeCalibration: "document-code-calibration",
  codeRuntimeCalibration: "document-code-runtime-calibration",
  diffThemed: "document-diff-themed",
  diffPlain: "document-diff-plain",
  markdownThemed: "document-markdown-themed",
  markdownPlain: "document-markdown-plain",
  captionCalibration: "document-caption-calibration",
  headerRuntimeCalibration: "document-header-runtime-calibration",
} as const;

/** Two identical cap-only lines: one ink band each, with no descender. */
export const CODE_SAMPLE = "HAMBURG\nHAMBURG";

/**
 * A four-row patch: two removed and two added lines.
 *
 * The file and hunk headers are fixed heights, so the only thing the theme
 * changes is the four rows' own leading.
 */
export const PATCH_SAMPLE = [
  "--- a/app.ts",
  "+++ b/app.ts",
  "@@ -1,2 +1,2 @@",
  "-const one = 1",
  "-const two = 2",
  "+HAMBURG",
  "+HAMBURG",
].join("\n");

/** One fenced line in a language-tagged card: the strip is the thing measured. */
export const MARKDOWN_SAMPLE = "```ts\nHAMBURG\n```";

/** The code role the probe asks the host to paint. */
export const CODE_SIZE = 20;
/** The code role's leading. */
export const CODE_LEADING = 24;

/** The caption size a fenced card's language strip takes. */
export const CAPTION_SIZE = 18;

/** The pinned runtime's own code size (`Metrics::default`). */
export const RUNTIME_CODE_SIZE = 12.5;
/** The pinned runtime's own code leading. */
export const RUNTIME_CODE_LEADING = 18;
/** The pinned runtime's own diff leading. */
export const RUNTIME_DIFF_LEADING = 21;
/** The pinned runtime's own language-strip size. */
export const RUNTIME_HEADER_SIZE = 11;

/** The four rows the patch changes. */
export const DIFF_ROWS = 4;

/** A theme whose code and caption roles cannot be confused with the defaults. */
export const DOCUMENT_TYPE_THEME: Theme = extendTheme(palettes.dark, {
  typography: {
    codeBlock: { fontSize: CODE_SIZE, lineHeight: CODE_LEADING },
    caption: { fontSize: CAPTION_SIZE },
  },
});

/** The object the seam hands every host. */
export const DOCUMENT_TYPE_HOST: NativeTextTheme =
  nativeTextTheme(DOCUMENT_TYPE_THEME);

/** One run of consecutive ink rows in a crop. */
export interface InkBand {
  readonly top: number;
  readonly bottom: number;
}

/** How many pixels may differ on one channel and still count as the page. */
export const INK_TOLERANCE = 12;

/**
 * Whether one row of the frame paints anything but `reference`.
 *
 * The two row readers walk the raw bytes instead of `Pixels.pixelAt`, which
 * allocates an `Rgba` for every pixel of a device-scaled crop.
 */
const rowHasInk = (
  frame: Pixels.Pixels,
  row: number,
  reference: Pixels.Rgba,
): boolean => {
  for (let column = 0; column < frame.width; column += 1) {
    const at = (row * frame.width + column) * 4;
    if (
      Math.abs((frame.data[at] ?? 0) - reference.r) > INK_TOLERANCE ||
      Math.abs((frame.data[at + 1] ?? 0) - reference.g) > INK_TOLERANCE ||
      Math.abs((frame.data[at + 2] ?? 0) - reference.b) > INK_TOLERANCE
    ) {
      return true;
    }
  }
  return false;
};

/**
 * The bands a set of rows forms: a consecutive run is one band.
 *
 * `rows` is ascending; a start is a row whose predecessor is not one less, and
 * an end a row whose successor is not one more, so the pairing is positional.
 */
export const bandsOf = (
  rows: ReadonlyArray<number>,
): ReadonlyArray<InkBand> => {
  const starts = Arr.filter(
    rows,
    (row, index) => index === 0 || rows[index - 1] !== row - 1,
  );
  const ends = Arr.filter(
    rows,
    (row, index) =>
      index === Arr.length(rows) - 1 || rows[index + 1] !== row + 1,
  );
  return Arr.map(starts, (top, index) => ({
    top,
    bottom: ends[index] ?? top,
  }));
};

/** The descending rows that paint anything but `reference`. */
export const inkRows = (
  frame: Pixels.Pixels,
  reference: Pixels.Rgba,
): ReadonlyArray<number> =>
  Arr.filter(
    Arr.makeBy(frame.height, (row) => row),
    (row) => rowHasInk(frame, row, reference),
  );

/** The bands of a frame against the page it is painted on. */
export const inkBands = (
  frame: Pixels.Pixels,
  reference: Pixels.Rgba,
): ReadonlyArray<InkBand> => bandsOf(inkRows(frame, reference));

/** How much of a fenced card's top a language strip can occupy, in logical px. */
export const HEADER_HEIGHT = 48;

/** Where inside the strip's right padding its own wash is sampled. */
export const HEADER_INSET_X = 6;

/** How far below the card's top border the wash is sampled. */
export const HEADER_INSET_Y = 8;

/** How far the band read starts below the border, clearing the rounded edge. */
export const HEADER_TOP_INSET = 3;

/** How far the band read stays off the card's side borders. */
export const HEADER_SIDE_INSET = 6;

/**
 * The language strip's ink bands, read against the strip's own wash.
 *
 * A fenced card paints a wash over the page, so the page is not the reference
 * here. The strip has horizontal padding (`mdCodePaddingX`, 12) and a vertical
 * one (`mdCodeHeaderPaddingY`, 5), so a point 6 in from the right edge and 8
 * down is inside the wash and clear of the text. The read starts 3 below the
 * top border and stays 6 off each side, because the card's own border and
 * rounded corner are ink on every row; it is bounded to the top of the card
 * because the body below is a different wash.
 */
export const headerBands = (
  crop: Pixels.Pixels,
  scale: number,
): ReadonlyArray<InkBand> => {
  const wash = Option.fromNullishOr(
    Pixels.pixelAt(
      crop,
      crop.width - Math.round(HEADER_INSET_X * scale),
      Math.round(HEADER_INSET_Y * scale),
    ),
  );
  const side = Math.round(HEADER_SIDE_INSET * scale);
  const top = Math.round(HEADER_TOP_INSET * scale);
  return Option.match(wash, {
    onNone: () => [],
    onSome: (colour) =>
      Option.match(
        Option.fromNullishOr(
          Pixels.crop(
            crop,
            new Pixels.PixelRegion({
              x: side,
              y: top,
              width: crop.width - side * 2,
              height: Math.min(
                crop.height - top,
                Math.round((HEADER_HEIGHT - HEADER_TOP_INSET) * scale),
              ),
            }),
          ),
        ),
        {
          onNone: () => [],
          onSome: (strip) => inkBands(strip, colour),
        },
      ),
  });
};

/** A band's painted height in device pixels. */
export const bandHeight = (band: InkBand): number => band.bottom - band.top + 1;

/** The distance from the first band's top to the second's. */
export const bandAdvance = (
  bands: ReadonlyArray<InkBand>,
): Option.Option<number> =>
  Option.map(
    Option.all([Arr.get(bands, 0), Arr.get(bands, 1)]),
    ([first, second]) => second.top - first.top,
  );

/** The two values a measurement compares, in the report's own spelling. */
export const near = (measured: number, expected: number, slack = 2): boolean =>
  Math.abs(measured - expected) <= slack;

/** The height a four-row patch gains from the theme's leading. */
export const DIFF_LEADING_GAIN =
  DIFF_ROWS * (CODE_LEADING - RUNTIME_DIFF_LEADING);

/** The height a two-line block gains from the theme's leading. */
export const CODE_LEADING_GAIN = 2 * (CODE_LEADING - RUNTIME_CODE_LEADING);

/**
 * How many checks the probe asserts: the scale, the page colour, the three code
 * paints, both blocks' two-line advance, the diff's four-row gain, the strip's
 * two paints and the size that moved with it.
 */
export const DOCUMENT_TYPE_CHECKS = 11;
