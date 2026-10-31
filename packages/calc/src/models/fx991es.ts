/**
 * The fx-991ES Plus model: the eight modes, the keypad every app paints, and
 * the searchable catalogue over every function and command in the manual.
 *
 * A row is data, not a closure. The palette, the keypad and the keyboard all
 * name the same `CommandAction`, and `session.runAction` is the one interpreter.
 */

import {
  ABS,
  AND,
  ARG,
  BASE_DEC,
  BASE_HEX,
  BASE_BIN,
  BASE_OCT,
  CBRT,
  CLOSE,
  CONJG,
  DET,
  COS,
  COS_INV,
  COSH,
  COSH_INV,
  conversion,
  DERIVATIVE,
  digit,
  E,
  FORMAT_POLAR,
  FORMAT_RECT,
  GRAD_TAG,
  IMAGINARY_PART,
  INTEGRAL,
  LN,
  LOG,
  N_CR,
  N_PR,
  namedConstant,
  operator,
  NEG,
  NOT,
  NTH_ROOT,
  OR,
  POL,
  RADIAN_TAG,
  RAN,
  RANINT,
  REAL_PART,
  REC,
  RND,
  SIN,
  SIN_INV,
  SINH,
  SINH_INV,
  SQRT,
  SUMMATION,
  TAN,
  TAN_INV,
  TANH,
  TANH_INV,
  TRN,
  variableToken,
  XNOR,
  XOR,
  type InputToken,
} from "../input/token.js";
import { metricConversions, scientificConstants } from "../constants.js";
import * as Arr from "effect/Array";
import type { CalculatorCommand, CommandAction, Mode } from "../commands.js";
import { numberFormatAction, MODES } from "../commands.js";
import { EQUATION_KINDS, equationLabel } from "../modes/eqn.js";
import { STAT_KINDS, type StatReadingId } from "../modes/stat.js";
import type {
  CalculatorModel,
  KeypadKey,
  KeypadRow,
  ModelCapabilities,
} from "../model.js";
import { BASE_NAMES, BASE_RADIX } from "../setup.js";

const key = (
  id: string,
  primary: string,
  tone: KeypadKey["tone"] = "function",
  extras: Omit<KeypadKey, "id" | "primary" | "tone"> = {},
): KeypadKey => ({ id, primary, tone, ...extras });

const row = (...keys: ReadonlyArray<KeypadKey>): KeypadRow => ({ keys });

const keypad: ReadonlyArray<KeypadRow> = [
  row(
    key("SHIFT", "SHIFT", "accent", { label: "Shift" }),
    key("ALPHA", "ALPHA", "accent", { label: "Alpha" }),
    key("MODE", "MODE", "control"),
    key("ON", "ON", "control"),
    key("left", "◀", "control", { label: "Cursor left" }),
    key("right", "▶", "control", { label: "Cursor right" }),
  ),
  row(
    key("CALC", "CALC", "control"),
    key("∫", "∫dx", "function", { shift: "∫" }),
    key("x⁻¹", "x⁻¹", "function", { shift: "x!" }),
    key("log", "log", "function", { shift: "10ˣ" }),
    key("ln", "ln", "function", { shift: "eˣ" }),
    key("-", "(−)", "operator", { label: "Negative" }),
  ),
  row(
    key("RCL", "RCL", "control"),
    key("ENG", "ENG", "control", { shift: "←" }),
    key("(", "(", "operator"),
    key(")", ")", "operator"),
    key(",", ",", "operator"),
    key("M+", "M+", "control", { shift: "M−" }),
  ),
  row(
    key("x²", "x²", "function", { shift: "x³" }),
    key("x³", "x³", "function", { shift: "x⁻¹" }),
    key("^", "xʸ", "operator"),
    key("√", "√", "function", { shift: "∛" }),
    key("frac", "a/b", "function", { label: "Fraction" }),
    key("Abs", "Abs", "function"),
  ),
  row(
    key("7", "7", "number"),
    key("8", "8", "number"),
    key("9", "9", "number"),
    key("DEL", "DEL", "control"),
    key("AC", "AC", "control"),
    key("×", "×", "operator"),
  ),
  row(
    key("4", "4", "number"),
    key("5", "5", "number"),
    key("6", "6", "number"),
    key("+", "+", "operator"),
    key("minus", "−", "operator"),
    key("÷", "÷", "operator"),
  ),
  row(
    key("1", "1", "number"),
    key("2", "2", "number"),
    key("3", "3", "number"),
    key("sin", "sin", "function", { shift: "sin⁻¹" }),
    key("cos", "cos", "function", { shift: "cos⁻¹" }),
    key("tan", "tan", "function", { shift: "tan⁻¹" }),
  ),
  row(
    key("0", "0", "number"),
    key(".", ".", "number"),
    key("e10", "×10ˣ", "number", { label: "Times ten to the power" }),
    key("Ans", "Ans", "control"),
    key("=", "=", "equals"),
    key("M-", "M−", "control", { shift: "M+" }),
  ),
  row(
    key("STO", "STO", "control"),
    key("hyp", "hyp", "function"),
    key("°", "°′″", "function", { shift: "′" }),
    key("nPr", "nPr", "function", { shift: "nCr" }),
    key("nCr", "nCr", "function"),
    key("π", "π", "function"),
  ),
  row(
    key("e", "e", "function"),
    key("i", "i", "function"),
    key("Σ", "Σ", "function"),
    key("d/dx", "d/dx", "function"),
    key("Pol", "Pol", "function"),
    key("Rec", "Rec", "function"),
  ),
];

