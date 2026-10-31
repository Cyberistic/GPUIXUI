/**
 * Display formatting: what the LCD paints, not what the engine computes.
 *
 * The fx-991ES stores 15 digits and shows 10; it can show an exact fraction,
 * `π` form or `√` form beside a decimal. This module owns those decisions, the
 * Norm/Fix/Sci rules, the sexagesimal form, BASE-N widths and the S⇔D alternate
 * — all from the setup, never from scattered options.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Fraction } from "mathjs";
import type { Setup } from "./setup.js";
import type {
  BaseValue,
  CalcValue,
  ListValue,
  MatrixValue,
  Real,
  Scalar,
  VectorValue,
} from "./value.js";
import { isReal } from "./value.js";

export interface FormattedValue {
  /** The primary display line. */
  readonly text: string;
  /** Grid rows for a matrix or vector; one row for a scalar. */
  readonly rows: ReadonlyArray<string>;
  /** The other form the S⇔D key would show, when there is one. */
  readonly alternate: Option.Option<string>;
}

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

const superscript = (value: number): string =>
  Arr.join(
    Arr.map(String(value).split(""), (char) => SUPERSCRIPT[char] ?? char),
    "",
  );

const decimalPointOf = (text: string, setup: Setup): string =>
  setup.decimalPoint === "," ? text.replace(".", ",") : text;

const trimZeros = (text: string): string => {
  const [mantissa = "", exponent] = text.split("e");
  const trimmed = mantissa.includes(".")
    ? mantissa.replace(/0+$/, "").replace(/\.$/, "")
    : mantissa;
  return exponent === undefined ? trimmed : `${trimmed}e${exponent}`;
};

const scientific = (value: number, significant: number): string => {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  const digits = Math.max(0, significant - 1);
  return `${trimZeros(mantissa.toFixed(digits))}×10${superscript(exponent)}`;
};

/** The decimal reading under the current number format. */
export const formatDecimal = (value: number, setup: Setup): string => {
  if (!Number.isFinite(value)) return "Math ERROR";
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  const format = setup.number;
  if (format.kind === "Fix") {
    return decimalPointOf(value.toFixed(format.digits), setup);
  }
  if (format.kind === "Sci") {
    const significant = format.digits === 0 ? 10 : format.digits;
    return decimalPointOf(scientific(value, significant), setup);
  }
  const lower = format.kind === "Norm1" ? 1e-2 : 1e-9;
  if (magnitude < lower || magnitude >= 1e10) {
    return decimalPointOf(scientific(value, 10), setup);
  }
  return decimalPointOf(trimZeros(value.toPrecision(10)), setup);
};

const fractionText = (
  fraction: Fraction,
  setup: Setup,
): Option.Option<string> => {
  const numerator = Number(fraction.s) * Number(fraction.n);
  const denominator = Number(fraction.d);
  if (denominator === 1) return Option.none();
  const whole = Math.trunc(Math.abs(numerator) / denominator);
  const remainder = Math.abs(numerator) % denominator;
  const sign = numerator < 0 ? "-" : "";
  const digits =
    String(Math.abs(numerator)).length +
    String(denominator).length +
    (setup.fraction === "mixed" ? String(whole).length : 0);
  if (digits > 10) return Option.none();
  if (setup.fraction === "mixed" && whole > 0) {
    return Option.some(`${sign}${whole}⌐${remainder}/${denominator}`);
  }
  return Option.some(`${sign}${Math.abs(numerator)}/${denominator}`);
};

const rationalNear = (
  value: number,
  maxDenominator: number,
  tolerance: number,
): Option.Option<{
  readonly numerator: number;
  readonly denominator: number;
}> => {
  const candidates = Arr.filter(
    Arr.range(1, maxDenominator),
    (denominator) =>
      Math.abs(value * denominator - Math.round(value * denominator)) <
      tolerance,
  );
  return Option.match(Arr.head(candidates), {
    onNone: () => Option.none(),
    onSome: (denominator) =>
      Option.some({
        numerator: Math.round(value * denominator),
        denominator,
      }),
  });
};

const piForm = (value: number): Option.Option<string> => {
  if (Math.abs(value) >= 1e6) return Option.none();
  return Option.map(rationalNear(value / Math.PI, 12, 1e-9), (ratio) => {
    const { numerator, denominator } = ratio;
    if (numerator === 0) return "0";
    const absolute = Math.abs(numerator);
    const sign = numerator < 0 ? "-" : "";
    const top = absolute === 1 ? "π" : `${absolute}π`;
    return denominator === 1 ? `${sign}${top}` : `${sign}${top}/${denominator}`;
  });
};

const squareFree = (value: number): boolean =>
  !Arr.some(
    Arr.range(2, Math.floor(Math.sqrt(value))),
    (factor) => value % (factor * factor) === 0,
  );

const radicalForm = (value: number): Option.Option<string> => {
  if (value === 0 || Math.abs(value) >= 1e6) return Option.none();
  const candidates = Arr.filter(Arr.range(2, 999), squareFree);
  return Option.flatMap(
    Arr.findFirst(candidates, (radicand) => {
      const coefficient = value / Math.sqrt(radicand);
      const rounded = Math.round(coefficient * 1000) / 1000;
      return (
        Math.abs(coefficient - rounded) < 1e-9 &&
        Math.abs(rounded) < 100 &&
        Math.abs(rounded) >= 0.001
      );
    }),
    (radicand) => {
      const coefficient = value / Math.sqrt(radicand);
      const ratio = rationalNear(coefficient, 100, 1e-8);
      return Option.map(ratio, (held) => {
        const sign = held.numerator < 0 ? "-" : "";
        const absolute = Math.abs(held.numerator);
        const top = absolute === 1 ? `√${radicand}` : `${absolute}√${radicand}`;
        return held.denominator === 1
          ? `${sign}${top}`
          : `${sign}${top}/${held.denominator}`;
      });
    },
  );
};

