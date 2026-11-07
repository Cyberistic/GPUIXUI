import * as Option from "effect/Option";
import {
  diffStrings,
  numberDiff,
  pairs,
  rows,
  type DiffRow,
  type SplitPair,
} from "@gpuixui/editor/diff/logic";
import { darkTheme, statusTone, textStyle } from "@gpuixui/tokens";

export const DIFF_BEFORE = [
  "const total = add(1, 2);",
  "export const doubled = total * 2;",
  "console.log(doubled);",
].join("\n");

export const DIFF_AFTER = [
  "const total = add(1, 2);",
  "export const doubled = total * 3;",
  "console.log(doubled);",
  "console.log(summary);",
].join("\n");

export const DIFF_SAME = "const total = add(1, 2);";

export const DIFF_SAME_ROWS: ReadonlyArray<DiffRow> = numberDiff(
  diffStrings(DIFF_SAME, DIFF_SAME),
);

export const DIFF_LONG = `console.log('${"x".repeat(160)}');`;

export const DIFF_WIDTH = 420;

export const DIFF_SPLIT_SIDE_WIDTH = (DIFF_WIDTH - 2 - 1) / 2;

export const DIFF_IDS = {
  unified: "diff-unified",

  split: "diff-split",

  long: "diff-long",

  same: "diff-same",
} as const;

export const DIFF_ROWS: ReadonlyArray<DiffRow> = numberDiff(
  diffStrings(DIFF_BEFORE, DIFF_AFTER),
);

export const DIFF_UNIFIED_ROWS: ReadonlyArray<DiffRow> = rows(DIFF_ROWS);

export const DIFF_SPLIT_ROWS: ReadonlyArray<SplitPair> = pairs(DIFF_ROWS);

export const DIFF_METRICS = textStyle(darkTheme, "codeBlock");

export const DIFF_LINE_HEIGHT = DIFF_METRICS.lineHeight;

export const DIFF_SURFACE = darkTheme.colors.background;

export const DIFF_PAGE = darkTheme.colors.card;

export const DIFF_SUCCESS = statusTone(darkTheme, "success").background;

export const DIFF_DESTRUCTIVE = statusTone(darkTheme, "destructive").background;

export const diffMarker = (row: DiffRow): string =>
  row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " ";

const numberText = (number: Option.Option<number>): string =>
  Option.match(number, {
    onNone: () => "",
    onSome: (value) => `${value}`,
  });

export const unifiedRowText = (row: DiffRow): string =>
  `${diffMarker(row)}${numberText(row.before)}${numberText(row.after)}${row.text}`;

export const unnumberedRowText = (row: DiffRow): string =>
  `${diffMarker(row)}${row.text}`;

export const splitSideText = (
  side: Option.Option<DiffRow>,
  numbers: boolean,
): string =>
  Option.match(side, {
    onNone: () => "",
    onSome: (row) =>
      numbers
        ? `${numberText(row.kind === "removed" ? row.before : row.after)}${row.text}`
        : row.text,
  });

export const splitRowText = (pair: SplitPair): string =>
  `${splitSideText(pair.left, true)}${splitSideText(pair.right, true)}`;

export const DIFF_LONG_ROW: DiffRow = {
  kind: "added",
  text: DIFF_LONG,
  before: Option.none(),
  after: Option.some(1),
};

export const longRowText = (): string => unnumberedRowText(DIFF_LONG_ROW);

export const diffRowId = (viewer: string, index: number): string =>
  `${viewer}-row-${index}`;

export const diffSideId = (
  viewer: string,
  index: number,
  side: "before" | "after",
): string => `${viewer}-row-${index}-${side}`;

export const DIFF_CHECKS = 116;