const capabilities: ModelCapabilities = {
  naturalDisplay: true,
  complex: true,
  baseN: true,
  statistics: true,
  equations: true,
  matrix: true,
  vector: true,
  table: true,
  integral: true,
  solve: true,
  distribution: true,
  verify: false,
  notes: [
    "The manual's eight modes are COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE and VECTOR.",
    "VERIFY is not in this model's manual; it is absent rather than imitated.",
    "Natural Display is native on both lines: stacked fraction/radical/superscript input slots and the same forms in results; LineIO stays linear.",
    "Matrix and vector dimensions are 1×1…3×3 and 2D/3D, as the manual specifies.",
  ],
};

const insert = (
  id: string,
  label: string,
  group: string,
  keywords: ReadonlyArray<string>,
  tokens: ReadonlyArray<InputToken>,
  shortcut?: string,
): CalculatorCommand => ({
  id,
  label,
  group,
  keywords,
  ...(shortcut === undefined ? {} : { shortcut }),
  action: { _tag: "insert", tokens },
});

const command = (
  id: string,
  label: string,
  group: string,
  keywords: ReadonlyArray<string>,
  action: CommandAction,
  shortcut?: string,
): CalculatorCommand => ({
  id,
  label,
  group,
  keywords,
  ...(shortcut === undefined ? {} : { shortcut }),
  action,
});

const modeCommands: ReadonlyArray<CalculatorCommand> = MODES.map((mode) =>
  command(
    `mode:${mode.mode}`,
    `Mode: ${mode.label}`,
    "Modes",
    [mode.mode.toLowerCase(), mode.summary, `mode ${mode.index}`],
    { _tag: "mode", mode: mode.mode },
    `⌘${mode.index}`,
  ),
);