const sexagesimalText = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesTotal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesTotal);
  const seconds = Math.round((minutesTotal - minutes) * 60 * 100) / 100;
  return `${sign}${degrees}°${minutes}′${seconds}″`;
};

const complexText = (
  value: { readonly re: number; readonly im: number },
  setup: Setup,
): { readonly primary: string; readonly alternate: Option.Option<string> } => {
  if (setup.complexFormat === "r∠θ") {
    const radius = Math.hypot(value.re, value.im);
    const radians = Math.atan2(value.im, value.re);
    const angle =
      setup.angle === "Deg"
        ? (radians * 180) / Math.PI
        : setup.angle === "Gra"
          ? (radians * 200) / Math.PI
          : radians;
    return {
      primary: `${formatDecimal(radius, setup)}∠${formatDecimal(angle, setup)}`,
      alternate: Option.none(),
    };
  }
  const imaginary = formatDecimal(Math.abs(value.im), setup);
  const sign = value.im < 0 ? "-" : "+";
  return {
    primary: `${formatDecimal(value.re, setup)}${sign}${imaginary}i`,
    alternate: Option.none(),
  };
};

const baseText = (value: BaseValue): string => {
  const radix =
    value.base === 16
      ? "HEX"
      : value.base === 2
        ? "BIN"
        : value.base === 8
          ? "OCT"
          : "DEC";
  if (radix === "DEC") return String(value.value);
  const bits = radix === "BIN" ? 16 : 32;
  const mask = bits === 16 ? 0xffff : 0xffffffff;
  const held = value.value < 0 ? value.value & mask : value.value;
  if (radix === "HEX") {
    return (held >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }
  if (radix === "OCT") {
    return (held >>> 0).toString(8).padStart(11, "0");
  }
  return (held >>> 0).toString(2).padStart(16, "0");
};

const realFormat = (
  value: Real,
  setup: Setup,
): { readonly primary: string; readonly alternate: Option.Option<string> } => {
  if (value.sexagesimal) {
    return {
      primary: sexagesimalText(value.value),
      alternate: Option.some(formatDecimal(value.value, setup)),
    };
  }
  const decimal = formatDecimal(value.value, setup);
  if (setup.number.kind === "Fix" || setup.number.kind === "Sci") {
    return { primary: decimal, alternate: Option.none() };
  }
  const exact = Option.flatMap(value.exact, (fraction) =>
    fractionText(fraction, setup),
  );
  if (setup.display === "LineIO") {
    return { primary: decimal, alternate: exact };
  }
  const pi = piForm(value.value);
  const radical = radicalForm(value.value);
  const primary = Option.match(pi, {
    onNone: () =>
      Option.getOrElse(radical, () => Option.getOrElse(exact, () => decimal)),
    onSome: (text) => text,
  });
  const alternate =
    primary === decimal
      ? Option.orElse(exact, () => Option.orElse(pi, () => radical))
      : Option.some(decimal);
  return { primary, alternate };
};

/** Engineering notation: the exponent is a multiple of three. */
export const formatEngineering = (value: number, setup: Setup): string => {
  if (value === 0 || !Number.isFinite(value))
    return formatDecimal(value, setup);
  const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
  const mantissa = value / 10 ** exponent;
  return decimalPointOf(
    `${trimZeros(mantissa.toPrecision(10))}×10${superscript(exponent)}`,
    setup,
  );
};

/** Format one value for the display. */
export const formatValue = (value: CalcValue, setup: Setup): FormattedValue => {
  if (value._tag === "real") {
    const formatted = realFormat(value, setup);
    return {
      text: formatted.primary,
      rows: [formatted.primary],
      alternate: formatted.alternate,
    };
  }
  if (value._tag === "complex") {
    const formatted = complexText(value, setup);
    return {
      text: formatted.primary,
      rows: [formatted.primary],
      alternate: formatted.alternate,
    };
  }
  if (value._tag === "matrix") {
    return matrixDisplay(value, setup);
  }
  if (value._tag === "vector") {
    return vectorDisplay(value, setup);
  }
  if (value._tag === "base") {
    const text = baseText(value);
    return { text, rows: [text], alternate: Option.none() };
  }
  return listDisplay(value, setup);
};

const matrixDisplay = (value: MatrixValue, setup: Setup): FormattedValue => {
  const rows = Arr.map(
    value.rows,
    (row) =>
      `[ ${Arr.join(
        Arr.map(row, (item) => formatDecimal(item, setup)),
        "  ",
      )} ]`,
  );
  return {
    text: `[${value.rows.length}×${value.rows[0]?.length ?? 0}]`,
    rows,
    alternate: Option.none(),
  };
};

const vectorDisplay = (value: VectorValue, setup: Setup): FormattedValue => {
  const text = `(${Arr.join(
    Arr.map(value.items, (item) => formatDecimal(item, setup)),
    ", ",
  )})`;
  return { text, rows: [text], alternate: Option.none() };
};

const listDisplay = (value: ListValue, setup: Setup): FormattedValue => {
  const rows = Arr.map(
    value.items,
    (item) => `${item.label}=${scalarText(item.value, setup)}`,
  );
  return {
    text: rows[0] ?? value.title,
    rows,
    alternate: Option.none(),
  };
};

const scalarText = (value: Scalar, setup: Setup): string =>
  isReal(value)
    ? realFormat(value, setup).primary
    : complexText(value, setup).primary;
