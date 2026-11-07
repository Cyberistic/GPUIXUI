import * as Arr from "effect/Array";
import type { CalculatorCommand, ModeSpec } from "./commands.js";

export type Tone =
  | "number"
  | "operator"
  | "function"
  | "control"
  | "equals"
  | "accent";

export interface KeypadKey {
  readonly id: string;
  readonly primary: string;
  readonly shift?: string;
  readonly alpha?: string;
  readonly tone?: Tone;

  readonly span?: number;

  readonly label?: string;
}

export interface KeypadRow {
  readonly keys: ReadonlyArray<KeypadKey>;
}

export interface DirectionPad {
  readonly up: KeypadKey;
  readonly down: KeypadKey;
  readonly left: KeypadKey;
  readonly right: KeypadKey;
}

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