const functionCommands: ReadonlyArray<CalculatorCommand> = [
  insert("fn:sin", "sin", "Functions", ["sine", "trigonometry"], [SIN]),
  insert(
    "fn:sin-inv",
    "sin⁻¹",
    "Functions",
    ["inverse sine", "arcsin"],
    [SIN_INV],
  ),
  insert("fn:cos", "cos", "Functions", ["cosine", "trigonometry"], [COS]),
  insert(
    "fn:cos-inv",
    "cos⁻¹",
    "Functions",
    ["inverse cosine", "arccos"],
    [COS_INV],
  ),
  insert("fn:tan", "tan", "Functions", ["tangent", "trigonometry"], [TAN]),
  insert(
    "fn:tan-inv",
    "tan⁻¹",
    "Functions",
    ["inverse tangent", "arctan"],
    [TAN_INV],
  ),
  insert("fn:sinh", "sinh", "Functions", ["hyperbolic sine"], [SINH]),
  insert("fn:cosh", "cosh", "Functions", ["hyperbolic cosine"], [COSH]),
  insert("fn:tanh", "tanh", "Functions", ["hyperbolic tangent"], [TANH]),
  insert(
    "fn:sinh-inv",
    "sinh⁻¹",
    "Functions",
    ["inverse hyperbolic sine"],
    [SINH_INV],
  ),
  insert(
    "fn:cosh-inv",
    "cosh⁻¹",
    "Functions",
    ["inverse hyperbolic cosine"],
    [COSH_INV],
  ),
  insert(
    "fn:tanh-inv",
    "tanh⁻¹",
    "Functions",
    ["inverse hyperbolic tangent"],
    [TANH_INV],
  ),
  insert("fn:log", "log", "Functions", ["logarithm", "base 10"], [LOG]),
  insert("fn:ln", "ln", "Functions", ["natural logarithm"], [LN]),
  insert("fn:sqrt", "√", "Functions", ["square root"], [SQRT]),
  insert("fn:cbrt", "∛", "Functions", ["cube root"], [CBRT]),
  insert("fn:nth-root", "ⁿ√", "Functions", ["nth root"], [NTH_ROOT]),
  insert("fn:abs", "Abs", "Functions", ["absolute value", "magnitude"], [ABS]),
  insert("fn:rnd", "Rnd", "Functions", ["round", "rounding"], [RND]),
  insert("fn:ran", "Ran#", "Functions", ["random number"], [RAN]),
  insert("fn:ranint", "RanInt", "Functions", ["random integer"], [RANINT]),
  insert(
    "fn:integral",
    "∫",
    "Functions",
    ["integral", "integrate", "area"],
    [INTEGRAL],
  ),
  insert(
    "fn:derivative",
    "d/dx",
    "Functions",
    ["derivative", "differentiate"],
    [DERIVATIVE],
  ),
  insert(
    "fn:sum",
    "Σ",
    "Functions",
    ["sum", "summation", "sigma"],
    [SUMMATION],
  ),
  insert("fn:pol", "Pol", "Functions", ["polar", "coordinates"], [POL]),
  insert("fn:rec", "Rec", "Functions", ["rectangular", "coordinates"], [REC]),
  insert("fn:conjg", "Conjg", "Functions", ["complex conjugate"], [CONJG]),
  insert("fn:arg", "arg", "Functions", ["complex argument", "angle"], [ARG]),
  insert("fn:re", "Re", "Functions", ["real part"], [REAL_PART]),
  insert("fn:im", "Im", "Functions", ["imaginary part"], [IMAGINARY_PART]),
  insert("fn:not", "Not", "BASE-N", ["bitwise complement"], [NOT]),
  insert("fn:neg", "Neg", "BASE-N", ["two's complement", "negate"], [NEG]),
  insert("fn:nPr", "nPr", "Functions", ["permutation", "permutations"], [N_PR]),
  insert(
    "fn:rad",
    "r — angle tag",
    "Functions",
    ["radian", "angle unit", "drg"],
    [RADIAN_TAG],
  ),
  insert(
    "fn:grad",
    "g — angle tag",
    "Functions",
    ["gradian", "grad", "angle unit", "drg"],
    [GRAD_TAG],
  ),
  insert(
    "fn:10x",
    "10ˣ",
    "Functions",
    ["power of ten", "exponential"],
    [digit("1"), digit("0"), operator("^")],
  ),
  insert(
    "fn:ex",
    "eˣ",
    "Functions",
    ["exponential", "e to the power"],
    [E, operator("^")],
  ),
  insert("fn:nCr", "nCr", "Functions", ["combination", "combinations"], [N_CR]),
  insert(
    "fn:a+bi",
    "▸a+bi — rectangular result",
    "CMPLX",
    ["complex", "rectangular", "format"],
    [FORMAT_RECT],
  ),
  insert(
    "fn:r-angle",
    "▸r∠θ — polar result",
    "CMPLX",
    ["complex", "polar", "format"],
    [FORMAT_POLAR],
  ),
];

const constantCommands: ReadonlyArray<CalculatorCommand> =
  scientificConstants.map((held) =>
    insert(
      `const:${held.index}`,
      `${held.symbol} — ${held.name}`,
      "Constants",
      [held.index, held.name, held.unit, "constant"],
      [namedConstant(held.index, held.symbol)],
    ),
  );

const conversionCommands: ReadonlyArray<CalculatorCommand> =
  metricConversions.map((held) =>
    insert(
      `conv:${held.index}`,
      `${held.from} → ${held.to}`,
      "Conversions",
      [held.index, held.from, held.to, "convert", "metric"],
      [conversion(held.index, `${held.from}→${held.to}`)],
    ),
  );

