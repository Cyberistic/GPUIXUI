/**
 * Which phrase a rotation shows next.
 *
 * A rotation is an index, not a queue: the list may be replaced while it runs,
 * so the rule has to survive a shorter list, an empty one and a caller's index
 * that points past the end. `nextIndex` is the one wrap rule; `at` is the one
 * clamp — both are pure, so a renderer test only has to prove the clock calls
 * them.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A phrase count as a usable length: a broken number reads as empty. */
const lengthOf = (count: number): number =>
  Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;

/** The index after `index` in a list of `count` phrases, wrapping at the end. */
export const nextIndex = (index: number, count: number): number => {
  const size = lengthOf(count);
  if (size === 0) return 0;
  const current = Number.isFinite(index) ? Math.trunc(index) : 0;
  return (((current + 1) % size) + size) % size;
};

/** `index` brought into a list of `count` phrases, `0` when there are none. */
export const at = (index: number, count: number): number => {
  const size = lengthOf(count);
  if (size === 0) return 0;
  const current = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((current % size) + size) % size;
};

/** The phrase a rotation paints, `None` for an empty list. */
export const phraseAt = (
  phrases: ReadonlyArray<string>,
  index: number,
): Option.Option<string> => Arr.get(phrases, at(index, phrases.length));
