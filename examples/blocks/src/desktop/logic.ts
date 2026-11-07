import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { WindowId } from "./data.js";

export interface DesktopState {
  readonly order: ReadonlyArray<WindowId>;
  readonly menuOpen: boolean;
}

export const raise = (state: DesktopState, id: WindowId): DesktopState => ({
  order: Arr.append(
    Arr.filter(state.order, (other) => other !== id),
    id,
  ),
  menuOpen: false,
});

export const toggleMenu = (state: DesktopState): DesktopState => ({
  ...state,
  menuOpen: !state.menuOpen,
});

export const closeMenu = (state: DesktopState): DesktopState =>
  state.menuOpen ? { ...state, menuOpen: false } : state;

export const active = (state: DesktopState): WindowId | undefined =>
  Option.getOrUndefined(Arr.last(state.order));