const baseCommands: ReadonlyArray<CalculatorCommand> = BASE_NAMES.map((base) =>
  command(
    `base:${base}`,
    base,
    "BASE-N",
    [base.toLowerCase(), "base", `${BASE_RADIX[base]}`],
    {
      _tag: "base",
      base,
    },
  ),
);

const setupCommands: ReadonlyArray<CalculatorCommand> = [
  ...(["MthIO-MathO", "MthIO-LineO", "LineIO"] as const).map((display) =>
    command(
      `setup:display:${display}`,
      `Display: ${display}`,
      "Setup",
      ["display", "natural", "linear"],
      {
        _tag: "setup",
        setup: { display },
      },
    ),
  ),
  ...(["Deg", "Rad", "Gra"] as const).map((angle) =>
    command(
      `setup:angle:${angle}`,
      `Angle: ${angle}`,
      "Setup",
      ["angle", "degrees", "radians", "grads"],
      {
        _tag: "setup",
        setup: { angle },
      },
    ),
  ),
  ...Array.from({ length: 10 }, (_, digits) =>
    command(
      `setup:fix:${digits}`,
      `Fix ${digits}`,
      "Setup",
      ["fix", "decimal places", `${digits}`],
      numberFormatAction("Fix", digits),
    ),
  ),
  ...Array.from({ length: 10 }, (_, digits) =>
    command(
      `setup:sci:${digits}`,
      `Sci ${digits}`,
      "Setup",
      ["sci", "significant digits", `${digits}`],
      numberFormatAction("Sci", digits),
    ),
  ),
  command("setup:norm:1", "Norm 1", "Setup", ["norm", "exponential"], {
    _tag: "setup",
    setup: { number: { kind: "Norm1", digits: 0 } },
  }),
  command("setup:norm:2", "Norm 2", "Setup", ["norm", "exponential"], {
    _tag: "setup",
    setup: { number: { kind: "Norm2", digits: 0 } },
  }),
  command(
    "setup:fraction:mixed",
    "Fractions: mixed",
    "Setup",
    ["fraction", "mixed"],
    {
      _tag: "setup",
      setup: { fraction: "mixed" },
    },
  ),
  command(
    "setup:fraction:improper",
    "Fractions: improper",
    "Setup",
    ["fraction", "improper", "d/c"],
    {
      _tag: "setup",
      setup: { fraction: "d/c" },
    },
  ),
  command(
    "setup:complex:rect",
    "Complex: a+bi",
    "Setup",
    ["complex", "rectangular"],
    {
      _tag: "setup",
      setup: { complexFormat: "a+bi" },
    },
  ),
  command(
    "setup:complex:polar",
    "Complex: r∠θ",
    "Setup",
    ["complex", "polar"],
    {
      _tag: "setup",
      setup: { complexFormat: "r∠θ" },
    },
  ),
  command(
    "setup:stat:on",
    "STAT frequency column on",
    "Setup",
    ["stat", "frequency"],
    {
      _tag: "setup",
      setup: { statFrequency: true },
    },
  ),
  command(
    "setup:stat:off",
    "STAT frequency column off",
    "Setup",
    ["stat", "frequency"],
    {
      _tag: "setup",
      setup: { statFrequency: false },
    },
  ),
  command(
    "setup:decimal:dot",
    "Decimal point: dot",
    "Setup",
    ["decimal", "dot"],
    {
      _tag: "setup",
      setup: { decimalPoint: "." },
    },
  ),
  command(
    "setup:decimal:comma",
    "Decimal point: comma",
    "Setup",
    ["decimal", "comma"],
    {
      _tag: "setup",
      setup: { decimalPoint: "," },
    },
  ),
];

