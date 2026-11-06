export const TEXT_UNDO_IDS = {
  probe: "text-undo-probe",
  field: "text-undo-field",
  area: "text-undo-area",
  rerender: "text-undo-rerender",
  load: "text-undo-load",
  control: "text-undo-control",
  readout: "text-undo-readout",
  areaReadout: "text-undo-area-readout",
  keys: "text-undo-keys",
} as const;

export const TEXT_UNDO_TEXT = {
  typed: "a",
  later: "b",
  loaded: "loaded",
  areaTyped: "x",
} as const;

export const TEXT_UNDO_KEYS = {
  undo: "cmd-z",
  redo: "shift-cmd-z",
  control: "cmd-k",
} as const;

export const textUndoReadout = (
  value: string,
  changes: number,
  renders: number,
): string => `input=${value} changes=${changes} renders=${renders}`;

export const textUndoAreaReadout = (value: string, changes: number): string =>
  `area=${value} changes=${changes}`;

export const textUndoKeyLog = (keys: ReadonlyArray<string>): string =>
  `keys=${keys.join(",")}`;

export const TEXT_UNDO_CHECKS = 15;

export const TEXT_UNDO_GROUP_MS = 900;
