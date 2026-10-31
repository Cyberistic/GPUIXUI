/**
 * The input line as atomic tokens.
 *
 * A fx-991ES cursor sits between *functions*, not characters: DEL after `sin(`
 * removes the function, and replay restores exactly what was entered. Storing
 * the entry as tokens (each with its painted text) gives that behaviour without
 * a second representation. `inputText` is the only place the entry becomes a
 * string, and it is used for display and history only — never re-parsed.
 */

import * as Arr from "effect/Array";
import * as Str from "effect/String";

export type TokenKind =
  | "digit"
  | "operator"
  | "function"
  | "constant"
  | "variable"
  | "postfix"
  | "command"
  | "format"
  | "base"
  | "paren"
  | "separator";

/** One atomic piece of the entry line. */
export interface InputToken {
  readonly id: string;
  readonly text: string;
  readonly kind: TokenKind;
}

const make =
  (kind: TokenKind) =>
  (id: string, text: string = id): InputToken => ({ id, text, kind });

export const digit = make("digit");
export const operator = make("operator");
export const fn = make("function");
export const constant = make("constant");
export const variable = make("variable");
export const postfix = make("postfix");
export const command = make("command");
export const format = make("format");
export const baseTag = make("base");

export const PERIOD = digit(".", ".");
export const COMMA = operator(",", ",");
export const COLON = operator(":", ":");
export const OPEN = operator("(", "(");
export const CLOSE = operator(")", ")");
export const EQUALS = operator("=", "=");
export const EXP10 = command("×10^", "×10^");

export const DIGITS: ReadonlyArray<InputToken> = Arr.map(
  Arr.range(0, 9),
  (value) => digit(String(value)),
);

/** `A`–`F` as digits, for BASE-N input; they are numbers, not variables. */
export const hexDigit = (letter: string): InputToken =>
  ({ id: `hex:${letter}`, text: letter, kind: "digit" }) as const;

export const HEX_DIGITS: ReadonlyArray<InputToken> = Arr.map(
  ["A", "B", "C", "D", "E", "F"],
  hexDigit,
);

/** A function token paints its opening parenthesis as part of its name. */
export const call = (id: string, label: string = id): InputToken =>
  fn(id, `${label}(`);

/** A named scientific constant, inserted by the CONST browser. */
export const namedConstant = (index: string, symbol: string): InputToken =>
  constant(`const:${index}`, symbol);

/** A metric conversion command, applied to the value before it. */
export const conversion = (index: string, label: string): InputToken =>
  postfix(`conv:${index}`, label);

/** The catalog's function tokens, shared by the keypad and the palette. */
export const SIN = call("sin");
export const SIN_INV = call("sin⁻¹", "sin⁻¹");
export const COS = call("cos");
export const COS_INV = call("cos⁻¹", "cos⁻¹");
export const TAN = call("tan");
export const TAN_INV = call("tan⁻¹", "tan⁻¹");
export const SINH = call("sinh");
export const COSH = call("cosh");
export const TANH = call("tanh");
export const SINH_INV = call("sinh⁻¹", "sinh⁻¹");
export const COSH_INV = call("cosh⁻¹", "cosh⁻¹");
export const TANH_INV = call("tanh⁻¹", "tanh⁻¹");
export const LOG = call("log");
export const LN = call("ln");
export const SQRT = call("√", "√");
export const CBRT = call("∛", "∛");
export const NTH_ROOT = call("ⁿ√", "ⁿ√");
export const ABS = call("Abs");
export const RND = call("Rnd");
export const RANINT = call("RanInt");
export const INTEGRAL = call("∫", "∫");
export const DERIVATIVE = call("d/dx", "d/dx");
export const SUMMATION = call("Σ", "Σ");
export const POL = call("Pol");
export const REC = call("Rec");
export const CONJG = call("Conjg");
export const ARG = call("arg");
export const REAL_PART = call("Re");
export const IMAGINARY_PART = call("Im");
export const NOT = call("Not");
export const NEG = call("Neg");
export const DET = call("det");
export const TRN = call("Trn");

export const PI = constant("π");
export const E = constant("e");
export const IMAGINARY = constant("i");
export const ANS = constant("Ans");
export const MEMORY = constant("M");
export const RAN = command("Ran#", "Ran#");
export const N_PR = command("nPr", "nPr");
export const N_CR = command("nCr", "nCr");
export const AND = command("and", "and");
export const OR = command("or", "or");
export const XOR = command("xor", "xor");
export const XNOR = command("xnor", "xnor");
export const DOT = command("•", "•");
export const POLAR = command("∠", "∠");

