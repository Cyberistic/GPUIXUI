import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const slidingNumberDecimalsCap = 6;

export const digitCells: ReadonlyArray<number> = Arr.range(0, 9);

const PLAIN = /^(-?)(\d+)(?:\.(\d+))?$/;

export interface NumberCell {
  readonly key: string;

  readonly digit: Option.Option<number>;
}

export interface NumberLayout {
  readonly negative: boolean;

  readonly cells: ReadonlyArray<NumberCell>;

  readonly text: string;
}

export interface NumberFormat {
  readonly decimals?: number;

  readonly prefix?: string;

  readonly suffix?: string;
}

export const decimalsOf = (decimals: number | undefined): number =>
  Option.fromNullishOr(decimals).pipe(
    Option.filter(Number.isFinite),
    Option.map((places) =>
      Math.min(slidingNumberDecimalsCap, Math.max(0, Math.floor(places))),
    ),
    Option.getOrElse(() => 0),
  );

const placeCells = (
  part: string,
  placeOf: (index: number, length: number) => number,
  keyPrefix: "i" | "f",
): ReadonlyArray<NumberCell> =>
  Arr.map(Str.split("")(part), (digit, index) => ({
    key: `${keyPrefix}${placeOf(index, Str.length(part))}`,
    digit: Option.some(Number(digit)),
  }));

const pointCell: NumberCell = { key: "point", digit: Option.none() };

export const numberLayout = (
  value: number,
  format: NumberFormat = {},
): NumberLayout => {
  const decimals = decimalsOf(format.decimals);
  const prefix = format.prefix ?? "";
  const suffix = format.suffix ?? "";
  const fixed = Number.isFinite(value) ? value.toFixed(decimals) : "";
  return Option.match(Option.fromNullishOr(PLAIN.exec(fixed)), {
    onNone: () => ({
      negative: false,
      cells: [],
      text: `${prefix}${String(value)}${suffix}`,
    }),
    onSome: (match) => {
      const sign = match[1] ?? "";
      const integers = match[2] ?? "";
      const fraction = match[3];
      const digits = `${integers}${fraction ?? ""}`;
      const cells = [
        ...placeCells(integers, (index, length) => length - 1 - index, "i"),
        ...Option.match(Option.fromNullishOr(fraction), {
          onNone: () => [],
          onSome: (places) => [
            pointCell,
            ...placeCells(places, (index) => index + 1, "f"),
          ],
        }),
      ];

      const negative =
        sign === "-" &&
        Arr.some(Str.split("")(digits), (digit) => digit !== "0");
      return {
        negative,
        cells,
        text: `${negative ? "-" : ""}${prefix}${integers}${fraction === undefined ? "" : `.${fraction}`}${suffix}`,
      };
    },
  });
};

export const columnTop = (digit: number, lineHeight: number): number => {
  if (!Number.isFinite(lineHeight)) return 0;
  const offset = -digit * lineHeight;
  return offset === 0 ? 0 : offset;
};
