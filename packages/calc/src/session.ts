/**
 * The calculator session: the state machine behind every key and command.
 *
 * A press is a state transition, and evaluation is an Effect because it may use
 * `Random` and may fail with a documented calculator error. Expected failures
 * become `error` in the state (the LCD shows them); nothing throws. The state is
 * serialisable data apart from the parsed values it holds for display.
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { CommandAction, Mode } from "./commands.js";
import { MODES } from "./commands.js";
import {
  evaluate,
  emptySideEffects,
  type EvaluationContext,
} from "./evaluate.js";
import { failure, type CalculatorFailure } from "./failure.js";
import {
  formatEngineering,
  formatValue,
  type FormattedValue,
} from "./format.js";
import { layoutOf, type MathNode } from "./layout.js";
import {
  fractionTemplate,
  FRACTION_CURSOR,
  inputLayoutOf,
  moveInInput,
} from "./input-layout.js";
import { symbolicOf, type Symbolic } from "./symbolic.js";
import {
  ABS,
  AND,
  ARG,
  ANS,
  CBRT,
  CLOSE,
  COMMA,
  CONJG,
  COS,
  COS_INV,
  COSH,
  COSH_INV,
  CUBE,
  DEGREE,
  DERIVATIVE,
  digit,
  DOT,
  E,
  EQUALS,
  EXP10,
  FACTORIAL,
  FORMAT_POLAR,
  FORMAT_RECT,
  GRAD_TAG,
  HEX_DIGITS,
  IMAGINARY,
  IMAGINARY_PART,
  inputText,
  inputTextWithCaret,
  insertToken,
  INTEGRAL,
  LN,
  LOG,
  MEMORY,
  MINUTE,
  N_CR,
  N_PR,
  NEG,
  NOT,
  NTH_ROOT,
  OPEN,
  operator,
  OR,
  PERCENT,
  PERIOD,
  PI,
  POL,
  POLAR,
  RAN,
  RANINT,
  RADIAN_TAG,
  REAL_PART,
  REC,
  RECIPROCAL,
  RND,
  SECOND,
  SIN,
  SIN_INV,
  SINH,
  SINH_INV,
  SQUARE,
  SQRT,
  SUMMATION,
  TAN,
  TAN_INV,
  TANH,
  TANH_INV,
  variableToken,
  XNOR,
  XOR,
  type InputToken,
} from "./input/token.js";
import {
  coefficientCount,
  coefficientLabels,
  equationLabel,
  solveEquation,
  type EquationKind,
  type EquationSolution,
} from "./modes/eqn.js";
import {
  columnsOf,
  emptyStatRows,
  pointsOf,
  readingsFor,
  STAT_ROWS,
  statRowLimit,
  statReading,
  type Reading,
  type StatKind,
  type StatRow,
} from "./modes/stat.js";
import { DEFAULT_TABLE, tableValues, type TableRow } from "./modes/table.js";
import { formatOverride, parse, type Expr } from "./parser.js";
import {
  defaultSetup,
  roundingDigits,
  type BaseName,
  type Setup,
} from "./setup.js";
import {
  asNumber,
  real,
  type CalcValue,
  type MatrixValue,
  type VectorValue,
} from "./value.js";

export interface HistoryEntry {
  readonly tokens: ReadonlyArray<InputToken>;
  readonly result: CalcValue;
  readonly mode: Mode;
}

export interface StatEditorState {
  readonly kind: StatKind;
  readonly frequency: boolean;
  readonly rows: ReadonlyArray<StatRow>;
  readonly row: number;
  readonly column: number;
  readonly screen: "editor" | "calc";
  readonly readings: ReadonlyArray<Reading>;
  readonly title: string;
  /** The last argument typed for an estimate or distribution reading. */
  readonly argument: string;
}

export interface EquationEditorState {
  readonly kind: EquationKind;
  readonly cells: ReadonlyArray<string>;
  readonly cursor: number;
  readonly solutions: Option.Option<ReadonlyArray<EquationSolution>>;
  readonly screen: "editor" | "solution";
}

export interface MatrixVariable {
  readonly rows: number;
  readonly columns: number;
  readonly cells: ReadonlyArray<string>;
}

export interface MatrixEditorState {
  readonly editing: "A" | "B" | "C";
  readonly variables: Readonly<Record<"A" | "B" | "C", MatrixVariable>>;
  readonly cursor: number;
  readonly answer: Option.Option<MatrixValue>;
  readonly screen: "editor" | "calc";
}

export interface VectorEditorState {
  readonly editing: "A" | "B" | "C";
  readonly variables: Readonly<Record<"A" | "B" | "C", ReadonlyArray<string>>>;
  readonly cursor: number;
  readonly answer: Option.Option<VectorValue>;
  readonly screen: "editor" | "calc";
}

export interface TableEditorState {
  readonly tokens: ReadonlyArray<InputToken>;
  readonly cursor: number;
  readonly start: string;
  readonly end: string;
  readonly step: string;
  readonly field: "function" | "start" | "end" | "step";
  readonly rows: Option.Option<ReadonlyArray<TableRow>>;
}

export interface PromptState {
  readonly purpose: "CALC" | "SOLVE";
  readonly names: ReadonlyArray<string>;
  readonly index: number;
  readonly buffer: string;
  readonly values: Readonly<Record<string, number>>;
  readonly tokens: ReadonlyArray<InputToken>;
  readonly solveVariable: string;
}

export interface CalculatorState {
  readonly model: "fx991es";
  readonly mode: Mode;
  readonly setup: Setup;
  readonly tokens: ReadonlyArray<InputToken>;
  readonly cursor: number;
  readonly result: Option.Option<CalcValue>;
  readonly resultFormat: Option.Option<"rect" | "polar">;
  readonly resultSymbolic: Option.Option<Symbolic>;
  readonly showAlternate: boolean;
  readonly engineering: boolean;
  readonly error: Option.Option<CalculatorFailure>;
  readonly history: ReadonlyArray<HistoryEntry>;
  readonly variables: Readonly<Record<string, number>>;
  readonly ans: number;
  readonly ansValue: CalcValue;
  readonly memory: number;
  readonly base: BaseName;
  readonly shift: boolean;
  readonly alpha: boolean;
  readonly hyp: boolean;
  readonly pendingStore: boolean;
  readonly pendingRecall: boolean;
  readonly stat: StatEditorState;
  readonly equation: EquationEditorState;
  readonly matrix: MatrixEditorState;
  readonly vector: VectorEditorState;
  readonly table: TableEditorState;
  readonly prompt: Option.Option<PromptState>;
}

const VARS = ["A", "B", "C", "D", "E", "F", "X", "Y"] as const;

const emptyVariables = (): Readonly<Record<string, number>> =>
  Object.fromEntries(Arr.map(VARS, (name) => [name, 0]));

const matrixVariable = (rows = 2, columns = 2): MatrixVariable => ({
  rows,
  columns,
  cells: Arr.makeBy(rows * columns, () => ""),
});

const emptyMatrices = (): Readonly<
  Record<"A" | "B" | "C", MatrixVariable>
> => ({
  A: matrixVariable(),
  B: matrixVariable(),
  C: matrixVariable(),
});

const emptyVectors = (): Readonly<
  Record<"A" | "B" | "C", ReadonlyArray<string>>
> => ({
  A: ["", ""],
  B: ["", ""],
  C: ["", ""],
});

export const initialState = (): CalculatorState => ({
  model: "fx991es",
  mode: "COMP",
  setup: defaultSetup,
  tokens: [],
  cursor: 0,
  result: Option.none(),
  resultFormat: Option.none(),
  resultSymbolic: Option.none(),
  showAlternate: false,
  engineering: false,
  error: Option.none(),
  history: [],
  variables: emptyVariables(),
  ans: 0,
  ansValue: real(0),
  memory: 0,
  base: "DEC",
  shift: false,
  alpha: false,
  hyp: false,
  pendingStore: false,
  pendingRecall: false,
  stat: {
    kind: "1-VAR",
    frequency: false,
    rows: emptyStatRows(),
    row: 0,
    column: 0,
    screen: "editor",
    readings: [],
    title: "1-VAR",
    argument: "",
  },
  equation: {
    kind: "2x2",
    cells: Arr.makeBy(coefficientCount("2x2"), () => ""),
    cursor: 0,
    solutions: Option.none(),
    screen: "editor",
  },
  matrix: {
    editing: "A",
    variables: emptyMatrices(),
    cursor: 0,
    answer: Option.none(),
    screen: "editor",
  },
  vector: {
    editing: "A",
    variables: emptyVectors(),
    cursor: 0,
    answer: Option.none(),
    screen: "editor",
  },
  table: {
    tokens: [],
    cursor: 0,
    start: String(DEFAULT_TABLE.start),
    end: String(DEFAULT_TABLE.end),
    step: String(DEFAULT_TABLE.step),
    field: "function",
    rows: Option.none(),
  },
  prompt: Option.none(),
});

