/**
 * The pure rules behind a multiple selection. They live apart from `List` for
 * the same reason `internal/collection.ts` does: the arithmetic is where the
 * bugs are, and a suite can drive it without a renderer.
 *
 * A selection is an ordered, duplicate-free list of row values. Order is the
 * order values were added, which is what a multiple listbox reports and what
 * lets `sameValues` ignore the order of a consumer-supplied value.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A row the selection rules can see: its value and whether it accepts input. */
export interface SelectableRow {
  readonly value: string;
  readonly disabled: boolean;
}

/** Add `value` when absent, remove it when present; first-added order is kept. */
export const toggle = (
  values: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  Arr.contains(value)(values)
    ? Arr.filter(values, (candidate) => candidate !== value)
    : Arr.append(values, value);

/** Every enabled row's value, in declaration order. Disabled rows never enter. */
export const selectAll = (
  rows: ReadonlyArray<SelectableRow>,
): ReadonlyArray<string> =>
  pipe(
    rows,
    Arr.filter((row) => !row.disabled),
    Arr.map((row) => row.value),
  );

/** The same members, ignoring order. */
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

/** Whether the row at `index` exists and accepts input. */
const enabledAt = (
  rows: ReadonlyArray<SelectableRow>,
  index: number,
): boolean =>
  pipe(
    Arr.get(rows, index),
    Option.exists((row) => !row.disabled),
  );

/**
 * Every enabled value between `anchor` and `target` inclusive, in row order.
 * `[target]` when the anchor is absent or disabled; `[]` when the target is not
 * a selectable row, so a disabled value can never enter a selection.
 */
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
