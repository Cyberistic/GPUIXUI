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

export const CODE_SAMPLE = "HAMBURG\nHAMBURG";

export const PATCH_SAMPLE = [
  "--- a/app.ts",
  "+++ b/app.ts",
  "@@ -1,2 +1,2 @@",
  "-const one = 1",
  "-const two = 2",
  "+HAMBURG",
  "+HAMBURG",
].join("\n");

export const MARKDOWN_SAMPLE = "```ts\nHAMBURG\n```";

export const CODE_SIZE = 20;

export const CODE_LEADING = 24;

export const CAPTION_SIZE = 18;

export const RUNTIME_CODE_SIZE = 12.5;

export const RUNTIME_CODE_LEADING = 18;

export const RUNTIME_DIFF_LEADING = 21;

export const RUNTIME_HEADER_SIZE = 11;

export const DIFF_ROWS = 4;

export const DOCUMENT_TYPE_THEME: Theme = extendTheme(palettes.dark, {
  typography: {
    codeBlock: { fontSize: CODE_SIZE, lineHeight: CODE_LEADING },
    caption: { fontSize: CAPTION_SIZE },
  },
});

export const DOCUMENT_TYPE_HOST: NativeTextTheme =
  nativeTextTheme(DOCUMENT_TYPE_THEME);

export interface InkBand {
  readonly top: number;
  readonly bottom: number;
}

export const INK_TOLERANCE = 12;

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

export const inkRows = (
  frame: Pixels.Pixels,
  reference: Pixels.Rgba,
): ReadonlyArray<number> =>
  Arr.filter(
    Arr.makeBy(frame.height, (row) => row),
    (row) => rowHasInk(frame, row, reference),
  );

export const inkBands = (
  frame: Pixels.Pixels,
  reference: Pixels.Rgba,
): ReadonlyArray<InkBand> => bandsOf(inkRows(frame, reference));

export const HEADER_HEIGHT = 48;

export const HEADER_INSET_X = 6;

export const HEADER_INSET_Y = 8;

export const HEADER_TOP_INSET = 3;

export const HEADER_SIDE_INSET = 6;

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

export const bandHeight = (band: InkBand): number => band.bottom - band.top + 1;

export const bandAdvance = (
  bands: ReadonlyArray<InkBand>,
): Option.Option<number> =>
  Option.map(
    Option.all([Arr.get(bands, 0), Arr.get(bands, 1)]),
    ([first, second]) => second.top - first.top,
  );

export const near = (measured: number, expected: number, slack = 2): boolean =>
  Math.abs(measured - expected) <= slack;

export const DIFF_LEADING_GAIN =
  DIFF_ROWS * (CODE_LEADING - RUNTIME_DIFF_LEADING);

export const CODE_LEADING_GAIN = 2 * (CODE_LEADING - RUNTIME_CODE_LEADING);

export const DOCUMENT_TYPE_CHECKS = 11;
