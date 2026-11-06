import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface SelectableRow {
  readonly value: string;
  readonly disabled: boolean;
}

export const toggle = (
  values: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  Arr.contains(value)(values)
    ? Arr.filter(values, (candidate) => candidate !== value)
    : Arr.append(values, value);

export const selectAll = (
  rows: ReadonlyArray<SelectableRow>,
): ReadonlyArray<string> =>
  pipe(
    rows,
    Arr.filter((row) => !row.disabled),
    Arr.map((row) => row.value),
  );

export const sameValues = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  Arr.length(left) === Arr.length(right) &&
  Arr.every(left, (value) => Arr.contains(value)(right));

const indexOfValue = (
  rows: ReadonlyArray<SelectableRow>,
  value: string,
): Option.Option<number> =>
  Arr.findFirstIndex(rows, (row) => row.value === value);

const enabledAt = (
  rows: ReadonlyArray<SelectableRow>,
  index: number,
): boolean =>
  pipe(
    Arr.get(rows, index),
    Option.exists((row) => !row.disabled),
  );

export const range = (
  rows: ReadonlyArray<SelectableRow>,
  anchor: string,
  target: string,
): ReadonlyArray<string> =>
  pipe(
    indexOfValue(rows, target),
    Option.filter((index) => enabledAt(rows, index)),
    Option.match({
      onNone: () => Arr.empty<string>(),
      onSome: (to) =>
        pipe(
          indexOfValue(rows, anchor),
          Option.filter((index) => enabledAt(rows, index)),
          Option.match({
            onNone: () => Arr.of(target),
            onSome: (from) =>
              pipe(
                rows,
                Arr.take(Math.max(from, to) + 1),
                Arr.drop(Math.min(from, to)),
                Arr.filter((row) => !row.disabled),
                Arr.map((row) => row.value),
              ),
          }),
        ),
    }),
  );