const patch = (
  state: CalculatorState,
  changes: Partial<CalculatorState>,
): CalculatorState => ({ ...state, ...changes });

const clearEntry = (state: CalculatorState): CalculatorState =>
  patch(state, {
    tokens: [],
    cursor: 0,
    result: Option.none(),
    resultFormat: Option.none(),
    resultSymbolic: Option.none(),
    showAlternate: false,
    error: Option.none(),
  });

const withError = (
  state: CalculatorState,
  error: CalculatorFailure,
): CalculatorState =>
  patch(state, { error: Option.some(error), result: Option.none() });

const matrixOfVariable = (
  variable: MatrixVariable,
): Option.Option<MatrixValue> => {
  if (Arr.some(variable.cells, (cell) => cell.trim() === ""))
    return Option.none();
  const numbers = Arr.map(variable.cells, (cell) => Number(cell));
  if (!Arr.every(numbers, Number.isFinite)) return Option.none();
  return Option.some({
    _tag: "matrix",
    rows: Arr.map(Arr.range(0, variable.rows - 1), (row) =>
      Arr.map(
        Arr.range(0, variable.columns - 1),
        (column) => numbers[row * variable.columns + column] ?? 0,
      ),
    ),
  });
};

const vectorOfVariable = (
  cells: ReadonlyArray<string>,
): Option.Option<VectorValue> => {
  if (Arr.some(cells, (cell) => cell.trim() === "")) return Option.none();
  const numbers = Arr.map(cells, (cell) => Number(cell));
  return Arr.every(numbers, Number.isFinite)
    ? Option.some({ _tag: "vector", items: numbers })
    : Option.none();
};

const matricesOf = (
  state: CalculatorState,
): Readonly<Record<string, MatrixValue>> => {
  const entries: Array<[string, MatrixValue]> = [];
  Arr.forEach(["A", "B", "C"] as const, (name) => {
    const value = matrixOfVariable(state.matrix.variables[name]);
    if (Option.isSome(value)) entries.push([`Mat${name}`, value.value]);
  });
  if (Option.isSome(state.matrix.answer))
    entries.push(["MatAns", state.matrix.answer.value]);
  return Object.fromEntries(entries);
};

const vectorsOf = (
  state: CalculatorState,
): Readonly<Record<string, VectorValue>> => {
  const entries: Array<[string, VectorValue]> = [];
  Arr.forEach(["A", "B", "C"] as const, (name) => {
    const value = vectorOfVariable(state.vector.variables[name]);
    if (Option.isSome(value)) entries.push([`Vct${name}`, value.value]);
  });
  if (Option.isSome(state.vector.answer))
    entries.push(["VctAns", state.vector.answer.value]);
  return Object.fromEntries(entries);
};

export const contextOf = (
  state: CalculatorState,
  variables: Readonly<Record<string, number>> = state.variables,
): EvaluationContext => ({
  angle: state.setup.angle,
  variables,
  ans: state.ans,
  ansValue: state.ansValue,
  memory: state.memory,
  base: state.mode === "BASE-N" ? state.base : "DEC",
  complex: state.mode === "CMPLX",
  matrices: matricesOf(state),
  vectors: vectorsOf(state),
  roundDigits: roundingDigits(state.setup.number),
  roundMode: state.setup.number.kind === "Fix" ? "decimal" : "significant",
  sideEffects: emptySideEffects(),
});

const runEvaluation = (
  state: CalculatorState,
  tokens: ReadonlyArray<InputToken>,
  variables: Readonly<Record<string, number>> = state.variables,
): Effect.Effect<CalculatorState, never> =>
  Effect.gen(function* () {
    const parsed = parse(tokens);
    if (parsed._tag !== "ok") return withError(state, parsed);
    const format = formatOverride(parsed.expr);
    const symbolic = symbolicOf(parsed.expr);
    const context = contextOf(state, variables);
    const sideEffects = context.sideEffects;
    const outcome = yield* Effect.result(evaluate(parsed.expr, context));
    if (outcome._tag === "Failure") {
      return withError(state, outcome.failure);
    }
    const value = outcome.success;
    const numeric = value._tag === "real" ? value.value : state.ans;
    const entry: HistoryEntry = { tokens, result: value, mode: state.mode };
    const history = Arr.takeRight(Arr.append(state.history, entry), 30);
    const next = patch(state, {
      result: Option.some(value),
      resultFormat: format,
      resultSymbolic: symbolic,
      showAlternate: false,
      error: Option.none(),
      ans: numeric,
      ansValue:
        value._tag === "real" || value._tag === "complex"
          ? value
          : state.ansValue,
      variables:
        sideEffects.x === undefined && sideEffects.y === undefined
          ? state.variables
          : {
              ...state.variables,
              ...(sideEffects.x === undefined ? {} : { X: sideEffects.x }),
              ...(sideEffects.y === undefined ? {} : { Y: sideEffects.y }),
            },
      history,
      ...(value._tag === "matrix" && state.mode === "MATRIX"
        ? { matrix: { ...state.matrix, answer: Option.some(value) } }
        : {}),
      ...(value._tag === "vector" && state.mode === "VECTOR"
        ? { vector: { ...state.vector, answer: Option.some(value) } }
        : {}),
    });
    return next;
  });

/* ------------------------------------------------------------------ */
/* Modes and editors                                                   */
/* ------------------------------------------------------------------ */

export const setMode = (
  state: CalculatorState,
  mode: Mode,
): CalculatorState => {
  if (state.mode === mode) return state;
  const leaving = state.mode;
  const cleared = clearEntry({
    ...state,
    mode,
    prompt: Option.none(),
    shift: false,
    alpha: false,
    resultFormat: Option.none(),
  });
  if (leaving === "STAT") {
    return patch(cleared, {
      stat: {
        ...cleared.stat,
        rows: emptyStatRows(),
        row: 0,
        column: 0,
        screen: "editor",
        readings: [],
      },
    });
  }
  if (mode === "BASE-N") {
    return patch(cleared, { base: "DEC" });
  }
  if (mode === "STAT") {
    return patch(cleared, {
      stat: { ...cleared.stat, screen: "editor", readings: [] },
    });
  }
  if (mode === "TABLE") {
    return patch(cleared, {
      table: {
        ...cleared.table,
        tokens: [],
        cursor: 0,
        field: "function",
        rows: Option.none(),
      },
    });
  }
  return cleared;
};

const cycleMode = (state: CalculatorState): CalculatorState => {
  const index = Arr.findFirstIndex(MODES, (mode) => mode.mode === state.mode);
  const next = (Option.getOrElse(index, () => 0) + 1) % MODES.length;
  return setMode(state, MODES[next]?.mode ?? "COMP");
};

const statColumns = (
  state: CalculatorState,
): ReadonlyArray<"x" | "y" | "freq"> =>
  columnsOf(state.stat.kind, state.stat.frequency);

const statCell = (
  state: CalculatorState,
  row: number,
  column: number,
): string => {
  const columns = statColumns(state);
  const key = columns[column];
  if (key === undefined) return "";
  return state.stat.rows[row]?.[key] ?? "";
};

const writeStatCell = (
  state: CalculatorState,
  value: string,
): CalculatorState => {
  const columns = statColumns(state);
  const key = columns[state.stat.column];
  if (key === undefined) return state;
  const rows = Arr.map(state.stat.rows, (row, index) =>
    index === state.stat.row ? { ...row, [key]: value } : row,
  );
  return patch(state, { stat: { ...state.stat, rows } });
};

const appendCellText = (current: string, key: string): string => {
  if (key === "DEL") return current.slice(0, -1);
  if (key === "AC") return "";
  if (key === "." && current.includes(".")) return current;
  if (key === "-" && current !== "") {
    return current.startsWith("-") ? current.slice(1) : `-${current}`;
  }
  return `${current}${key}`;
};