export const SQUARE = postfix("x²", "²");
export const CUBE = postfix("x³", "³");
export const RECIPROCAL = postfix("x⁻¹", "⁻¹");
export const FACTORIAL = postfix("!", "!");
export const PERCENT = postfix("%", "%");
export const DEGREE = postfix("°", "°");
export const MINUTE = postfix("′", "′");
export const SECOND = postfix("″", "″");
export const RADIAN_TAG = postfix("rad", "r");
export const GRAD_TAG = postfix("grad", "g");

export const BASE_DEC = baseTag("base:d", "d");
export const BASE_HEX = baseTag("base:h", "h");
export const BASE_BIN = baseTag("base:b", "b");
export const BASE_OCT = baseTag("base:o", "o");

export const FORMAT_RECT = format("fmt:rect", "▸a+bi");
export const FORMAT_POLAR = format("fmt:polar", "▸r∠θ");

/** A variable token for `A`…`F`, `X`, `Y` and `M`. */
export const variableToken = (name: string): InputToken => variable(name, name);

/** The stable token ids the parser understands, for model definitions. */
export const tokenIds = new Set<string>([
  ...Arr.map(DIGITS, (held) => held.id),
  ".",
  "+",
  "-",
  "×",
  "÷",
  "^",
  "(",
  ")",
  ",",
  ":",
  "=",
  "•",
  "∠",
  "!",
  "%",
  "°",
  "′",
  "″",
  "rad",
  "grad",
  "nPr",
  "nCr",
  "and",
  "or",
  "xor",
  "xnor",
  "×10^",
  "Ran#",
  "fmt:rect",
  "fmt:polar",
  "base:d",
  "base:h",
  "base:b",
  "base:o",
]);

/** Insert one token at the cursor; the cursor lands after it. */
export const insertToken = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
  held: InputToken,
): { readonly tokens: ReadonlyArray<InputToken>; readonly cursor: number } => ({
  tokens: Arr.appendAll(
    Arr.appendAll(Arr.take(tokens, cursor), [held]),
    Arr.drop(tokens, cursor),
  ),
  cursor: cursor + 1,
});

/** Insert several tokens at the cursor; the cursor lands after the last. */
export const insertTokens = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
  held: ReadonlyArray<InputToken>,
): { readonly tokens: ReadonlyArray<InputToken>; readonly cursor: number } => ({
  tokens: Arr.appendAll(
    Arr.appendAll(Arr.take(tokens, cursor), held),
    Arr.drop(tokens, cursor),
  ),
  cursor: cursor + held.length,
});

/** Delete the token left of the cursor. */
export const deleteBackward = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
): { readonly tokens: ReadonlyArray<InputToken>; readonly cursor: number } =>
  cursor <= 0
    ? { tokens, cursor }
    : {
        tokens: Arr.appendAll(
          Arr.take(tokens, cursor - 1),
          Arr.drop(tokens, cursor),
        ),
        cursor: cursor - 1,
      };

/** Delete the token under the cursor (the `DEL` right-arrow mode). */
export const deleteForward = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
): { readonly tokens: ReadonlyArray<InputToken>; readonly cursor: number } =>
  cursor >= tokens.length
    ? { tokens, cursor }
    : {
        tokens: Arr.appendAll(
          Arr.take(tokens, cursor),
          Arr.drop(tokens, cursor + 1),
        ),
        cursor,
      };

/** The painted entry line. */
export const inputText = (tokens: ReadonlyArray<InputToken>): string =>
  Arr.join(
    Arr.map(tokens, (held) => held.text),
    "",
  );

/** The entry with a caret painted at the cursor, for the LCD. */
export const inputTextWithCaret = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
): string => {
  const before = inputText(Arr.take(tokens, cursor));
  const after = inputText(Arr.drop(tokens, cursor));
  return Str.isEmpty(before) && Str.isEmpty(after) ? "▏" : `${before}▏${after}`;
};

/** Tokens that begin a primary expression; implicit multiplication sees these. */
export const startsOperand = (held: InputToken): boolean =>
  held.kind === "digit" ||
  held.kind === "constant" ||
  held.kind === "variable" ||
  held.kind === "function" ||
  held.id === "(" ||
  held.id === "Ran#";

/** The text a history row paints for a token list. */
export const historyLabel = (tokens: ReadonlyArray<InputToken>): string =>
  inputText(tokens);
