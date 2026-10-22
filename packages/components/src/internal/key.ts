/**
 * Named predicates over GPUix key events, so key names live in one place.
 *
 * Typed against `EventPayload` — the fields these predicates read (`key`,
 * `keyChar`, `modifiers`) — so they serve both plain events and `KeyEvent`
 * (which extends it). A key handler that needs `preventDefault` types the event
 * `KeyEvent` at the boundary; these predicates stay on the base shape.
 */

import type { EventPayload, KeyEvent, Props } from "@gpuix/react";
import * as Option from "effect/Option";

/** The half of a key event a decision is made for. */
export type KeyPhase = "down" | "up";

/**
 * Enter or Space: the two keys that activate a focused control.
 *
 * The halves are not interchangeable, and that is the platform convention
 * (`docs/component-api.md` §4): **Enter** activates on the press, **Space** on
 * the release, so a Space press starts the gesture without also scrolling the
 * container behind the control and a press a reader cancels before releasing
 * runs nothing. That is why `phase` is required — a handler that activates on
 * a Space press answers "no" here.
 *
 * A **repeat** is not an activation either way. The platform sends key-down
 * again while a key is held, so without the `isHeld` guard holding Enter runs
 * the focused menu row's action repeatedly and holding Space toggles a
 * selection back — `@gpuix/react`'s own headless button guards `!event.isHeld`
 * for the same reason.
 */
export const isActivation = (event: EventPayload, phase: KeyPhase): boolean => {
  if (event.isHeld === true) return false;
  if (event.key === "enter") return phase === "down";
  return event.key === "space" && phase === "up";
};

/**
 * Whether the platform must not run its own action for this key event.
 *
 * Only a Space **press**: the control acts on the release, so the press would
 * otherwise scroll a container (or be typed into a field) on the way there.
 * Enter's default *is* the activation a press runs.
 */
export const swallowsDefault = (
  event: EventPayload,
  phase: KeyPhase,
): boolean => event.key === "space" && phase === "down";

/**
 * The two key handlers a plain activating control installs: the Space press is
 * swallowed, and the activation runs on whichever half carries it. `observe`
 * is the caller's own handlers, which still see every event.
 */
export const activationHandlers = (
  activate: (event: KeyEvent) => void,
  observe: Pick<Props, "onKeyDown" | "onKeyUp"> = {},
): Pick<Props, "onKeyDown" | "onKeyUp"> => ({
  onKeyDown: (event: KeyEvent) => {
    if (swallowsDefault(event, "down")) event.preventDefault();
    if (isActivation(event, "down")) activate(event);
    observe.onKeyDown?.(event);
  },
  onKeyUp: (event: KeyEvent) => {
    if (isActivation(event, "up")) activate(event);
    observe.onKeyUp?.(event);
  },
});

/** Enter alone: a row action. Space stays a selection key. */
export const isEnter = (event: EventPayload): boolean => event.key === "enter";

/** Arrow Down, or Ctrl+N for a menu that follows the desktop convention. */
export const isDown = (event: EventPayload): boolean =>
  event.key === "down" || (event.key === "n" && event.modifiers?.ctrl === true);

/** Arrow Up, or Ctrl+P. */
export const isUp = (event: EventPayload): boolean =>
  event.key === "up" || (event.key === "p" && event.modifiers?.ctrl === true);

/** Arrow Right. */
export const isRight = (event: EventPayload): boolean => event.key === "right";

/** Arrow Left. */
export const isLeft = (event: EventPayload): boolean => event.key === "left";

/** Home. */
export const isFirst = (event: EventPayload): boolean => event.key === "home";

/** End. */
export const isLast = (event: EventPayload): boolean => event.key === "end";

/** Page Up, the previous month in a calendar. */
export const isPageUp = (event: EventPayload): boolean =>
  event.key === "pageup";

/** Page Down, the next month in a calendar. */
export const isPageDown = (event: EventPayload): boolean =>
  event.key === "pagedown";

/** Escape, which every overlay treats as dismiss. */
export const isDismiss = (event: EventPayload): boolean =>
  event.key === "escape";

/** Tab. */
export const isTab = (event: EventPayload): boolean => event.key === "tab";

/** Cmd+A (macOS) or Ctrl+A (elsewhere): select every row in a list. */
export const isSelectAll = (event: EventPayload): boolean =>
  event.key === "a" &&
  (event.modifiers?.cmd === true || event.modifiers?.ctrl === true);

/** Shift+F10, or the dedicated Menu key: the keyboard route to a context menu. */
export const isMenuKey = (event: EventPayload): boolean =>
  (event.key === "f10" && event.modifiers?.shift === true) ||
  event.key === "contextmenu";

/**
 * The direction an arrow key means for a list on that axis: `1` forward, `-1`
 * back, `None` for every other key. Horizontal lists use Left/Right and ignore
 * Ctrl+N/P; vertical lists use Up/Down and accept them.
 */
export const axisDirection = (
  event: EventPayload,
  orientation: "horizontal" | "vertical",
): Option.Option<1 | -1> => {
  if (event.key === "right") return Option.some(1);
  if (event.key === "left") return Option.some(-1);
  if (orientation === "vertical") {
    if (isDown(event)) return Option.some(1);
    if (isUp(event)) return Option.some(-1);
  }
  return Option.none();
};
