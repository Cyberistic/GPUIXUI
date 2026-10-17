/**
 * The selection rules behind `ToggleGroup`.
 *
 * A toggle group is one pressed **set** over an ordered list of options. The
 * two public modes differ in one rule only: `single` replaces the set with the
 * pressed value, `multiple` adds or removes it. Keeping that here — instead of
 * inside the renderer — is what makes the rule provable without a runtime and
 * keeps the single and multiple paths from drifting.
 *
 * A press that changes nothing returns `current` **by identity**, so the shared
 * `useControlState` does not call `onChange` and wake the parent. A segmented
 * control re-pressing its active item is the common case.
 */

import * as Arr from "effect/Array";

export const TOGGLE_GROUP_TYPES = ["single", "multiple"] as const;

export type ToggleGroupType = (typeof TOGGLE_GROUP_TYPES)[number];

/** One item in a toggle group. Options are data, like `RadioGroup`'s. */
export interface ToggleGroupOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** Whether `value` is pressed in the current selection. */
export const isPressed = (
  current: ReadonlyArray<string>,
  value: string,
): boolean => Arr.contains(current, value);

/** The selection a press on `value` produces. */
export const nextSelection = (
  type: ToggleGroupType,
  current: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  if (type === "single")
    return Arr.contains(current, value) ? current : [value];
  return Arr.contains(current, value)
    ? Arr.filter(current, (pressed) => pressed !== value)
    : Arr.append(current, value);
};
