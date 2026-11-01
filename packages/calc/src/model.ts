/**
 * The model seam.
 *
 * Everything the session and the app need to know about *which* calculator they
 * are driving lives here: the modes, the keypad, the searchable catalogue and
 * the feature capabilities. The fx-991ES Plus is the only model today; a TI-84
 * becomes a second `CalculatorModel`, not a fork of the app.
 */

import * as Arr from "effect/Array";
import type { CalculatorCommand, ModeSpec } from "./commands.js";

export type Tone =
  | "number"
  | "operator"
  | "function"
  | "control"
  | "equals"
  | "accent";

/** One physical key: what it paints and what SHIFT/ALPHA make it do. */
export interface KeypadKey {
  readonly id: string;
  readonly primary: string;
  readonly shift?: string;
  readonly alpha?: string;
  readonly tone?: Tone;
  /** How many grid columns the key occupies. Defaults to one. */
  readonly span?: number;
  /** An accessible name when the painted glyph is not a word. */
  readonly label?: string;
}

export interface KeypadRow {
  readonly keys: ReadonlyArray<KeypadKey>;
}

/** The round replay pad: four keys under one cap. */
export interface DirectionPad {
  readonly up: KeypadKey;
  readonly down: KeypadKey;
  readonly left: KeypadKey;
  readonly right: KeypadKey;
}

/**
 * A keypad as the device lays it out: the top cluster (two key columns either
 * side of the replay pad), the small function keys, and the large main keys.
 */
export interface Keypad {
  readonly cluster: {
    readonly left: ReadonlyArray<KeypadRow>;
    readonly pad: DirectionPad;
    readonly right: ReadonlyArray<KeypadRow>;
  };
  readonly functions: ReadonlyArray<KeypadRow>;
  readonly main: ReadonlyArray<KeypadRow>;
}

const rowKeys = (rows: ReadonlyArray<KeypadRow>) =>
  Arr.flatMap(rows, (row) => row.keys);

/** Every key on a keypad, top to bottom. */
export const keypadKeys = (keypad: Keypad): ReadonlyArray<KeypadKey> => [
  ...rowKeys(keypad.cluster.left),
  keypad.cluster.pad.up,
  keypad.cluster.pad.left,
  keypad.cluster.pad.right,
  keypad.cluster.pad.down,
  ...rowKeys(keypad.cluster.right),
  ...rowKeys(keypad.functions),
  ...rowKeys(keypad.main),
];

/** What a model can and cannot do, with the reason for every `false`. */
export interface ModelCapabilities {
  readonly naturalDisplay: boolean;
  readonly complex: boolean;
  readonly baseN: boolean;
  readonly statistics: boolean;
  readonly equations: boolean;
  readonly matrix: boolean;
  readonly vector: boolean;
  readonly table: boolean;
  readonly integral: boolean;
  readonly solve: boolean;
  readonly distribution: boolean;
  /** Not on the fx-991ES Plus manual's mode list; present on later models. */
  readonly verify: false;
  readonly notes: ReadonlyArray<string>;
}

export interface CalculatorModel {
  readonly id: "fx991es";
  readonly label: string;
  readonly family: string;
  readonly modes: ReadonlyArray<ModeSpec>;
  readonly keypad: Keypad;
  readonly capabilities: ModelCapabilities;
  readonly catalog: ReadonlyArray<CalculatorCommand>;
}