const editStat = (state: CalculatorState, key: string): CalculatorState => {
  const columns = statColumns(state);
  if (key === "AC") {
    return patch(state, {
      stat: {
        ...state.stat,
        rows: emptyStatRows(),
        row: 0,
        column: 0,
        readings: [],
      },
    });
  }
  if (key === "DEL")
    return writeStatCell(
      state,
      statCell(state, state.stat.row, state.stat.column).slice(0, -1),
    );
  if (key === "=") {
    const nextRow = Math.min(
      statRowLimit(state.stat.kind, state.stat.frequency) - 1,
      state.stat.row + 1,
    );
    return patch(state, { stat: { ...state.stat, row: nextRow } });
  }
  if (key === "left" || key === "right") {
    const next = key === "left" ? state.stat.column - 1 : state.stat.column + 1;
    return patch(state, {
      stat: {
        ...state.stat,
        column: Math.max(0, Math.min(columns.length - 1, next)),
      },
    });
  }
  if (key === "up" || key === "down") {
    const next = key === "up" ? state.stat.row - 1 : state.stat.row + 1;
    return patch(state, {
      stat: { ...state.stat, row: Math.max(0, Math.min(STAT_ROWS - 1, next)) },
    });
  }
  if (/^[0-9.+-]$/.test(key)) {
    return writeStatCell(
      state,
      appendCellText(statCell(state, state.stat.row, state.stat.column), key),
    );
  }
  return state;
};

const equationCellLabel = (state: CalculatorState): string =>
  coefficientLabels(state.equation.kind)[state.equation.cursor] ?? "";

const writeEquationCell = (
  state: CalculatorState,
  value: string,
): CalculatorState => {
  const cells = Arr.map(state.equation.cells, (cell, index) =>
    index === state.equation.cursor ? value : cell,
  );
  return patch(state, { equation: { ...state.equation, cells } });
};

const solveEquationEditor = (state: CalculatorState): CalculatorState => {
  const numbers = Arr.map(state.equation.cells, (cell) => Number(cell));
  if (!Arr.every(numbers, Number.isFinite)) {
    return withError(state, failure("Syntax"));
  }
  return Option.match(solveEquation(state.equation.kind, numbers), {
    onNone: () => withError(state, failure("Math")),
    onSome: (solutions) =>
      patch(state, {
        equation: {
          ...state.equation,
          solutions: Option.some(solutions),
          screen: "solution",
        },
        error: Option.none(),
      }),
  });
};

const editEquation = (state: CalculatorState, key: string): CalculatorState => {
  if (key === "AC") {
    return patch(state, {
      equation: {
        ...state.equation,
        cells: Arr.makeBy(coefficientCount(state.equation.kind), () => ""),
        cursor: 0,
        solutions: Option.none(),
        screen: "editor",
      },
    });
  }
  if (key === "=") {
    if (state.equation.cursor >= coefficientCount(state.equation.kind) - 1) {
      return solveEquationEditor(state);
    }
    return patch(state, {
      equation: { ...state.equation, cursor: state.equation.cursor + 1 },
    });
  }
  if (key === "left" || key === "right") {
    const next =
      key === "left" ? state.equation.cursor - 1 : state.equation.cursor + 1;
    return patch(state, {
      equation: {
        ...state.equation,
        cursor: Math.max(
          0,
          Math.min(coefficientCount(state.equation.kind) - 1, next),
        ),
      },
    });
  }
  if (key === "DEL") {
    return writeEquationCell(
      state,
      (state.equation.cells[state.equation.cursor] ?? "").slice(0, -1),
    );
  }
  if (/^[0-9.+-]$/.test(key)) {
    return writeEquationCell(
      state,
      appendCellText(state.equation.cells[state.equation.cursor] ?? "", key),
    );
  }
  return state;
};

const matrixCell = (state: CalculatorState): string =>
  state.matrix.variables[state.matrix.editing].cells[state.matrix.cursor] ?? "";

const writeMatrixCell = (
  state: CalculatorState,
  value: string,
): CalculatorState => {
  const current = state.matrix.variables[state.matrix.editing];
  const cells = Arr.map(current.cells, (cell, index) =>
    index === state.matrix.cursor ? value : cell,
  );
  return patch(state, {
    matrix: {
      ...state.matrix,
      variables: {
        ...state.matrix.variables,
        [state.matrix.editing]: { ...current, cells },
      },
    },
  });
};

const commitMatrix = (state: CalculatorState): CalculatorState => {
  const current = state.matrix.variables[state.matrix.editing];
  return Option.match(matrixOfVariable(current), {
    onNone: () => withError(state, failure("Syntax")),
    onSome: (value) =>
      patch(state, {
        matrix: {
          ...state.matrix,
          answer: Option.some(value),
          screen: "calc",
        },
        error: Option.none(),
      }),
  });
};

const editMatrix = (state: CalculatorState, key: string): CalculatorState => {
  const current = state.matrix.variables[state.matrix.editing];
  if (key === "AC") {
    return patch(state, {
      matrix: {
        ...state.matrix,
        variables: {
          ...state.matrix.variables,
          [state.matrix.editing]: {
            ...current,
            cells: Arr.makeBy(current.rows * current.columns, () => ""),
          },
        },
        cursor: 0,
      },
    });
  }
  if (key === "=") {
    if (state.matrix.cursor >= current.cells.length - 1)
      return commitMatrix(state);
    return patch(state, {
      matrix: { ...state.matrix, cursor: state.matrix.cursor + 1 },
    });
  }
  if (key === "left" || key === "right" || key === "up" || key === "down") {
    const step =
      key === "right"
        ? 1
        : key === "left"
          ? -1
          : key === "down"
            ? current.columns
            : -current.columns;
    const next = Math.max(
      0,
      Math.min(current.cells.length - 1, state.matrix.cursor + step),
    );
    return patch(state, { matrix: { ...state.matrix, cursor: next } });
  }
  if (key === "DEL")
    return writeMatrixCell(state, matrixCell(state).slice(0, -1));
  if (/^[0-9.+-]$/.test(key)) {
    return writeMatrixCell(state, appendCellText(matrixCell(state), key));
  }
  return state;
};

const vectorCell = (state: CalculatorState): string =>
  state.vector.variables[state.vector.editing][state.vector.cursor] ?? "";

const writeVectorCell = (
  state: CalculatorState,
  value: string,
): CalculatorState => {
  const current = state.vector.variables[state.vector.editing];
  return patch(state, {
    vector: {
      ...state.vector,
      variables: {
        ...state.vector.variables,
        [state.vector.editing]: Arr.map(current, (cell, index) =>
          index === state.vector.cursor ? value : cell,
        ),
      },
    },
  });
};

const commitVector = (state: CalculatorState): CalculatorState => {
  const current = state.vector.variables[state.vector.editing];
  return Option.match(vectorOfVariable(current), {
    onNone: () => withError(state, failure("Syntax")),
    onSome: (value) =>
      patch(state, {
        vector: { ...state.vector, answer: Option.some(value), screen: "calc" },
        error: Option.none(),
      }),
  });
};

const editVector = (state: CalculatorState, key: string): CalculatorState => {
  const current = state.vector.variables[state.vector.editing];
  if (key === "AC") {
    return patch(state, {
      vector: {
        ...state.vector,
        variables: {
          ...state.vector.variables,
          [state.vector.editing]: Arr.makeBy(current.length, () => ""),
        },
        cursor: 0,
      },
    });
  }
  if (key === "=") {
    if (state.vector.cursor >= current.length - 1) return commitVector(state);
    return patch(state, {
      vector: { ...state.vector, cursor: state.vector.cursor + 1 },
    });
  }
  if (key === "left" || key === "right" || key === "up" || key === "down") {
    const step = key === "right" || key === "down" ? 1 : -1;
    return patch(state, {
      vector: {
        ...state.vector,
        cursor: Math.max(
          0,
          Math.min(current.length - 1, state.vector.cursor + step),
        ),
      },
    });
  }
  if (key === "DEL")
    return writeVectorCell(state, vectorCell(state).slice(0, -1));
  if (/^[0-9.+-]$/.test(key)) {
    return writeVectorCell(state, appendCellText(vectorCell(state), key));
  }
  return state;
};

const tableFieldValue = (state: CalculatorState): string =>
  state.table.field === "start"
    ? state.table.start
    : state.table.field === "end"
      ? state.table.end
      : state.table.step;

const writeTableField = (
  state: CalculatorState,
  value: string,
): CalculatorState =>
  patch(state, {
    table: {
      ...state.table,
      ...(state.table.field === "start"
        ? { start: value }
        : state.table.field === "end"
          ? { end: value }
          : { step: value }),
    },
  });

