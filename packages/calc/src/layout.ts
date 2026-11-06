import * as Option from "effect/Option";
import { fraction } from "mathjs";
import type { Fraction } from "mathjs";
import * as Arr from "effect/Array";
import { formatValue } from "./format.js";
import type { Setup } from "./setup.js";
import {
  agrees,
  isNegativeF,
  isZeroF,
  numberValue,
  type Symbolic,
} from "./symbolic.js";
import type { CalcValue, Real } from "./value.js";

export type MathNode =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "row";
      readonly items: ReadonlyArray<MathNode>;
      readonly align?: "end" | "center" | "baseline";
    }
  | {
      readonly kind: "fraction";
      readonly numerator: MathNode;
      readonly denominator: MathNode;
    }
  | {
      readonly kind: "radical";
      readonly radicand: MathNode;
      readonly coefficient?: MathNode;
    }
  | {
      readonly kind: "script";
      readonly base: MathNode;
      readonly script: MathNode;
      readonly position: "super" | "sub";
    }
  | { readonly kind: "caret" };

const text = (value: string): MathNode => ({ kind: "text", text: value });
const row = (
  items: ReadonlyArray<MathNode>,
  align: "end" | "center" | "baseline" = "end",
): MathNode => ({ kind: "row", items, align });

const absolute = (value: Fraction): Fraction =>
  isNegativeF(value) ? fraction(Number(value.n), Number(value.d)) : value;

const numeratorOf = (value: Fraction): number => Number(value.n);
const denominatorOf = (value: Fraction): number => Number(value.d);

const fractionNode = (value: Fraction, setup: Setup): MathNode => {
  const numerator = numeratorOf(value);
  const denominator = denominatorOf(value);
  if (denominator === 1) return text(String(numerator));
  if (setup.fraction === "mixed" && numerator > denominator) {
    const whole = Math.trunc(numerator / denominator);
    const remainder = numerator % denominator;
    if (remainder === 0) return text(String(whole));
    return row(
      [
        text(String(whole)),
        {
          kind: "fraction",
          numerator: text(String(remainder)),
          denominator: text(String(denominator)),
        },
      ],
      "baseline",
    );
  }
  return {
    kind: "fraction",
    numerator: text(String(numerator)),
    denominator: text(String(denominator)),
  };
};

const radicalNode = (radicand: number): MathNode => ({
  kind: "radical",
  radicand: text(String(radicand)),
});

const coefficientNode = (coefficient: Fraction, body: MathNode): MathNode => {
  const decimal = Math.abs(numberValue(coefficient));
  if (decimal === 1) return body;
  const positive = absolute(coefficient);
  const numerator = numeratorOf(positive);
  const denominator = denominatorOf(positive);
  if (denominator === 1) {
    return row([text(String(numerator)), body], "baseline");
  }
  return {
    kind: "fraction",
    numerator:
      numerator === 1 ? body : row([text(String(numerator)), body], "baseline"),
    denominator: text(String(denominator)),
  };
};

const symbolicTerms = (
  value: Symbolic,
  setup: Setup,
): ReadonlyArray<{ readonly negative: boolean; readonly node: MathNode }> => {
  const rationalTerm = isZeroF(value.rational)
    ? []
    : [
        {
          negative: isNegativeF(value.rational),
          node: fractionNode(absolute(value.rational), setup),
        },
      ];
  const piTerm = isZeroF(value.pi)
    ? []
    : [
        {
          negative: isNegativeF(value.pi),
          node: Option.getOrElse(
            Option.map(Option.some(absolute(value.pi)), (positive) => {
              const numerator = numeratorOf(positive);
              const denominator = denominatorOf(positive);
              if (denominator !== 1) {
                return {
                  kind: "fraction" as const,
                  numerator:
                    numerator === 1
                      ? text("π")
                      : row([text(String(numerator)), text("π")], "baseline"),
                  denominator: text(String(denominator)),
                };
              }
              return numerator === 1
                ? text("π")
                : row([text(String(numerator)), text("π")], "baseline");
            }),
            () => text("π"),
          ),
        },
      ];
  const radicalTerms = Arr.flatMap(value.radicals, (term) =>
    isZeroF(term.coefficient)
      ? []
      : [
          {
            negative: isNegativeF(term.coefficient),
            node: coefficientNode(
              absolute(term.coefficient),
              radicalNode(term.radicand),
            ),
          },
        ],
  );
  return [...rationalTerm, ...piTerm, ...radicalTerms];
};

export const layoutOf = (
  value: CalcValue,
  setup: Setup,
  symbolic: Option.Option<Symbolic>,
): Option.Option<MathNode> => {
  if (setup.display !== "MthIO-MathO") return Option.none();
  if (setup.number.kind === "Fix" || setup.number.kind === "Sci") {
    return Option.none();
  }
  if (value._tag !== "real") return Option.none();
  if (value.sexagesimal) return Option.none();
  return Option.flatMap(symbolic, (held) => {
    if (!agrees(held, value.value)) return Option.none();
    const terms = symbolicTerms(held, setup);
    if (terms.length === 0) return Option.some(text("0"));
    return Option.some(
      row(
        [
          ...(terms[0]?.negative === true ? [text("−")] : []),
          ...(terms[0] === undefined ? [] : [terms[0].node]),
          ...terms
            .slice(1)
            .flatMap((term) => [text(term.negative ? "−" : "+"), term.node]),
        ],
        "baseline",
      ),
    );
  });
};

export const fallbackText = (value: CalcValue, setup: Setup): string =>
  formatValue(value, setup).text;

export const layoutable = (value: Real): boolean => !value.sexagesimal;
