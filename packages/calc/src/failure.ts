import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

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

export class CalculatorFailure extends Schema.TaggedError<CalculatorFailure>()(
  "CalculatorFailure",
  {
    kind: FailureKind,
    message: Schema.String,

    at: Schema.OptionFromOptionalKey(Schema.Number),
  },
) {}

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

export const isFailure = (value: unknown): value is CalculatorFailure =>
  value instanceof CalculatorFailure;