const runTable = (state: CalculatorState): Effect.Effect<CalculatorState> =>
  Effect.gen(function* () {
    const parsed = parse(state.table.tokens);
    if (parsed._tag !== "ok") return withError(state, parsed);
    const request = {
      start: Number(state.table.start),
      end: Number(state.table.end),
      step: Number(state.table.step),
    };
    const xValues = tableValues(request);
    if (Option.isNone(xValues))
      return withError(state, failure("Insufficient MEM"));
    const context = contextOf(state);
    const rows = yield* Effect.forEach(
      xValues.value,
      (x) =>
        Effect.gen(function* () {
          const outcome = yield* Effect.result(
            evaluate(parsed.expr, {
              ...context,
              variables: { ...context.variables, X: x },
            }),
          );
          if (outcome._tag === "Failure")
            return yield* Effect.fail(outcome.failure);
          return yield* Option.match(
            asNumber(
              outcome.success._tag === "real" ||
                outcome.success._tag === "complex"
                ? outcome.success
                : real(Number.NaN),
            ),
            {
              onNone: () => Effect.fail(failure("Math")),
              onSome: (value) =>
                Effect.succeed({ x, value } satisfies TableRow),
            },
          );
        }),
      { concurrency: 1 },
    );
    return patch(state, {
      table: { ...state.table, rows: Option.some(rows) },
      error: Option.none(),
      variables: {
        ...state.variables,
        X: Option.getOrElse(
          Option.map(Arr.last(rows), (row) => row.x),
          () => state.variables.X ?? 0,
        ),
      },
    });
  }).pipe(
    Effect.catch((error: CalculatorFailure) =>
      Effect.succeed(withError(state, error)),
    ),
  );

const editTable = (
  state: CalculatorState,
  key: string,
): CalculatorState | null => {
  if (state.table.field === "function") {
    if (key === "AC")
      return patch(state, { table: { ...state.table, tokens: [], cursor: 0 } });
    if (key === "DEL") {
      const next =
        state.table.cursor > 0
          ? {
              tokens: Arr.appendAll(
                Arr.take(state.table.tokens, state.table.cursor - 1),
                Arr.drop(state.table.tokens, state.table.cursor),
              ),
              cursor: state.table.cursor - 1,
            }
          : { tokens: state.table.tokens, cursor: state.table.cursor };
      return patch(state, { table: { ...state.table, ...next } });
    }
    if (key === "=")
      return patch(state, { table: { ...state.table, field: "start" } });
    const token = tokenForKey(key);
    if (Option.isNone(token)) return null;
    const inserted = insertToken(
      state.table.tokens,
      state.table.cursor,
      token.value,
    );
    return patch(state, { table: { ...state.table, ...inserted } });
  }
  if (key === "=") {
    if (state.table.field === "start")
      return patch(state, { table: { ...state.table, field: "end" } });
    if (state.table.field === "end")
      return patch(state, { table: { ...state.table, field: "step" } });
    return state;
  }
  if (/^[0-9.+-]$/.test(key)) {
    return writeTableField(state, appendCellText(tableFieldValue(state), key));
  }
  if (key === "DEL")
    return writeTableField(state, tableFieldValue(state).slice(0, -1));
  if (key === "AC")
    return patch(state, { table: { ...state.table, field: "function" } });
  return state;
};

/* ------------------------------------------------------------------ */
/* Tokens for keys                                                     */
/* ------------------------------------------------------------------ */

const FUNCTION_TOKENS: Readonly<Record<string, InputToken>> = {
  sin: SIN,
  "sin⁻¹": SIN_INV,
  cos: COS,
  "cos⁻¹": COS_INV,
  tan: TAN,
  "tan⁻¹": TAN_INV,
  sinh: SINH,
  "sinh⁻¹": SINH_INV,
  cosh: COSH,
  "cosh⁻¹": COSH_INV,
  tanh: TANH,
  "tanh⁻¹": TANH_INV,
  log: LOG,
  logab: LOG,
  ln: LN,
  "√": SQRT,
  "∛": CBRT,
  "ⁿ√": NTH_ROOT,
  Abs: ABS,
  Rnd: RND,
  RanInt: RANINT,
  "∫": INTEGRAL,
  "d/dx": DERIVATIVE,
  Σ: SUMMATION,
  Pol: POL,
  Rec: REC,
  Conjg: CONJG,
  arg: ARG,
  Re: REAL_PART,
  Im: IMAGINARY_PART,
  Not: NOT,
  Neg: NEG,
};

const CONSTANT_TOKENS: Readonly<Record<string, InputToken>> = {
  π: PI,
  e: E,
  i: IMAGINARY,
  Ans: ANS,
  M: MEMORY,
};

const POSTFIX_TOKENS: Readonly<Record<string, InputToken>> = {
  "x²": SQUARE,
  "x³": CUBE,
  "x⁻¹": RECIPROCAL,
  "!": FACTORIAL,
  "%": PERCENT,
  "°": DEGREE,
  "′": MINUTE,
  "″": SECOND,
  rad: RADIAN_TAG,
  grad: GRAD_TAG,
};

const COMMAND_TOKENS: Readonly<Record<string, InputToken>> = {
  Ran: RAN,
  nPr: N_PR,
  nCr: N_CR,
  and: AND,
  or: OR,
  xor: XOR,
  xnor: XNOR,
  "•": DOT,
  "∠": POLAR,
};

/** The token a key inserts, if it inserts one. */
export const tokenForKey = (key: string): Option.Option<InputToken> => {
  if (/^[0-9]$/.test(key)) return Option.some(digit(key));
  if (key === ".") return Option.some(PERIOD);
  if (key === "(") return Option.some(OPEN);
  if (key === ")") return Option.some(CLOSE);
  if (key === ",") return Option.some(COMMA);
  if (key === ":") return Option.some(operator(":"));
  if (key === "minus") return Option.some(operator("-"));
  if (key === "+" || key === "-" || key === "×" || key === "÷" || key === "^") {
    return Option.some(operator(key));
  }
  if (key === "e10") return Option.some(EXP10);
  if (key === "=" || key === "=sign") return Option.some(EQUALS);
  if (key in FUNCTION_TOKENS)
    return Option.some(FUNCTION_TOKENS[key]) as Option.Option<InputToken>;
  if (key in CONSTANT_TOKENS)
    return Option.some(CONSTANT_TOKENS[key] ?? MEMORY);
  if (key in POSTFIX_TOKENS) return Option.some(POSTFIX_TOKENS[key] ?? PERCENT);
  if (key in COMMAND_TOKENS) return Option.some(COMMAND_TOKENS[key] ?? DOT);
  if (key === "MatA" || key === "MatB" || key === "MatC" || key === "MatAns") {
    return Option.some(variableToken(key));
  }
  if (key === "VctA" || key === "VctB" || key === "VctC" || key === "VctAns") {
    return Option.some(variableToken(key));
  }
  if (key === "a+bi") return Option.some(FORMAT_RECT);
  if (key === "r∠θ") return Option.some(FORMAT_POLAR);
  if (/^[A-FXYM]$/.test(key)) return Option.some(variableToken(key));
  if (/^[A-F]$/.test(key)) return Option.some(HEX_DIGITS[0] ?? digit("0"));
  return Option.none();
};

/**
 * What SHIFT and ALPHA make each key do: the legends printed on the fx-991ES
 * Plus body (`models/fx991es.ts`). A value the session does not handle (the
 * app's menus, or a printed-only legend) only clears the latch.
 */
export const SHIFT_KEYS: Readonly<Record<string, string>> = {
  CALC: "SOLVE",
  "∫": "d/dx",
  "x⁻¹": "!",
  logab: "Σ",
  frac: "mixed",
  "√": "∛",
  "x²": "x³",
  "^": "ⁿ√",
  log: "10^",
  ln: "e^",
  "-": "∠",
  "°": "°←",
  hyp: "Abs",
  sin: "sin⁻¹",
  cos: "cos⁻¹",
  tan: "tan⁻¹",
  sinh: "sinh⁻¹",
  cosh: "cosh⁻¹",
  tanh: "tanh⁻¹",
  RCL: "STO",
  ENG: "ENG←",
  "(": "%",
  ")": ",",
  "S⇔D": "ab/c⇔d/c",
  "M+": "M-",
  MODE: "SETUP",
  DEL: "INS",
  AC: "OFF",
  "7": "CONST",
  "8": "CONV",
  "9": "CLR",
  "4": "MATRIX",
  "5": "VECTOR",
  "1": "STAT",
  "2": "CMPLX",
  "3": "BASE",
  "×": "nPr",
  "÷": "nCr",
  "+": "Pol",
  minus: "Rec",
  "0": "Rnd",
  ".": "Ran",
  e10: "π",
  Ans: "DRG▸",
};

