/**
 * Which menu row is active.
 *
 * The row set and the wrap/skip arithmetic live in `internal/collection.ts`;
 * this module only maps a keyboard action onto that arithmetic, so a menu and a
 * selectable list cannot disagree about what "next enabled row" means.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Match, pipe } from "effect";
import {
  firstEnabled,
  indexOfId,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "../internal/collection.js";

/**
 * A menu row: the id of its host element, whether it accepts selection, and the
 * text type-ahead matches. An empty label is not searched.
 */
export interface MenuItemSpec extends CollectionItem {
  readonly label: string;
}

/** The active row, by element id. */
export interface MenuState {
  readonly activeId: Option.Option<number>;
}

/** No row highlighted. */
export const initial: MenuState = { activeId: Option.none() };

/** A keyboard action that changes the highlight. */
export type MenuAction =
  | { readonly _tag: "Reset" }
  | { readonly _tag: "Focus"; readonly id: number }
  | { readonly _tag: "Move"; readonly delta: 1 | -1 }
  | { readonly _tag: "First" }
  | { readonly _tag: "Last" };

const idAt = (
  items: ReadonlyArray<MenuItemSpec>,
  index: Option.Option<number>,
): Option.Option<number> =>
  pipe(
    index,
    Option.flatMap((at) => Option.map(Arr.get(items, at), (item) => item.id)),
  );

const activeIndex = (
  state: MenuState,
  items: ReadonlyArray<MenuItemSpec>,
): Option.Option<number> =>
  pipe(
    state.activeId,
    Option.flatMap((id) => indexOfId(items, id)),
  );

/**
 * Apply one action. `Move` wraps and skips disabled rows; from no active row,
 * forward starts at the first enabled row and backward at the last. A `Focus`
 * on a disabled or unknown row is ignored, so a highlight can never land
 * somewhere the user cannot select.
 */
export const move = (
  state: MenuState,
  items: ReadonlyArray<MenuItemSpec>,
  action: MenuAction,
): MenuState =>
  Match.value(action).pipe(
    Match.when({ _tag: "Reset" }, () => initial),
    Match.when({ _tag: "Focus" }, (focus) =>
      pipe(
        Arr.findFirst(items, (item) => item.id === focus.id),
        Option.filter((item) => !item.disabled),
        Option.match({
          onNone: () => state,
          onSome: () => ({ activeId: Option.some(focus.id) }),
        }),
      ),
    ),
    Match.when({ _tag: "Move" }, (step) => ({
      // Nothing is movable: keep the highlight rather than blanking it, so a
      // menu of only disabled rows does not lose the user's place.
      activeId: pipe(
        nextEnabled(items, activeIndex(state, items), step.delta),
        Option.flatMap((at) => idAt(items, Option.some(at))),
        Option.orElse(() => state.activeId),
      ),
    })),
    Match.when({ _tag: "First" }, () => ({
      activeId: idAt(items, firstEnabled(items)),
    })),
    Match.when({ _tag: "Last" }, () => ({
      activeId: idAt(items, lastEnabled(items)),
    })),
    Match.exhaustive,
  );

/** The position of the active row in the row list. */
export const resolveActiveIndex = activeIndex;
/** Whether a specific row is the active one. */
export const isActive = (state: MenuState, id: number): boolean =>
  Option.contains(state.activeId, id);

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

/**
 * The row a typed prefix selects: the first **enabled** row after the active one
 * whose label starts with `prefix`, wrapping to the first match; `None` when
 * nothing matches or the prefix is empty.
 *
 * Searching after the active row is what makes a repeated letter advance instead
 * of staying on the first match.
 */
export const matchPrefix = (
  items: ReadonlyArray<MenuItemSpec>,
  activeId: Option.Option<number>,
  prefix: string,
): Option.Option<number> => {
  const needle = Str.trim(Str.toLowerCase(prefix));
  if (Str.isEmpty(needle)) return Option.none();

  const candidates = pipe(
    items,
    Arr.map((item, index) => ({
      disabled: item.disabled,
      id: item.id,
      index,
      label: normalise(item.label),
    })),
    Arr.filter(
      (candidate) =>
        !candidate.disabled &&
        Str.isNonEmpty(candidate.label) &&
        Str.startsWith(needle)(candidate.label),
    ),
  );

  const from = Option.getOrElse(
    Option.flatMap(activeId, (id) => indexOfId(items, id)),
    () => -1,
  );

  return pipe(
    Arr.findFirst(candidates, (candidate) => candidate.index > from),
    Option.orElse(() => Arr.head(candidates)),
    Option.map((candidate) => candidate.id),
  );
};
