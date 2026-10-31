/**
 * Calculator failures are data.
 *
 * A calculator's expected failures are part of its display: `Math ERROR` is a
 * result the reader acts on, not an exception. Every failure the fx-991ES
 * manual documents has a kind and the manual's wording, so the UI can show the
 * same message the device shows and a test can assert on it.
 */

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The error messages the fx-991ES Plus manual documents. */
export const FailureKind = Schema.Literals([
  "Math",
  "Stack",
  "Syntax",
  "Argument",
  "Dimension",
  "Variable",
  "Can't Solve",
  "Insufficient MEM",
  "Time Out",
]);

export type FailureKind = typeof FailureKind.Type;

const MESSAGES: Readonly<Record<FailureKind, string>> = {
  Math: "Math ERROR",
  Stack: "Stack ERROR",
  Syntax: "Syntax ERROR",
  Argument: "Argument ERROR",
  Dimension: "Dimension ERROR",
  Variable: "Variable ERROR",
  "Can't Solve": "Can't Solve",
  "Insufficient MEM": "Insufficient MEM",
  "Time Out": "Time Out",
};

/** One expected calculator failure, with the manual's message. */
export class CalculatorFailure extends Schema.TaggedError<CalculatorFailure>()(
  "CalculatorFailure",
  {
    kind: FailureKind,
    message: Schema.String,
    /** The token position the error points at, when the parser knows it. */
    at: Schema.OptionFromOptionalKey(Schema.Number),
  },
) {}

/** A failure with the manual's wording, optionally overridden. */
export const failure = (
  kind: FailureKind,
  message: string = MESSAGES[kind],
  at?: number,
): CalculatorFailure =>
  new CalculatorFailure({
    kind,
    message,
    at: at === undefined ? Option.none() : Option.some(at),
  });

export const messageOf = (kind: FailureKind): string => MESSAGES[kind];

/** Whether a value produced by an operation is an expected failure. */
export const isFailure = (value: unknown): value is CalculatorFailure =>
  value instanceof CalculatorFailure;
