/**
 * The desktop's rules: which window is in front, and the Start menu.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { WindowId } from "./data.js";

export interface DesktopState {
  /** Back to front: the last window is active and painted last. */
  readonly order: ReadonlyArray<WindowId>;
  readonly menuOpen: boolean;
}

/** `id` brought to the front; a raise also closes the Start menu. */
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

/** The window in front, the one the taskbar shows pressed. */
export const active = (state: DesktopState): WindowId | undefined =>
  Option.getOrUndefined(Arr.last(state.order));