export const ALPHA_KEYS: Readonly<Record<string, string>> = {
  CALC: "=sign",
  "∫": ":",
  "-": "A",
  "°": "B",
  hyp: "C",
  sin: "D",
  cos: "E",
  tan: "F",
  ")": "X",
  "S⇔D": "Y",
  "M+": "M",
  ".": "RanInt",
  e10: "e",
};

/* ------------------------------------------------------------------ */
/* Prompt handling                                                     */
/* ------------------------------------------------------------------ */

const promptLabel = (prompt: PromptState): string =>
  prompt.names[prompt.index] ?? prompt.solveVariable;

const finishPrompt = (
  state: CalculatorState,
  prompt: PromptState,
): Effect.Effect<CalculatorState, never> => {
  if (prompt.purpose === "CALC") {
    return runEvaluation(state, prompt.tokens, {
      ...state.variables,
      ...prompt.values,
    }).pipe(Effect.map((next) => patch(next, { prompt: Option.none() })));
  }
  const fn = (x: number) =>
    Effect.gen(function* () {
      const parsed = parse(prompt.tokens);
      if (parsed._tag !== "ok") return yield* Effect.fail(parsed);
      const expression =
        parsed.expr._tag === "binary" && parsed.expr.op === "="
          ? {
              _tag: "binary" as const,
              op: "-",
              left: parsed.expr.left,
              right: parsed.expr.right,
            }
          : parsed.expr;
      const outcome = yield* evaluate(expression, {
        ...contextOf(state, {
          ...state.variables,
          ...prompt.values,
          [prompt.solveVariable]: x,
        }),
        variables: {
          ...state.variables,
          ...prompt.values,
          [prompt.solveVariable]: x,
        },
      });
      return yield* Option.match(
        asNumber(
          outcome._tag === "real" || outcome._tag === "complex"
            ? outcome
            : real(Number.NaN),
        ),
        {
          onNone: () => Effect.fail(failure("Can't Solve")),
          onSome: Effect.succeed,
        },
      );
    });
  const solve = Effect.gen(function* () {
    const initial = prompt.values[prompt.solveVariable] ?? 1;
    let current = initial;
    let residual = yield* fn(current);
    let remaining = 100;
    while (remaining > 0 && Math.abs(residual) > 1e-10) {
      const step = Math.max(1e-8, Math.abs(current) * 1e-6);
      const forward = yield* fn(current + step);
      const backward = yield* fn(current - step);
      const derivative = (forward - backward) / (2 * step);
      if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) break;
      current -= residual / derivative;
      residual = yield* fn(current);
      remaining -= 1;
    }
    return Math.abs(residual) <= 1e-8
      ? Option.some({ value: current, residual })
      : Option.none<{ readonly value: number; readonly residual: number }>();
  });
  return Effect.gen(function* () {
    const solved = yield* Effect.result(solve);
    if (solved._tag === "Failure") {
      return patch(withError(state, solved.failure), { prompt: Option.none() });
    }
    return Option.match(solved.success, {
      onNone: () =>
        patch(withError(state, failure("Can't Solve")), {
          prompt: Option.none(),
        }),
      onSome: (solution) =>
        patch(
          {
            ...state,
            ans: solution.value,
            ansValue: real(solution.value),
            variables: {
              ...state.variables,
              ...prompt.values,
              [prompt.solveVariable]: solution.value,
            },
            history: Arr.append(state.history, {
              tokens: prompt.tokens,
              result: real(solution.value),
              mode: state.mode,
            }),
            result: Option.some({
              _tag: "list",
              title: "SOLVE",
              items: [
                { label: prompt.solveVariable, value: real(solution.value) },
                { label: "L-R", value: real(solution.residual) },
              ],
            } satisfies CalcValue),
            error: Option.none(),
            prompt: Option.none(),
          },
          {},
        ),
    });
  });
};

const commitPrompt = (
  state: CalculatorState,
  prompt: PromptState,
): Effect.Effect<CalculatorState, never> => {
  const value =
    prompt.buffer === ""
      ? (prompt.values[promptLabel(prompt)] ?? 0)
      : Number(prompt.buffer);
  if (!Number.isFinite(value)) return Effect.succeed(state);
  const values = { ...prompt.values, [promptLabel(prompt)]: value };
  const nextIndex = prompt.index + 1;
  if (nextIndex < prompt.names.length) {
    return Effect.succeed(
      patch(state, {
        prompt: Option.some({
          ...prompt,
          index: nextIndex,
          buffer: "",
          values,
        }),
      }),
    );
  }
  if (prompt.purpose === "SOLVE") {
    const withInitial = { ...prompt, values, buffer: "" };
    return finishPrompt(state, withInitial);
  }
  return finishPrompt(state, { ...prompt, values, buffer: "" });
};

const pressPrompt = (
  state: CalculatorState,
  prompt: PromptState,
  key: string,
): Effect.Effect<CalculatorState, never> => {
  if (key === "AC")
    return Effect.succeed(patch(state, { prompt: Option.none() }));
  if (key === "=") return commitPrompt(state, prompt);
  if (key === "DEL") {
    return Effect.succeed(
      patch(state, {
        prompt: Option.some({ ...prompt, buffer: prompt.buffer.slice(0, -1) }),
      }),
    );
  }
  if (/^[0-9.+-]$/.test(key)) {
    return Effect.succeed(
      patch(state, {
        prompt: Option.some({
          ...prompt,
          buffer: appendCellText(prompt.buffer, key),
        }),
      }),
    );
  }
  return Effect.succeed(state);
};

/* ------------------------------------------------------------------ */
/* The main press                                                      */
/* ------------------------------------------------------------------ */

const shiftOrAlpha = (state: CalculatorState, key: string): string => {
  if (state.hyp) {
    if (key === "sin") return state.shift ? "sinh⁻¹" : "sinh";
    if (key === "cos") return state.shift ? "cosh⁻¹" : "cosh";
    if (key === "tan") return state.shift ? "tanh⁻¹" : "tanh";
  }
  if (state.shift) return SHIFT_KEYS[key] ?? key;
  if (state.alpha) return ALPHA_KEYS[key] ?? key;
  return key;
};

const insertFraction = (state: CalculatorState): CalculatorState => {
  const hasResult = Option.isSome(state.result);
  const at = hasResult ? 0 : state.cursor;
  const existing = hasResult ? [] : state.tokens;
  return patch(state, {
    tokens: Arr.appendAll(
      Arr.appendAll(Arr.take(existing, at), fractionTemplate),
      Arr.drop(existing, at),
    ),
    cursor: at + FRACTION_CURSOR,
    result: Option.none(),
    resultFormat: Option.none(),
    resultSymbolic: Option.none(),
    showAlternate: false,
    error: Option.none(),
    shift: false,
    alpha: false,
    hyp: false,
  });
};

const insertMain = (
  state: CalculatorState,
  key: string,
): CalculatorState | null => {
  const token = tokenForKey(key);
  if (Option.isNone(token)) return null;
  const held = token.value;
  const hasResult = Option.isSome(state.result);
  const startsOperand =
    held.kind === "digit" ||
    held.kind === "constant" ||
    held.kind === "variable" ||
    held.kind === "function";
  const base = hasResult
    ? startsOperand
      ? { tokens: [] as ReadonlyArray<InputToken>, cursor: 0 }
      : { tokens: [ANS] as ReadonlyArray<InputToken>, cursor: 1 }
    : { tokens: state.tokens, cursor: state.cursor };
  const inserted = insertToken(base.tokens, base.cursor, held);
  return patch(state, {
    tokens: inserted.tokens,
    cursor: inserted.cursor,
    result: hasResult ? Option.none() : state.result,
    resultFormat: hasResult ? Option.none() : state.resultFormat,
    showAlternate: false,
    error: Option.none(),
  });
};

const assignVariable = (
  state: CalculatorState,
  name: string,
  value: number,
): CalculatorState => {
  if (name === "M") return patch(state, { memory: value });
  return patch(state, { variables: { ...state.variables, [name]: value } });
};

const resultNumber = (state: CalculatorState): Option.Option<number> =>
  Option.flatMap(state.result, (value) =>
    value._tag === "real" ? Option.some(value.value) : Option.none(),
  );

