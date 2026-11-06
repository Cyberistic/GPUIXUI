import * as Option from "effect/Option";

export interface CountOptions {
  readonly decimals?: number;

  readonly format?: (value: number) => string;
}

const MAX_DECIMALS = 20;

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

const decimals = (value: Option.Option<number>): number =>
  Option.match(
    Option.filter(value, (digits) => Number.isFinite(digits) && digits >= 0),
    {
      onNone: () => 0,
      onSome: (digits) => Math.min(MAX_DECIMALS, Math.round(digits)),
    },
  );

export const countedText = (
  value: number,
  options: CountOptions = {},
): string =>
  Option.match(Option.fromNullishOr(options.format), {
    onNone: () =>
      finite(value).toFixed(decimals(Option.fromNullishOr(options.decimals))),
    onSome: (format) => format(finite(value)),
  });

export const countDuration = (
  value: Option.Option<number>,
  fallback: number,
): number =>
  Option.match(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    {
      onNone: () => fallback,
      onSome: (ms) => Math.round(ms),
    },
  );
