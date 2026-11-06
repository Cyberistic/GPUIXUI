import type { PlatformName } from "@gpuixui/tokens";

export const HOTKEY_IDS = {
  probe: "hotkey-probe",
  recorder: "hotkey-recorder",
  readout: "hotkey-readout",
  windowLog: "hotkey-window-log",
  off: "hotkey-off",
  offReadout: "hotkey-off-readout",
  plain: "hotkey-plain",
} as const;

export const hotkeyClearId = (recorder: string): string => `${recorder}-clear`;

export const HOTKEY_RECORDING = "Press keys…";

export const HOTKEY_PLACEHOLDER = "Click to record";

export const HOTKEY_KEYS = {
  chord: "cmd-shift-k",

  chordKey: "k",

  modifier: "shift",

  cancel: "escape",

  space: "space",

  refused: "enter",
} as const;

export const capturedChord = (platform: PlatformName): string =>
  platform === "darwin" ? "Mod+Shift+K" : "Meta+Shift+K";

export const SPACE_CHORD = "Space";

export const HOTKEY_KEYCAPS = { base: "K", space: "␣" } as const;

export const HOTKEY_NONE = "none";

export const HOTKEY_CAPTURES = {
  armed: "hotkey-armed",
  bound: "hotkey-bound",
} as const;

export const hotkeyReadout = (value: string | null, reports: number): string =>
  `value=${value ?? HOTKEY_NONE} reports=${reports}`;

export const hotkeyOffReadout = (reports: number): string =>
  `reports=${reports}`;

export const windowKeyLog = (keys: ReadonlyArray<string>): string =>
  `window=${keys.length === 0 ? HOTKEY_NONE : keys.join(",")}`;

export const windowSaw = (log: string, key: string): boolean =>
  log === windowKeyLog([])
    ? false
    : log.slice("window=".length).split(",").includes(key);

export const paintsKeycaps = (painted: string, keyGlyph: string): boolean =>
  painted.includes(keyGlyph) &&
  !painted.includes("+") &&
  painted !== HOTKEY_PLACEHOLDER &&
  painted !== HOTKEY_RECORDING;

export const HOTKEY_CHECKS = 25;