const handlePending = (
  state: CalculatorState,
  key: string,
): CalculatorState | null => {
  if (!state.pendingStore && !state.pendingRecall) return null;
  const name = ALPHA_KEYS[key] ?? key;
  if (!/^[A-FXYM]$/.test(name)) {
    return patch(state, { pendingStore: false, pendingRecall: false });
  }
  if (state.pendingRecall) {
    const inserted = insertToken(
      state.tokens,
      state.cursor,
      variableToken(name),
    );
    return patch(state, {
      pendingRecall: false,
      pendingStore: false,
      tokens: inserted.tokens,
      cursor: inserted.cursor,
      result: Option.none(),
    });
  }
  const value = resultNumber(state);
  if (Option.isNone(value))
    return patch(state, { pendingStore: false, pendingRecall: false });
  return patch(state, {
    ...assignVariable(
      state,
      name,
      Option.getOrElse(value, () => 0),
    ),
    pendingStore: false,
    pendingRecall: false,
    result: Option.none(),
  });
};

const startCalc = (
  state: CalculatorState,
): Effect.Effect<CalculatorState, never> => {
  if (state.tokens.length === 0) return Effect.succeed(state);
  const parsed = parse(state.tokens);
  if (parsed._tag !== "ok") return Effect.succeed(withError(state, parsed));
  const names = variablesOfTokens(parsed.expr);
  if (names.length === 0) return runEvaluation(state, state.tokens);
  return Effect.succeed(
    patch(state, {
      prompt: Option.some({
        purpose: "CALC",
        names,
        index: 0,
        buffer: "",
        values: Object.fromEntries(
          Arr.map(names, (name) => [name, state.variables[name] ?? 0]),
        ),
        tokens: state.tokens,
        solveVariable: "X",
      }),
    }),
  );
};

const variablesOfTokens = (expr: Expr): ReadonlyArray<string> => {
  const collect = (node: Expr): ReadonlyArray<string> => {
    if (node._tag === "variable")
      return /^[A-FXY]$/.test(node.name) ? [node.name] : [];
    if (node._tag === "binary")
      return [...collect(node.left), ...collect(node.right)];
    if (
      node._tag === "unary" ||
      node._tag === "percent" ||
      node._tag === "postfix"
    )
      return collect(node.value);
    if (node._tag === "call") return Arr.flatMap(node.args, collect);
    if (node._tag === "sequence") return Arr.flatMap(node.items, collect);
    if (node._tag === "format" || node._tag === "baseTag")
      return collect(node.value);
    return [];
  };
  return Arr.dedupe(collect(expr));
};

const startSolve = (
  state: CalculatorState,
): Effect.Effect<CalculatorState, never> => {
  if (state.tokens.length === 0) return Effect.succeed(state);
  const parsed = parse(state.tokens);
  if (parsed._tag !== "ok") return Effect.succeed(withError(state, parsed));
  const names = variablesOfTokens(parsed.expr);
  const solveVariable = names.includes("X") ? "X" : (names[0] ?? "X");
  const prompts = Arr.filter(names, (name) => name !== solveVariable);
  return Effect.succeed(
    patch(state, {
      prompt: Option.some({
        purpose: "SOLVE",
        names: Arr.append(prompts, solveVariable),
        index: 0,
        buffer: "",
        values: {
          ...Object.fromEntries(
            Arr.map(prompts, (name) => [name, state.variables[name] ?? 0]),
          ),
          [solveVariable]: state.variables[solveVariable] ?? 1,
        },
        tokens: state.tokens,
        solveVariable,
      }),
    }),
  );
};

const evaluateEquals = (
  state: CalculatorState,
): Effect.Effect<CalculatorState, never> =>
  state.tokens.length === 0
    ? Effect.succeed(state)
    : runEvaluation(state, state.tokens);

export const press = (
  state: CalculatorState,
  rawKey: string,
): Effect.Effect<CalculatorState, never> => {
  if (Option.isSome(state.prompt)) {
    return pressPrompt(state, state.prompt.value, rawKey);
  }
  if (state.mode === "STAT" && state.stat.screen === "editor") {
    if (rawKey === "MODE") return Effect.succeed(cycleMode(state));
    return Effect.succeed(editStat(state, rawKey));
  }
  if (state.mode === "EQN" && state.equation.screen === "editor") {
    if (rawKey === "MODE") return Effect.succeed(cycleMode(state));
    return Effect.succeed(editEquation(state, rawKey));
  }
  if (state.mode === "MATRIX" && state.matrix.screen === "editor") {
    if (rawKey === "MODE") return Effect.succeed(cycleMode(state));
    return Effect.succeed(editMatrix(state, rawKey));
  }
  if (state.mode === "VECTOR" && state.vector.screen === "editor") {
    if (rawKey === "MODE") return Effect.succeed(cycleMode(state));
    return Effect.succeed(editVector(state, rawKey));
  }
  if (state.mode === "TABLE") {
    if (rawKey === "MODE") return Effect.succeed(cycleMode(state));
    if (rawKey === "=" && state.table.field === "step") return runTable(state);
    const edited = editTable(state, rawKey);
    if (edited !== null) return Effect.succeed(edited);
    return Effect.succeed(state);
  }

  const pending = handlePending(state, rawKey);
  if (pending !== null) return Effect.succeed(pending);

  if (rawKey === "SHIFT")
    return Effect.succeed(patch(state, { shift: !state.shift, alpha: false }));
  if (rawKey === "ALPHA")
    return Effect.succeed(patch(state, { alpha: !state.alpha, shift: false }));
  if (rawKey === "hyp" && !state.shift && !state.alpha)
    return Effect.succeed(patch(state, { hyp: !state.hyp }));

  const key = shiftOrAlpha(state, rawKey);
  const resetLatches = { shift: false, alpha: false };
  if (key === "ON") return Effect.succeed(patch(state, resetLatches));
  if (key === "MODE") return Effect.succeed(cycleMode(state));
  if (key === "AC") return Effect.succeed(clearEntry(state));
  if (key === "DEL") {
    const next =
      state.cursor > 0
        ? {
            tokens: Arr.appendAll(
              Arr.take(state.tokens, state.cursor - 1),
              Arr.drop(state.tokens, state.cursor),
            ),
            cursor: state.cursor - 1,
          }
        : { tokens: state.tokens, cursor: state.cursor };
    return Effect.succeed(patch(clearEntry(state), next));
  }
  if (key === "=" || key === "ENTER") return evaluateEquals(state);
  if (key === "left" || key === "right") {
    return Effect.succeed(
      patch(state, {
        cursor: moveInInput(
          state.tokens,
          state.cursor,
          key === "left" ? -1 : 1,
        ),
      }),
    );
  }
  if (key === "up" || key === "down") {
    if (Option.isSome(state.result) && state.history.length > 0) {
      const index = key === "up" ? state.history.length - 1 : 0;
      const entry = state.history[index];
      if (entry !== undefined) {
        return Effect.succeed(
          patch(state, {
            tokens: entry.tokens,
            cursor: entry.tokens.length,
            result: Option.none(),
            error: Option.none(),
          }),
        );
      }
    }
    return Effect.succeed(state);
  }
  if (key === "STO")
    return Effect.succeed(
      patch(state, { pendingStore: true, ...resetLatches }),
    );
  if (key === "RCL")
    return Effect.succeed(
      patch(state, { pendingRecall: true, ...resetLatches }),
    );
  if (key === "M+" || key === "M-") {
    const sign = key === "M+" ? 1 : -1;
    return Effect.succeed(
      Option.match(resultNumber(state), {
        onNone: () => patch(state, resetLatches),
        onSome: (value) =>
          patch(state, {
            memory: state.memory + sign * value,
            ...resetLatches,
          }),
      }),
    );
  }
  if (key === "CALC") return startCalc(patch(state, resetLatches));
  if (key === "SOLVE") return startSolve(patch(state, resetLatches));
  if (key === "ENG" && state.mode === "CMPLX") {
    return Effect.succeed(insertMain(patch(state, resetLatches), "i") ?? state);
  }
  // ENG shows engineering notation; SHIFT ENG (←) returns to the normal form.
  // TODO: step the exponent by 3 per press, as the device does.
  if (key === "ENG" || key === "ENG←") {
    return Effect.succeed(
      patch(state, { engineering: key === "ENG", ...resetLatches }),
    );
  }
  if (key === "S⇔D") {
    return Effect.succeed(
      patch(state, { showAlternate: !state.showAlternate, ...resetLatches }),
    );
  }
  if (key === "frac") return Effect.succeed(insertFraction(state));
  if (key === "10^") {
    const inserted = insertTokensAt(state, [
      digit("1"),
      digit("0"),
      operator("^"),
    ]);
    return Effect.succeed(patch(inserted, resetLatches));
  }
  if (key === "e^") {
    const inserted = insertTokensAt(state, [E, operator("^")]);
    return Effect.succeed(patch(inserted, resetLatches));
  }
  const base =
    state.mode === "BASE-N" && /^[A-F]$/.test(key)
      ? HEX_DIGITS.find((held) => held.text === key)
      : undefined;
  if (base !== undefined) {
    const inserted = insertToken(state.tokens, state.cursor, base);
    return Effect.succeed(
      patch(state, { ...inserted, ...resetLatches, error: Option.none() }),
    );
  }
  const inserted = insertMain(patch(state, resetLatches), key);
  if (inserted !== null) {
    return Effect.succeed(
      state.hyp &&
        Arr.contains(
          ["sinh", "cosh", "tanh", "sinh⁻¹", "cosh⁻¹", "tanh⁻¹"],
          key,
        )
        ? patch(inserted, { hyp: false })
        : inserted,
    );
  }
  return Effect.succeed(patch(state, resetLatches));
};

