/**
 * The two-pane editing layout `multi-pane-editor` drives, and the rules a
 * multi-pane editor owes.
 *
 * Tier 4's **multi-pane editing layouts** row is composition: a split of two
 * editor panes, each a real field, resized by the same divider `SplitPane`
 * paints. What a window has to prove is the interaction the composition is for —
 * one text session, moving between panes on a press, and a splitter drag that
 * neither redirects typing nor loses a buffer. The fixture keeps the
 * arithmetic out of the view so it is testable on a host with no binding, as
 * `workspace-restore.ts` does.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** Which buffer a pane shows. */
export type PaneSide = "left" | "right";

/** Which panes are mounted; a closed pane keeps its buffer in the app. */
export type PaneOpen = "both" | "left";

/** The split's caller-owned width: the pane A starts at and the bounds it clamps to. */
export const MULTI_PANE = {
  initial: 380,
  min: 220,
  max: 460,
  divider: 6,
} as const;

/** The window the probe opens; the row takes its width less the page padding. */
export const MULTI_PANE_WINDOW = { width: 900, height: 520 } as const;

/** The file each pane edits. */
export const MULTI_PANE_FILES = {
  left: "alpha.ts",
  right: "beta.ts",
} as const;

/** The buffers the panes open with: one three-line file and one two-line file. */
export const MULTI_PANE_VALUES = {
  left: "export const alpha = 1;\nexport const beta = 2;",
  right: "let gamma = 3;\nlet delta = 4;\nlet epsilon = 5;",
} as const;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const MULTI_PANE_IDS = {
  probe: "mp-probe",
  row: "mp-row",
  readout: "mp-readout",
  close: "mp-close",
  reopen: "mp-reopen",
  leftPane: "mp-pane-left",
  rightPane: "mp-pane-right",
  title: (side: PaneSide): string => `mp-title-${side}`,
  input: (side: PaneSide): string => `mp-input-${side}`,
} as const;

/** A buffer's line and character count, the readout's unit. */
const measure = (value: string): string =>
  `${Arr.length(Str.split("\n")(value))}/${Str.length(value)}`;

/**
 * The readout a window paints.
 *
 * Counts rather than the buffer itself, so no check can pass by echoing text the
 * fixture supplied; the width is the split's caller-owned number, which is what
 * a divider drag changes.
 */
export const multiPaneReadout = (
  left: string,
  right: string,
  open: PaneOpen,
  width: number,
): string =>
  `left=${measure(left)} right=${measure(right)} open=${open} width=${width}`;

/** The two panes' painted widths for a row of `row` pixels. */
export const paneWidths = (
  row: number,
  width: number,
  open: PaneOpen,
): { readonly left: number; readonly right: number } =>
  open === "both"
    ? { left: width, right: row - width - MULTI_PANE.divider }
    : { left: row, right: 0 };

/**
 * The width a divider drag asks for.
 *
 * One rule for the drag's target and the bounds, so a probe can name the clamp
 * it expects instead of re-deriving it beside the splitter.
 */
export const dragWidth = (width: number, delta: number): number =>
  Math.min(MULTI_PANE.max, Math.max(MULTI_PANE.min, width + delta));
