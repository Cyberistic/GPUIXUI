/**
 * TABLE mode: `f(x)` over Start/End/Step, with the manual's 30-row ceiling.
 *
 * The function is evaluated by the same engine as COMP, so a table can contain
 * any expression COMP can (except the functions the manual excludes, which the
 * caller refuses before calling this module).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface TableRow {
  readonly x: number;
  readonly value: number;
}

export interface TableRequest {
  readonly start: number;
  readonly end: number;
  readonly step: number;
}

export const DEFAULT_TABLE: TableRequest = { start: 1, end: 5, step: 1 };

/** The x values the request would produce, or `None` when it exceeds 30. */
export const tableValues = (
  request: TableRequest,
): Option.Option<ReadonlyArray<number>> => {
  if (
    !Number.isFinite(request.start) ||
    !Number.isFinite(request.end) ||
    !Number.isFinite(request.step) ||
    request.step === 0 ||
    request.end < request.start
  ) {
    return Option.none();
  }
  const count =
    Math.floor((request.end - request.start) / request.step + 1e-9) + 1;
  if (count > 30) return Option.none();
  return Option.some(
    Arr.map(
      Arr.range(0, count - 1),
      (index) => request.start + index * request.step,
    ),
  );
};

/** Generate the rows by evaluating the supplied function at each x. */
export const buildTable = (
  request: TableRequest,
  evaluate: (x: number) => Option.Option<number>,
): Option.Option<ReadonlyArray<TableRow>> =>
  Option.flatMap(tableValues(request), (values) => {
    const rows = Arr.map(values, (x) => {
      const value = evaluate(x);
      return Option.map(value, (held) => ({ x, value: held }));
    });
    return Arr.every(rows, Option.isSome)
      ? Option.some(
          Arr.map(rows, (row) =>
            Option.getOrElse(row, () => ({ x: 0, value: Number.NaN })),
          ),
        )
      : Option.none();
  });
