/**
 * The tab stop a group of controls shares.
 *
 * A radio, checkbox or toggle group is **one** stop in the window's tab order:
 * Tab reaches the group, the arrow keys move between its options, and Tab
 * leaves. The stop normally sits on the option that is already chosen, which is
 * what makes returning to the group land on the current value.
 *
 * A disabled option cannot be that stop — it takes no focus — so the stop has
 * to fall back to an option a user can actually reach. A group whose value is a
 * disabled option used to keep the stop there (the disabled row's `tabIndex`
 * was dropped, leaving the group with no stop at all).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/**
 * The index that holds a roving group's single tab stop.
 *
 * @param count how many options the group renders
 * @param preferred the index the group would like to stop on (the chosen one)
 * @param isDisabled whether an index cannot take focus
 */
export const rovingIndex = (
  count: number,
  preferred: Option.Option<number>,
  isDisabled: (index: number) => boolean,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const usable = (index: number): boolean =>
    index >= 0 && index < count && !isDisabled(index);
  return Option.match(Option.filter(preferred, usable), {
    onSome: Option.some,
    onNone: () => Arr.findFirst(Arr.range(0, count - 1), usable),
  });
};
