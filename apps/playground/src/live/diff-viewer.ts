/**
 * What the shipped `DiffViewer` paints, and the readings a window can prove.
 *
 * The editor package ships a diff surface built from two sources rather than a
 * patch, and its page makes three claims no offscreen suite can hold: an added
 * line tints the `success` soft role and a removed line the `destructive` one,
 * a split diff puts one change on **one** row (the old line left, its
 * replacement right) and a side that ran out paints a blank cell, and a line
 * that outgrows its surface is clipped rather than wrapped. Every one of them is
 * a question about pixels and layout, so the live `diff-viewer-lifecycle` probe
 * mounts the shipped component and reads a window.
 *
 * The rows, their line numbers and their split pairing are derived from the
 * package's own `diffStrings`/`numberDiff`/`splitPairs`, so the window is
 * measured against the rule the component ships rather than a copy of it. The
 * headless `editor-surface` scenario mounted the raw `<diff>` host; this
 * fixture mounts the wrapper a consumer actually imports.
 */
import * as Option from "effect/Option";
import {
  diffStrings,
  numberDiff,
  splitPairs,
  type DiffRow,
  type SplitPair,
} from "@gpuixui/editor/diff/logic";
import { darkTheme, statusTone, textStyle } from "@gpuixui/tokens";

/** The before side: three lines, the second of which changes. */
export const DIFF_BEFORE = [
  "const total = add(1, 2);",
  "export const doubled = total * 2;",
  "console.log(doubled);",
].join("\n");

/**
 * The after side: the same file with one line replaced and one appended.
 *
 * Two changes of different shapes on purpose: the replacement is a removed line
 * beside its addition (one split row), and the appended line has no before side
 * (a split row whose left cell is blank). A split viewer that stacked a
 * replacement as a removal above an addition, or filled a blank cell with the
 * neighbouring text, has to fail the pairing checks rather than pass them.
 */
export const DIFF_AFTER = [
  "const total = add(1, 2);",
  "export const doubled = total * 3;",
  "console.log(doubled);",
  "console.log(summary);",
].join("\n");

/** The unchanged source: one line, so the diff is a single context row. */
export const DIFF_SAME = "const total = add(1, 2);";

/** The contexts row the unchanged viewer paints. */
export const DIFF_SAME_ROWS: ReadonlyArray<DiffRow> = numberDiff(
  diffStrings(DIFF_SAME, DIFF_SAME),
);

/**
 * A line far longer than the surface it is handed: 176 characters (160 of them
 * `x`) against a 420-point box, so a viewer that wrapped it would paint a row
 * several lines tall.
 */
export const DIFF_LONG = `console.log('${"x".repeat(160)}');`;

/** The width every viewer is bounded to, including the long-line one. */
export const DIFF_WIDTH = 420;

/**
 * The share of a split row each side is sampled at.
 *
 * `splitPairs` gives each cell `flexGrow: 1` over a zero basis, but the runtime
 * sizes a row's cells by their content first: the 32-character changed line
 * takes **61%** of the 418-point row, so the added cell's gutter starts past the
 * midpoint and its line is clipped at the surface's edge. The probe therefore
 * reads each side at a band its content cannot cross (35% either side) and
 * measures the boundary itself where the removed tint crosses the midpoint.
 */
export const DIFF_SIDE_BAND = 0.35;

/**
 * Where the added cell's gutter began in the measured window, as a share of the
 * row.
 *
 * Measured on 0.11.0 here: the removed line's tint ends at 59% of the 418-point
 * row and the added line's gutter starts at 61%. The figure is a reading, not a
 * rule the component declares — the probe measures the boundary crossing the
 * midpoint and the README prints this share, so a font or size change that moves
 * it is visible rather than silently inherited.
 */
export const DIFF_SPLIT_GUTTER = 0.61;

/** The ids the probe addresses; each viewer appends `-row-<index>`. */
export const DIFF_IDS = {
  /** Unified, numbered. */
  unified: "diff-unified",
  /** Split, numbered. */
  split: "diff-split",
  /** Unified, unnumbered, one long added line. */
  long: "diff-long",
  /** Unified, numbered, nothing changed. */
  same: "diff-same",
} as const;

/** The rows the unified viewers paint, from the package's own diff. */
export const DIFF_ROWS: ReadonlyArray<DiffRow> = numberDiff(
  diffStrings(DIFF_BEFORE, DIFF_AFTER),
);

/** The rows the split viewer paints: one change per row, blanks padded. */
export const DIFF_SPLIT_ROWS: ReadonlyArray<SplitPair> = splitPairs(DIFF_ROWS);

/** The code type the rows paint in, from the shipped theme. */
export const DIFF_METRICS = textStyle(darkTheme, "codeBlock");

/**
 * The height one row paints: the code role's line height.
 *
 * A viewer that wrapped a long line would be several of these tall; the
 * long-line viewer's single row is the check.
 */
export const DIFF_LINE_HEIGHT = DIFF_METRICS.lineHeight;

/** The surface the viewer paints behind its rows (`bg-background`). */
export const DIFF_SURFACE = darkTheme.colors.background;

/** The page behind the viewers: a card, so a blank cell's fill is its own. */
export const DIFF_PAGE = darkTheme.colors.card;

/** The tint an added row paints: the `success` tone's soft role. */
export const DIFF_SUCCESS = statusTone(darkTheme, "success").background;

/** The tint a removed row paints: the `destructive` tone's soft role. */
export const DIFF_DESTRUCTIVE = statusTone(darkTheme, "destructive").background;

/** The marker a row paints before its numbers. */
export const diffMarker = (row: DiffRow): string =>
  row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " ";

/** One side's line number, or a blank cell. */
const numberText = (number: Option.Option<number>): string =>
  Option.match(number, {
    onNone: () => "",
    onSome: (value) => `${value}`,
  });

/**
 * The text a unified row paints: marker, before number, after number, line.
 *
 * The component paints those four runs in that order, so the row's own text is
 * the whole reading — a gutter that dropped a number, or a marker written on
 * the wrong side, changes this string.
 */
export const unifiedRowText = (row: DiffRow): string =>
  `${diffMarker(row)}${numberText(row.before)}${numberText(row.after)}${row.text}`;

/** The text an unnumbered unified row paints: marker then line. */
export const unnumberedRowText = (row: DiffRow): string =>
  `${diffMarker(row)}${row.text}`;

/** The number a split cell shows: the before side on the left, the after on the right. */
const splitSideText = (
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

/**
 * The text a split row paints: the left cell then the right cell.
 *
 * A blank cell contributes nothing, so the row's words are the side that has a
 * line — which is the whole claim of a padded pair.
 */
export const splitRowText = (pair: SplitPair): string =>
  `${splitSideText(pair.left, true)}${splitSideText(pair.right, true)}`;

/** The one row the long-line viewer paints: an addition against an empty document. */
export const DIFF_LONG_ROW: DiffRow = {
  kind: "added",
  text: DIFF_LONG,
  before: Option.none(),
  after: Option.some(1),
};

/** The text the long-line row paints, with no numbers (`lineNumbers={false}`). */
export const longRowText = (): string => unnumberedRowText(DIFF_LONG_ROW);

/** The id of one row inside a viewer. */
export const diffRowId = (viewer: string, index: number): string =>
  `${viewer}-row-${index}`;

/**
 * The checks the window run made, on 0.11.0 here.
 *
 * The probe's helpers assert per call, so the sites in its steps are fewer than
 * the checks a run reports; this is the number the run printed and the README
 * teaches.
 */
export const DIFF_CHECKS = 98;