const statCommands: ReadonlyArray<CalculatorCommand> = [
  ...STAT_KINDS.map((kind) =>
    command(
      `stat:type:${kind}`,
      `STAT type: ${kind}`,
      "STAT",
      ["statistics", kind.toLowerCase(), "regression"],
      {
        _tag: "stat-type",
        kind,
      },
    ),
  ),
  command(
    "stat:editor",
    "STAT editor",
    "STAT",
    ["statistics", "data", "editor"],
    {
      _tag: "stat-screen",
      screen: "editor",
    },
  ),
  command(
    "stat:calc",
    "STAT calculation screen",
    "STAT",
    ["statistics", "results"],
    {
      _tag: "stat-screen",
      screen: "calc",
    },
  ),
  ...(["sum", "var", "reg", "minmax", "distr"] as const).map((menu) =>
    command(`stat:menu:${menu}`, `STAT ${menu}`, "STAT", ["statistics", menu], {
      _tag: "stat-menu",
      command: menu,
    }),
  ),
  ...(
    [
      "Σx²",
      "Σx",
      "Σy²",
      "Σy",
      "Σxy",
      "Σx³",
      "Σx²y",
      "Σx⁴",
      "n",
      "x̄",
      "σx",
      "sx",
      "ȳ",
      "σy",
      "sy",
      "A",
      "B",
      "C",
      "r",
      "x̂",
      "ŷ",
      "x̂1",
      "x̂2",
      "minX",
      "maxX",
      "minY",
      "maxY",
      "t",
      "P()",
      "Q()",
      "R()",
    ] satisfies ReadonlyArray<StatReadingId>
  ).map((id) =>
    command(`stat:reading:${id}`, `STAT ${id}`, "STAT", ["statistics", id], {
      _tag: "stat-reading",
      id,
    }),
  ),
];

const equationCommands: ReadonlyArray<CalculatorCommand> = EQUATION_KINDS.map(
  (kind) =>
    command(`eqn:${kind}`, equationLabel(kind), "EQN", ["equation", kind], {
      _tag: "equation-type",
      kind,
    }),
);

const matrixCommands: ReadonlyArray<CalculatorCommand> = Arr.flatMap(
  ["A", "B", "C"] as const,
  (matrix) => [
    command(
      `matrix:edit:${matrix}`,
      `Edit Mat${matrix}`,
      "MATRIX",
      ["matrix", `mat${matrix}`, "edit"],
      {
        _tag: "matrix-edit",
        matrix,
      },
    ),
    ...Array.from({ length: 9 }, (_, index) => {
      const rows = Math.floor(index / 3) + 1;
      const columns = (index % 3) + 1;
      return command(
        `matrix:dim:${matrix}:${rows}x${columns}`,
        `Mat${matrix} ${rows}×${columns}`,
        "MATRIX",
        ["matrix", "dimension", `${rows}x${columns}`],
        { _tag: "matrix-dim", matrix, rows, columns },
      );
    }),
  ],
);

const vectorCommands: ReadonlyArray<CalculatorCommand> = Arr.flatMap(
  ["A", "B", "C"] as const,
  (vector) => [
    command(
      `vector:edit:${vector}`,
      `Edit Vct${vector}`,
      "VECTOR",
      ["vector", `vct${vector}`, "edit"],
      {
        _tag: "vector-edit",
        vector,
      },
    ),
    ...[2, 3].map((size) =>
      command(
        `vector:dim:${vector}:${size}`,
        `Vct${vector} ${size}D`,
        "VECTOR",
        ["vector", "dimension"],
        {
          _tag: "vector-dim",
          vector,
          size,
        },
      ),
    ),
  ],
);