const insertTokensAt = (
  state: CalculatorState,
  tokens: ReadonlyArray<InputToken>,
): CalculatorState => {
  const at = Option.isSome(state.result) ? 0 : state.cursor;
  const existing = Option.isSome(state.result) ? [] : state.tokens;
  return patch(state, {
    tokens: Arr.appendAll(
      Arr.appendAll(Arr.take(existing, at), tokens),
      Arr.drop(existing, at),
    ),
    cursor: at + tokens.length,
    result: Option.none(),
    resultFormat: Option.none(),
    error: Option.none(),
    showAlternate: false,
  });
};

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

export const runAction = (
  state: CalculatorState,
  action: CommandAction,
): Effect.Effect<CalculatorState, never> => {
  if (action._tag === "insert") {
    return Effect.succeed(insertTokensAt(state, action.tokens));
  }
  if (action._tag === "mode")
    return Effect.succeed(setMode(state, action.mode));
  if (action._tag === "setup") {
    return Effect.succeed(
      patch(state, { setup: { ...state.setup, ...action.setup } }),
    );
  }
  if (action._tag === "base") {
    return Effect.succeed(
      patch(state, {
        base: action.base,
        tokens: [],
        cursor: 0,
        result: Option.none(),
      }),
    );
  }
  if (action._tag === "stat-type") {
    return Effect.succeed(
      patch(state, {
        stat: {
          ...state.stat,
          kind: action.kind,
          rows: emptyStatRows(),
          row: 0,
          column: 0,
          screen: "editor",
          readings: [],
        },
        mode: "STAT",
        tokens: [],
        result: Option.none(),
      }),
    );
  }
  if (action._tag === "stat-screen") {
    return Effect.succeed(
      patch(state, { stat: { ...state.stat, screen: action.screen } }),
    );
  }
  if (action._tag === "stat-menu" || action._tag === "stat-reading") {
    const points = pointsOf(state.stat.rows, state.stat.frequency);
    const argument =
      state.stat.argument === "" ? undefined : Number(state.stat.argument);
    const readings =
      action._tag === "stat-menu"
        ? readingsFor(
            { kind: state.stat.kind, points, argument },
            action.command,
          )
        : Option.match(
            statReading({ kind: state.stat.kind, points, argument }, action.id),
            {
              onNone: () => [],
              onSome: (reading) => [reading],
            },
          );
    const list: CalcValue = {
      _tag: "list",
      title:
        action._tag === "stat-menu" ? action.command.toUpperCase() : action.id,
      items: Arr.map(readings, (reading) => ({
        label: reading.label,
        value: real(reading.value),
      })),
    };
    return Effect.succeed(
      patch(state, {
        stat: {
          ...state.stat,
          screen: "calc",
          readings,
          title: list.title,
        },
        result: readings.length === 0 ? Option.none() : Option.some(list),
        error:
          readings.length === 0
            ? Option.some(failure("Argument"))
            : Option.none(),
      }),
    );
  }
  if (action._tag === "stat-argument") {
    return Effect.succeed(
      patch(state, { stat: { ...state.stat, argument: String(action.value) } }),
    );
  }
  if (action._tag === "equation-solve") {
    return Effect.succeed(solveEquationEditor(state));
  }
  if (action._tag === "equation-cell") {
    return Effect.succeed(
      patch(state, {
        equation: {
          ...state.equation,
          cursor: Math.max(
            0,
            Math.min(coefficientCount(state.equation.kind) - 1, action.index),
          ),
        },
      }),
    );
  }
  if (action._tag === "stat-cell") {
    return Effect.succeed(
      patch(state, {
        stat: {
          ...state.stat,
          row: Math.max(
            0,
            Math.min(
              statRowLimit(state.stat.kind, state.stat.frequency) - 1,
              action.row,
            ),
          ),
          column: Math.max(0, action.column),
        },
      }),
    );
  }
  if (action._tag === "matrix-cell") {
    return Effect.succeed(
      patch(state, {
        matrix: {
          ...state.matrix,
          cursor: Math.max(
            0,
            Math.min(
              state.matrix.variables[state.matrix.editing].cells.length - 1,
              action.index,
            ),
          ),
        },
      }),
    );
  }
  if (action._tag === "vector-cell") {
    return Effect.succeed(
      patch(state, {
        vector: {
          ...state.vector,
          cursor: Math.max(
            0,
            Math.min(
              state.vector.variables[state.vector.editing].length - 1,
              action.index,
            ),
          ),
        },
      }),
    );
  }
  if (action._tag === "replay") {
    return Effect.succeed(
      patch(state, {
        tokens: action.tokens,
        cursor: action.tokens.length,
        result: Option.fromUndefinedOr(action.result),
        error: Option.none(),
        showAlternate: false,
      }),
    );
  }
  if (action._tag === "equation-type") {
    return Effect.succeed(
      patch(state, {
        equation: {
          kind: action.kind,
          cells: Arr.makeBy(coefficientCount(action.kind), () => ""),
          cursor: 0,
          solutions: Option.none(),
          screen: "editor",
        },
        mode: "EQN",
      }),
    );
  }
  if (action._tag === "matrix-edit") {
    return Effect.succeed(
      patch(state, {
        matrix: {
          ...state.matrix,
          editing: action.matrix,
          cursor: 0,
          screen: "editor",
        },
        mode: "MATRIX",
      }),
    );
  }
  if (action._tag === "matrix-dim") {
    return Effect.succeed(
      patch(state, {
        matrix: {
          ...state.matrix,
          editing: action.matrix,
          cursor: 0,
          screen: "editor",
          variables: {
            ...state.matrix.variables,
            [action.matrix]: matrixVariable(action.rows, action.columns),
          },
        },
        mode: "MATRIX",
      }),
    );
  }
  if (action._tag === "matrix-calc") {
    return Effect.succeed(
      patch(state, { matrix: { ...state.matrix, screen: action.screen } }),
    );
  }
  if (action._tag === "vector-edit") {
    return Effect.succeed(
      patch(state, {
        vector: {
          ...state.vector,
          editing: action.vector,
          cursor: 0,
          screen: "editor",
        },
        mode: "VECTOR",
      }),
    );
  }
  if (action._tag === "vector-dim") {
    return Effect.succeed(
      patch(state, {
        vector: {
          ...state.vector,
          editing: action.vector,
          cursor: 0,
          screen: "editor",
          variables: {
            ...state.vector.variables,
            [action.vector]: Arr.makeBy(action.size, () => ""),
          },
        },
        mode: "VECTOR",
      }),
    );
  }
  if (action._tag === "vector-calc") {
    return Effect.succeed(
      patch(state, { vector: { ...state.vector, screen: action.screen } }),
    );
  }
  if (action._tag === "table-field") {
    return Effect.succeed(
      patch(state, { table: { ...state.table, field: action.field } }),
    );
  }
  if (action._tag === "table-run")
    return runTable(patch(state, { mode: "TABLE" }));
  if (action._tag === "table-reset") {
    return Effect.succeed(
      patch(state, {
        table: {
          ...state.table,
          tokens: [],
          cursor: 0,
          rows: Option.none(),
          field: "function",
        },
      }),
    );
  }
  if (action._tag === "clear") {
    if (action.scope === "setup") {
      return Effect.succeed(clearEntry(patch(state, { setup: defaultSetup })));
    }
    if (action.scope === "memory") {
      return Effect.succeed(
        clearEntry(
          patch(state, {
            variables: emptyVariables(),
            ans: 0,
            ansValue: real(0),
            memory: 0,
          }),
        ),
      );
    }
    return Effect.succeed(
      clearEntry(
        patch(state, {
          setup: defaultSetup,
          variables: emptyVariables(),
          ans: 0,
          ansValue: real(0),
          memory: 0,
          history: [],
          stat: { ...state.stat, rows: emptyStatRows(), readings: [] },
          matrix: {
            ...state.matrix,
            variables: emptyMatrices(),
            answer: Option.none(),
          },
          vector: {
            ...state.vector,
            variables: emptyVectors(),
            answer: Option.none(),
          },
        }),
      ),
    );
  }
  if (action._tag === "calc") return startCalc(state);
  if (action._tag === "solve") return startSolve(state);
  if (action._tag === "alternate") {
    return Effect.succeed(
      patch(state, { showAlternate: !state.showAlternate }),
    );
  }
  if (action._tag === "engineering") {
    return Effect.succeed(
      patch(state, { showAlternate: action.direction !== 0 }),
    );
  }
  return Effect.succeed(state);
};

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

