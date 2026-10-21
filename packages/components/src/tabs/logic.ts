/**
 * How a tab list decides where a focus move starts and whether it selects.
 *
 * The activation rule is the one thing that genuinely differs between the two
 * modes; every index question (next enabled trigger, wrap, first/last) belongs
 * to `internal/collection.ts`. The move anchor is here because the runtime does
 * not deliver `onFocus` for a Tab traversal (measured in a window on 0.11.0), so
 * the anchor cannot be state alone.
 */

import { pipe } from "effect";
import * as Option from "effect/Option";

/** When a tab becomes selected relative to the keyboard focus. */
export type TabsActivation = "automatic" | "manual";

/**
 * Whether moving focus onto a tab also selects it.
 *
 * `automatic` selects as focus moves, so browsing with the arrow keys shows a
 * panel immediately. `manual` leaves the selection alone until Enter or Space,
 * which is what a tab whose panel starts a network request wants.
 */
export const selectsOnFocus = (activation: TabsActivation): boolean =>
  activation === "automatic";

/** The three places an arrow move may start from, in precedence order. */
export interface MoveAnchors {
  /** The trigger whose key event reached the list, when the runtime named it. */
  readonly keyOrigin: Option.Option<string>;
  /** The row `onFocus` recorded; a window may never send one. */
  readonly active: Option.Option<string>;
  /** The selected value: there is always one, so a move never starts from nothing. */
  readonly selected: string;
}

/**
 * The index an arrow move starts from: the trigger that sent the key, then the
 * row `onFocus` recorded, then the selection. A window focuses a trigger on a Tab
 * traversal without delivering `onFocus`, so without the key origin and the
 * selection fallback the first arrow re-anchors at the first enabled tab.
 */
export const moveOrigin = (
  { keyOrigin, active, selected }: MoveAnchors,
  indexOf: (value: string) => Option.Option<number>,
): Option.Option<number> =>
  pipe(
    keyOrigin,
    Option.flatMap(indexOf),
    Option.orElse(() => Option.flatMap(active, indexOf)),
    Option.orElse(() => indexOf(selected)),
  );
