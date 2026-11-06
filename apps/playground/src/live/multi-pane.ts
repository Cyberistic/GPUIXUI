import * as Arr from "effect/Array";
import * as Str from "effect/String";

export type PaneSide = "left" | "right";

export type PaneOpen = "both" | "left";

export const MULTI_PANE = {
  initial: 380,
  min: 220,
  max: 460,
  divider: 6,
} as const;

export const MULTI_PANE_WINDOW = { width: 900, height: 520 } as const;

export const MULTI_PANE_FILES = {
  left: "alpha.ts",
  right: "beta.ts",
} as const;

export const MULTI_PANE_VALUES = {
  left: "export const alpha = 1;\nexport const beta = 2;",
  right: "let gamma = 3;\nlet delta = 4;\nlet epsilon = 5;",
} as const;

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

const measure = (value: string): string =>
  `${Arr.length(Str.split("\n")(value))}/${Str.length(value)}`;

export const multiPaneReadout = (
  left: string,
  right: string,
  open: PaneOpen,
  width: number,
): string =>
  `left=${measure(left)} right=${measure(right)} open=${open} width=${width}`;

export const paneWidths = (
  row: number,
  width: number,
  open: PaneOpen,
): { readonly left: number; readonly right: number } =>
  open === "both"
    ? { left: width, right: row - width - MULTI_PANE.divider }
    : { left: row, right: 0 };

export const dragWidth = (width: number, delta: number): number =>
  Math.min(MULTI_PANE.max, Math.max(MULTI_PANE.min, width + delta));