export interface DisplayState {
  readonly expression: string;
  readonly expressionCaret: string;
  readonly result: string;
  readonly resultRows: ReadonlyArray<string>;
  readonly layout: Option.Option<MathNode>;
  readonly inputLayout: Option.Option<MathNode>;
  readonly alternate: Option.Option<string>;
  readonly error: Option.Option<string>;
  readonly mode: Mode;
  readonly title: string;
  readonly indicators: ReadonlyArray<string>;
  readonly prompt: Option.Option<{
    readonly label: string;
    readonly buffer: string;
  }>;
}

const displaySetup = (state: CalculatorState): Setup =>
  Option.match(state.resultFormat, {
    onNone: () => state.setup,
    onSome: (format) => ({
      ...state.setup,
      complexFormat: format === "rect" ? "a+bi" : "r∠θ",
    }),
  });

const formattedResult = (
  state: CalculatorState,
): Option.Option<FormattedValue> =>
  Option.map(state.result, (value) => formatValue(value, displaySetup(state)));

export const displayOf = (state: CalculatorState): DisplayState => {
  const formatted = formattedResult(state);
  const alternate = Option.flatMap(formatted, (value) => value.alternate);
  const baseText = Option.getOrElse(
    Option.map(formatted, (value) => value.text),
    () => "",
  );
  const engineeringText =
    state.engineering &&
    Option.isSome(state.result) &&
    state.result.value._tag === "real"
      ? formatEngineering(state.result.value.value, displaySetup(state))
      : baseText;
  const chosen = state.showAlternate
    ? Option.getOrElse(alternate, () => engineeringText)
    : engineeringText;
  const layout = Option.flatMap(state.result, (value) =>
    state.showAlternate || state.engineering
      ? Option.none<MathNode>()
      : layoutOf(value, displaySetup(state), state.resultSymbolic),
  );
  const error = Option.map(state.error, (held) => held.message);
  const modeIndicator =
    state.mode === "MATRIX"
      ? "MAT"
      : state.mode === "VECTOR"
        ? "VCT"
        : state.mode === "BASE-N"
          ? "BASE"
          : state.mode;
  const indicatorList: string[] = [modeIndicator];
  if (state.shift) indicatorList.push("SHIFT");
  if (state.alpha) indicatorList.push("ALPHA");
  if (state.memory !== 0) indicatorList.push("M");
  if (state.pendingStore) indicatorList.push("STO");
  if (state.pendingRecall) indicatorList.push("RCL");
  indicatorList.push(state.setup.angle);
  if (state.setup.number.kind === "Fix") indicatorList.push("FIX");
  if (state.setup.number.kind === "Sci") indicatorList.push("SCI");
  if (state.setup.display !== "LineIO") indicatorList.push("Math");
  if (state.history.length > 0) indicatorList.push("↑");

  const editor = editorDisplay(state);
  const prompt = Option.map(state.prompt, (held) => ({
    label: promptLabel(held),
    buffer: held.buffer,
  }));
  const structuredInput =
    state.setup.display === "MthIO-MathO" &&
    Option.isNone(state.prompt) &&
    (state.mode === "COMP" ||
      state.mode === "CMPLX" ||
      state.mode === "BASE-N");
  const inputLayout = structuredInput
    ? Option.some(inputLayoutOf(state.tokens, state.cursor))
    : Option.none<MathNode>();
  return {
    expression:
      editor.expression || inputTextWithCaret(state.tokens, state.cursor),
    expressionCaret:
      editor.expression || inputTextWithCaret(state.tokens, state.cursor),
    result: error !== undefined && Option.isSome(state.error) ? "" : chosen,
    resultRows:
      editor.rows.length > 0
        ? editor.rows
        : state.engineering
          ? [engineeringText]
          : Option.getOrElse(
              Option.map(formatted, (value) => value.rows),
              () => [],
            ),
    layout,
    inputLayout,
    alternate,
    error,
    mode: state.mode,
    title: editor.title,
    indicators: indicatorList,
    prompt,
  };
};

const editorDisplay = (
  state: CalculatorState,
): {
  readonly expression: string;
  readonly rows: ReadonlyArray<string>;
  readonly title: string;
} => {
  if (Option.isSome(state.prompt)) {
    const prompt = state.prompt.value;
    return {
      expression: `${promptLabel(prompt)}?`,
      rows: [
        prompt.buffer === ""
          ? String(prompt.values[promptLabel(prompt)] ?? 0)
          : prompt.buffer,
      ],
      title: prompt.purpose,
    };
  }
  if (state.mode === "STAT") {
    if (state.stat.screen === "calc") {
      return {
        expression: state.stat.title,
        rows: Arr.map(
          state.stat.readings,
          (reading) => `${reading.label}=${reading.value}`,
        ),
        title: "STAT",
      };
    }
    const columns = statColumns(state);
    return {
      expression: `${columns[state.stat.column]?.toUpperCase() ?? "X"}${state.stat.row + 1}`,
      rows: Arr.take(
        Arr.map(
          state.stat.rows,
          (row, index) =>
            `${String(index + 1).padStart(2, " ")}  ${columns
              .map((column) => (row[column] === "" ? "—" : row[column]))
              .join("  ")}`,
        ),
        6,
      ),
      title: state.stat.kind,
    };
  }
  if (state.mode === "EQN") {
    if (state.equation.screen === "solution") {
      return {
        expression: equationLabel(state.equation.kind),
        rows: Option.getOrElse(
          Option.map(state.equation.solutions, (solutions) =>
            Arr.map(
              solutions,
              (solution) =>
                `${solution.label}=${describeScalar(solution.value)}`,
            ),
          ),
          () => [],
        ),
        title: "EQN",
      };
    }
    return {
      expression: `${equationCellLabel(state)}?`,
      rows: [state.equation.cells[state.equation.cursor] ?? ""],
      title: equationLabel(state.equation.kind),
    };
  }
  if (state.mode === "MATRIX") {
    const variable = state.matrix.variables[state.matrix.editing];
    if (state.matrix.screen === "calc" && Option.isSome(state.matrix.answer)) {
      const answer = state.matrix.answer.value;
      return {
        expression: `Mat${state.matrix.editing}`,
        rows: Arr.map(answer.rows, (row) => `[ ${row.join("  ")} ]`),
        title: "MATRIX",
      };
    }
    return {
      expression: `Mat${state.matrix.editing} [${variable.rows}×${variable.columns}]`,
      rows: Arr.map(Arr.range(0, variable.rows - 1), (row) =>
        Arr.range(0, variable.columns - 1)
          .map(
            (column) => variable.cells[row * variable.columns + column] || "0",
          )
          .join("  "),
      ),
      title: "MATRIX",
    };
  }
  if (state.mode === "VECTOR") {
    const cells = state.vector.variables[state.vector.editing];
    return {
      expression: `Vct${state.vector.editing}`,
      rows: [cells.map((cell) => cell || "0").join("  ")],
      title: "VECTOR",
    };
  }
  if (state.mode === "TABLE") {
    if (Option.isSome(state.table.rows)) {
      return {
        expression: "f(x)",
        rows: Arr.map(
          Option.getOrElse(state.table.rows, () => []),
          (row) => `x=${row.x}  f(x)=${row.value}`,
        ),
        title: "TABLE",
      };
    }
    return {
      expression: `f(x)=${inputText(state.table.tokens)}`,
      rows: [
        `Start ${state.table.start}  End ${state.table.end}  Step ${state.table.step}`,
      ],
      title: "TABLE",
    };
  }
  return { expression: "", rows: [], title: state.mode };
};

const describeScalar = (value: CalcValue): string => {
  if (value._tag === "real") return String(value.value);
  if (value._tag === "complex") return `${value.re}+${value.im}i`;
  return "";
};
