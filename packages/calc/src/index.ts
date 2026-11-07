export {
  CalculatorFailure,
  FailureKind,
  failure,
  isFailure,
  messageOf,
} from "./failure.js";
export type { FailureKind as CalculatorFailureKind } from "./failure.js";

export {
  BASE_DEC,
  BASE_HEX,
  BASE_BIN,
  BASE_OCT,
  CUBE,
  FACTORIAL,
  NEG,
  NOT,
  PERCENT,
  RECIPROCAL,
  SQUARE,
} from "./input/token.js";
export {
  calculatorKeyOf,
  isApplicationChord,
  modeChordIndex,
  type KeyChord,
} from "./input/keyboard.js";
export {
  conversion,
  inputText,
  inputTextWithCaret,
  namedConstant,
} from "./input/token.js";
export type { InputToken, TokenKind } from "./input/token.js";

export { formatDecimal, formatValue, type FormattedValue } from "./format.js";
export { parse, variablesOf, type Expr } from "./parser.js";
export {
  symbolicOf,
  projectSymbolic,
  agrees,
  type Symbolic,
} from "./symbolic.js";
export {
  inputLayoutOf,
  moveInInput,
  fractionTemplate,
  FRACTION_CURSOR,
} from "./input-layout.js";
export type { MathNode } from "./layout.js";
export { evaluate, describeValue, type EvaluationContext } from "./evaluate.js";
export type {
  BaseValue,
  CalcValue,
  ComplexValue,
  ListValue,
  MatrixValue,
  Real,
  Scalar,
  VectorValue,
} from "./value.js";

export { scientificConstants, metricConversions } from "./constants.js";
export type { ScientificConstant, MetricConversion } from "./constants.js";

export {
  MODES,
  type CalculatorCommand,
  type ClearScope,
  type CommandAction,
  type Mode,
  type ModeSpec,
} from "./commands.js";
export {
  modelOf,
  models,
  defaultModel,
  fx991es,
  type ModelId,
} from "./models/index.js";
export { keypadKeys } from "./model.js";
export type {
  CalculatorModel,
  DirectionPad,
  Keypad,
  KeypadKey,
  KeypadRow,
  ModelCapabilities,
  Tone,
} from "./model.js";

export {
  contextOf,
  displayOf,
  initialState,
  press,
  runAction,
  setMode,
  tokenForKey,
  type CalculatorState,
  type DisplayState,
  type EquationEditorState,
  type HistoryEntry,
  type MatrixEditorState,
  type MatrixVariable,
  type PromptState,
  type StatEditorState,
  type TableEditorState,
  type VectorEditorState,
} from "./session.js";
export type { Reading as CalculatorReading } from "./value.js";

export {
  coefficientCount,
  coefficientLabels,
  equationLabel,
  newtonSolve,
  solveEquation,
  EQUATION_KINDS,
  type EquationKind,
  type EquationSolution,
} from "./modes/eqn.js";
export {
  STAT_KINDS,
  columnsOf,
  emptyStatRows,
  isPaired,
  pointsOf,
  readingsFor,
  regressionOf,
  statReading,
  sumsOf,
  type StatCommand,
  type StatKind,
  type StatPoint,
  type StatReadingId,
  type StatRow,
} from "./modes/stat.js";
export {
  tableValues,
  buildTable,
  DEFAULT_TABLE,
  type TableRow,
} from "./modes/table.js";

export { makeCalculatorStore, type CalculatorStore } from "./store.js";
