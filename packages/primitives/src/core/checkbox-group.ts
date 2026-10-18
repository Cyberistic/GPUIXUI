/**
 * The selection rules behind `CheckboxGroup`.
 *
 * A group is one **set** over an ordered list of options, plus the tri-state a
 * "select all" row derives from it. Both are ordinary bugs when hand-written:
 * the parent must ignore options the user cannot toggle, and clearing it must
 * not silently drop a disabled option's value.
 *
 * A change that produces the same membership returns the current array **by
 * identity**, so the shared `useControlState` does not call `onValueChange` and wake
 * the parent for an interaction that changed nothing.
 */

import * as Arr from "effect/Array";
import type { SelectionState } from "./selection.js";

/** One option in a checkbox group. Options are data, like `RadioGroup`'s. */
export interface CheckboxGroupOption {
  readonly value: string;
  readonly label: string;
  /**
   * Visible supporting text, also published as the row's `aria-description`.
   * A blank description is absent.
   */
  readonly description?: string;
  readonly disabled?: boolean;
}

/** Whether `value` is in the current selection. */
export const isGroupSelected = (
  values: ReadonlyArray<string>,
  value: string,
): boolean => Arr.contains(values, value);

/** The selection a press on `value` produces: append, or remove exactly it. */
export const toggleGroupValue = (
  values: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  Arr.contains(values, value)
    ? Arr.filter(values, (selected) => selected !== value)
    : Arr.append(values, value);

/**
 * The option values a user can actually toggle, in option order.
 *
 * Disabled options are excluded: a value the pointer and keyboard cannot change
 * must not make the parent look partially selected, and select-all must not
 * clear it.
 */
export const enabledValues = (
  options: ReadonlyArray<CheckboxGroupOption>,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(options, (option) => option.disabled !== true),
    (option) => option.value,
  );

/**
 * What a select-all row announces for the current selection.
 *
 * `checked` only when every enabled option is selected, `unchecked` when none
 * is, `indeterminate` otherwise. A group with no enabled option is `unchecked`
 * — there is nothing to select.
 */
export const groupParentState = (
  values: ReadonlyArray<string>,
  options: ReadonlyArray<CheckboxGroupOption>,
): SelectionState => {
  const enabled = enabledValues(options);
  if (Arr.isReadonlyArrayEmpty(enabled)) return "unchecked";
  const selected = Arr.filter(enabled, (value) => Arr.contains(values, value));
  if (Arr.isReadonlyArrayEmpty(selected)) return "unchecked";
  return Arr.length(selected) === Arr.length(enabled)
    ? "checked"
    : "indeterminate";
};

/**
 * The selection a select-all press produces.
 *
 * Selecting appends every missing enabled value in option order; clearing
 * removes the enabled values only. A selected disabled option survives both
 * directions, because the user never had a way to choose it here.
 */
export const toggleGroupAll = (
  values: ReadonlyArray<string>,
  options: ReadonlyArray<CheckboxGroupOption>,
): ReadonlyArray<string> => {
  const enabled = enabledValues(options);
  if (Arr.isReadonlyArrayEmpty(enabled)) return values;
  if (Arr.every(enabled, (value) => Arr.contains(values, value)))
    return Arr.filter(values, (value) => !Arr.contains(enabled, value));
  const missing = Arr.filter(enabled, (value) => !Arr.contains(values, value));
  return Arr.isReadonlyArrayEmpty(missing)
    ? values
    : Arr.appendAll(values, missing);
};
