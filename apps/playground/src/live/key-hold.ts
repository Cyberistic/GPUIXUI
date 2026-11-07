export const KEY_HOLD_IDS = {
  probe: "key-hold-probe",
  button: "key-hold-button",
  raw: "key-hold-raw",
  readout: "key-hold-readout",
  rawLog: "key-hold-log",
  buttonLog: "key-hold-button-log",
  windowLog: "key-hold-window",
} as const;

export const KEY_HOLD_KEYS = {
  press: "enter",
  release: "space",
  raw: "j",
} as const;

export interface HeldKey {
  readonly key: string;
  readonly held: boolean;
}

export const heldKeyLog = (
  downs: ReadonlyArray<HeldKey>,
  ups: number,
): string =>
  `down=${downs.map((down) => `${down.key}:${down.held}`).join(",")} up=${ups}`;

export const windowKeyLog = (downs: ReadonlyArray<HeldKey>): string =>
  `window=${downs.map((down) => `${down.key}:${down.held}`).join(",")}`;

export const keyHoldReadout = (activations: number, presses: number): string =>
  `activations=${activations} presses=${presses}`;

export const KEY_HOLD_CHECKS = 17;
