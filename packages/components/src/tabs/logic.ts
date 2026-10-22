/**
 * How a tab list decides where a focus move starts and whether it selects.
 *
 * The activation rule is the one thing that genuinely differs between the two
 * modes; every index question (next enabled trigger, wrap, first/last) belongs
 * to `internal/collection.ts`. The move anchor is here because the key's own
 * element is the precise origin — a `Tab` traversal focuses a trigger without
 * running its `onFocus` on 0.11.0 (`tabs-lifecycle` reads `focuses=0`), and the
 * recorded row can be stale or absent — so the anchor cannot be state alone.
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
  /** The row a focus event recorded; a key from the rail arrives with none. */
  readonly active: Option.Option<string>;
  /** The selected value: there is always one, so a move never starts from nothing. */
  readonly selected: string;
}

/**
 * The index an arrow move starts from: the trigger that sent the key, then the
 * row a focus event recorded, then the selection. A `Tab` traversal focuses a
 * trigger without running its `onFocus` on 0.11.0, so the key's own element is
 * the precise origin, and a key that reaches the rail without naming a row still
 * moves from the selection rather than re-anchoring at the first enabled tab.
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