const catalogue: ReadonlyArray<CalculatorCommand> = [
  ...modeCommands,
  ...functionCommands,
  ...constantCommands,
  ...conversionCommands,
  ...baseCommands,
  ...setupCommands,
  ...statCommands,
  ...equationCommands,
  ...matrixCommands,
  ...vectorCommands,
  insert(
    "memory:ans",
    "Ans — answer memory",
    "Memory",
    ["answer", "ans"],
    [variableToken("Ans")],
  ),
  insert(
    "memory:m",
    "M — independent memory",
    "Memory",
    ["memory", "independent"],
    [variableToken("M")],
  ),
  ...(["A", "B", "C", "D", "E", "F", "X", "Y"] as const).map((name) =>
    insert(
      `memory:${name}`,
      name,
      "Memory",
      ["variable", name.toLowerCase()],
      [variableToken(name)],
    ),
  ),
  insert(
    "matrix:matA",
    "MatA",
    "MATRIX",
    ["matrix", "mata"],
    [variableToken("MatA")],
  ),
  insert(
    "matrix:matB",
    "MatB",
    "MATRIX",
    ["matrix", "matb"],
    [variableToken("MatB")],
  ),
  insert(
    "matrix:matC",
    "MatC",
    "MATRIX",
    ["matrix", "matc"],
    [variableToken("MatC")],
  ),
  insert(
    "matrix:matans",
    "MatAns",
    "MATRIX",
    ["matrix", "answer"],
    [variableToken("MatAns")],
  ),
  insert(
    "matrix:det",
    "det(MatA)",
    "MATRIX",
    ["determinant", "det"],
    [DET, variableToken("MatA"), CLOSE],
  ),
  insert(
    "matrix:trn",
    "Trn(MatA)",
    "MATRIX",
    ["transpose", "trn"],
    [TRN, variableToken("MatA"), CLOSE],
  ),
  insert(
    "vector:vctA",
    "VctA",
    "VECTOR",
    ["vector", "vcta"],
    [variableToken("VctA")],
  ),
  insert(
    "vector:vctB",
    "VctB",
    "VECTOR",
    ["vector", "vctb"],
    [variableToken("VctB")],
  ),
  insert(
    "vector:vctC",
    "VctC",
    "VECTOR",
    ["vector", "vctc"],
    [variableToken("VctC")],
  ),
  insert(
    "vector:vctans",
    "VctAns",
    "VECTOR",
    ["vector", "answer"],
    [variableToken("VctAns")],
  ),
  insert(
    "op:dot",
    "Dot product •",
    "VECTOR",
    ["dot product", "vector"],
    [operator("•")],
  ),
  insert(
    "op:cross",
    "Cross product ×",
    "VECTOR",
    ["cross product", "vector"],
    [operator("×")],
  ),
  command(
    "table:run",
    "Generate table",
    "TABLE",
    ["table", "generate", "f(x)"],
    { _tag: "table-run" },
  ),
  command("table:reset", "Reset table", "TABLE", ["table", "clear"], {
    _tag: "table-reset",
  }),
  command(
    "calc:calc",
    "CALC",
    "Memory",
    ["calc", "substitute"],
    { _tag: "calc" },
    "⌘⏎",
  ),
  command(
    "calc:solve",
    "SOLVE",
    "Memory",
    ["solve", "newton", "root"],
    { _tag: "solve" },
    "⌘⇧⏎",
  ),
  command(
    "display:alternate",
    "S⇔D",
    "Display",
    ["fraction", "decimal", "toggle"],
    { _tag: "alternate" },
  ),
  command(
    "display:engineering",
    "Engineering notation",
    "Display",
    ["engineering", "exponent"],
    {
      _tag: "engineering",
      direction: 1,
    },
  ),
  command("clear:setup", "Clear setup", "Clear", ["reset", "setup"], {
    _tag: "clear",
    scope: "setup",
  }),
  command(
    "clear:memory",
    "Clear memory",
    "Clear",
    ["reset", "memory", "variables"],
    {
      _tag: "clear",
      scope: "memory",
    },
  ),
  command("clear:all", "Clear all", "Clear", ["reset", "initialize", "all"], {
    _tag: "clear",
    scope: "all",
  }),
  insert("base:and", "and", "BASE-N", ["logical and", "bitwise"], [AND]),
  insert("base:or", "or", "BASE-N", ["logical or", "bitwise"], [OR]),
  insert("base:xor", "xor", "BASE-N", ["logical xor", "bitwise"], [XOR]),
  insert("base:xnor", "xnor", "BASE-N", ["logical xnor", "bitwise"], [XNOR]),
  insert(
    "base:tag:d",
    "d — decimal value",
    "BASE-N",
    ["base tag", "decimal", "per-value"],
    [BASE_DEC],
  ),
  insert(
    "base:tag:h",
    "h — hexadecimal value",
    "BASE-N",
    ["base tag", "hexadecimal", "per-value"],
    [BASE_HEX],
  ),
  insert(
    "base:tag:b",
    "b — binary value",
    "BASE-N",
    ["base tag", "binary", "per-value"],
    [BASE_BIN],
  ),
  insert(
    "base:tag:o",
    "o — octal value",
    "BASE-N",
    ["base tag", "octal", "per-value"],
    [BASE_OCT],
  ),
];

const unique = (
  commands: ReadonlyArray<CalculatorCommand>,
): ReadonlyArray<CalculatorCommand> =>
  commands.filter(
    (held, index) =>
      commands.findIndex((candidate) => candidate.id === held.id) === index,
  );

export const fx991es: CalculatorModel = {
  id: "fx991es",
  label: "fx-991ES Plus",
  family: "Casio ClassWiz / Natural-V.P.A.M.",
  modes: MODES,
  keypad,
  capabilities,
  catalog: unique(catalogue),
};

export const MODE_ORDER: ReadonlyArray<Mode> = MODES.map((held) => held.mode);
