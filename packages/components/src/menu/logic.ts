import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Match, pipe } from "effect";
import {
  firstEnabled,
  indexOfId,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "../internal/collection.js";
import type { TypeaheadItem } from "../typeahead.js";

export interface MenuItemSpec extends CollectionItem, TypeaheadItem {
  readonly label: string;
}

export interface MenuState {
  readonly activeId: Option.Option<number>;
}

export const initial: MenuState = { activeId: Option.none() };

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

export const resolveActiveIndex = activeIndex;

export const isActive = (state: MenuState, id: number): boolean =>
  Option.contains(state.activeId, id);
