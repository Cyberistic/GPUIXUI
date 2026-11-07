import type { InputToken } from "./input/token.js";
import type { CalcValue } from "./value.js";
import type { EquationKind } from "./modes/eqn.js";
import type { StatCommand, StatKind, StatReadingId } from "./modes/stat.js";
import type { BaseName, NumberFormatKind, Setup } from "./setup.js";

export type Mode =
  | "COMP"
  | "CMPLX"
  | "STAT"
  | "BASE-N"
  | "EQN"
  | "MATRIX"
  | "TABLE"
  | "VECTOR";

export type ClearScope = "setup" | "memory" | "all";

export type CommandAction =
  | { readonly _tag: "insert"; readonly tokens: ReadonlyArray<InputToken> }
  | { readonly _tag: "mode"; readonly mode: Mode }
  | { readonly _tag: "setup"; readonly setup: Partial<Setup> }
  | { readonly _tag: "base"; readonly base: BaseName }
  | { readonly _tag: "stat-type"; readonly kind: StatKind }
  | { readonly _tag: "stat-screen"; readonly screen: "editor" | "calc" }
  | { readonly _tag: "stat-reading"; readonly id: StatReadingId }
  | { readonly _tag: "stat-menu"; readonly command: StatCommand }
  | { readonly _tag: "equation-type"; readonly kind: EquationKind }
  | { readonly _tag: "equation-solve" }
  | { readonly _tag: "equation-cell"; readonly index: number }
  | {
      readonly _tag: "stat-cell";
      readonly row: number;
      readonly column: number;
    }
  | { readonly _tag: "stat-argument"; readonly value: number }
  | { readonly _tag: "matrix-cell"; readonly index: number }
  | { readonly _tag: "vector-cell"; readonly index: number }
  | {
      readonly _tag: "replay";
      readonly tokens: ReadonlyArray<InputToken>;
      readonly result?: CalcValue;
    }
  | { readonly _tag: "matrix-edit"; readonly matrix: "A" | "B" | "C" }
  | {
      readonly _tag: "matrix-dim";
      readonly matrix: "A" | "B" | "C";
      readonly rows: number;
      readonly columns: number;
    }
  | { readonly _tag: "matrix-calc"; readonly screen: "editor" | "calc" }
  | { readonly _tag: "vector-edit"; readonly vector: "A" | "B" | "C" }
  | {
      readonly _tag: "vector-dim";
      readonly vector: "A" | "B" | "C";
      readonly size: number;
    }
  | { readonly _tag: "vector-calc"; readonly screen: "editor" | "calc" }
  | {
      readonly _tag: "table-field";
      readonly field: "function" | "start" | "end" | "step";
    }
  | { readonly _tag: "table-run" }
  | { readonly _tag: "table-reset" }
  | { readonly _tag: "clear"; readonly scope: ClearScope }
  | { readonly _tag: "calc" }
  | { readonly _tag: "solve" }
  | { readonly _tag: "alternate" }
  | { readonly _tag: "engineering"; readonly direction: -1 | 0 | 1 }
  | { readonly _tag: "notify"; readonly message: string };

export interface CalculatorCommand {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly keywords: ReadonlyArray<string>;
  readonly shortcut?: string;
  readonly action: CommandAction;
}

export interface ModeSpec {
  readonly mode: Mode;
  readonly label: string;
  readonly index: number;
  readonly summary: string;
}

export const MODES: ReadonlyArray<ModeSpec> = [
  { mode: "COMP", label: "COMP", index: 1, summary: "General calculations" },
  { mode: "CMPLX", label: "CMPLX", index: 2, summary: "Complex numbers" },
  {
    mode: "STAT",
    label: "STAT",
    index: 3,
    summary: "Statistics and regression",
  },
  {
    mode: "BASE-N",
    label: "BASE-N",
    index: 4,
    summary: "Binary, octal, decimal, hexadecimal",
  },
  {
    mode: "EQN",
    label: "EQN",
    index: 5,
    summary: "Simultaneous and polynomial equations",
  },
  {
    mode: "MATRIX",
    label: "MATRIX",
    index: 6,
    summary: "Up to 3×3 matrix calculations",
  },
  {
    mode: "TABLE",
    label: "TABLE",
    index: 7,
    summary: "Numerical table from f(x)",
  },
  { mode: "VECTOR", label: "VECTOR", index: 8, summary: "2D and 3D vectors" },
];

export const numberFormatAction = (
  kind: NumberFormatKind,
  digits: number,
): CommandAction => ({
  _tag: "setup",
  setup: { number: { kind, digits } },
});
