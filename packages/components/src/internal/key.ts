/**
 * Named predicates over GPUix key events, so key names live in one place.
 *
 * Typed against `EventPayload`, which is what a key handler receives in the
 * installed `@gpuix/react@0.10.0`: that release has no `KeyEvent` type, so there
 * is no `preventDefault`. Components that need to suppress a default action must
 * do it through the runtime's own APIs, not through the event object.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

/** Enter or Space: the two keys that activate a focused control. */
export const isActivation = (event: EventPayload): boolean =>
  event.key === "enter" || event.key === "space";

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
