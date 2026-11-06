import * as Option from "effect/Option";

export const paintableSize = (
  size: number | undefined,
): Option.Option<number> =>
  Option.filter(
    Option.fromNullishOr(size),
    (value) => Number.isFinite(value) && value >= 0,
  );
