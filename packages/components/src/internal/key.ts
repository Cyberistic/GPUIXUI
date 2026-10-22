/**
 * Named predicates over GPUix key events, so key names live in one place.
 *
 * Typed against `EventPayload` — the fields these predicates read (`key`,
 * `keyChar`, `modifiers`) — so they serve both plain events and `KeyEvent`
 * (which extends it). A key handler that needs `preventDefault` types the event
 * `KeyEvent` at the boundary; these predicates stay on the base shape.
 */

import type { EventPayload } from "@gpuix/react";
import { pipe } from "effect";
import * as Option from "effect/Option";

/**
 * Enter or Space: the two keys that activate a focused control.
 *
 * A **repeat** is not an activation. The platform sends key-down again while a
 * key is held, so without the `isHeld` guard holding Enter runs the focused
 * menu row's action repeatedly and holding Space toggles a selection back —
 * `@gpuix/react`'s own headless button guards `!event.isHeld` for the same
 * reason.
 *
 * TODO: activate Space on key **up**, as the shared keyboard contract does
 * (`docs/component-api.md` §4). That needs the primitives' keyboard module,
 * which this package does not depend on yet (TODO.md → Interlocks).
 */
export const isActivation = (event: EventPayload): boolean =>
  event.isHeld !== true && (event.key === "enter" || event.key === "space");

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
 * The character a keystroke types, or `None` for a shortcut, a named key or Space.
 *
 * `key` decides whether this is text: one character for letters, digits and
 * punctuation, a word (`"enter"`, `"space"`, `"down"`) otherwise. `keyChar`
 * supplies the shifted form. Measured in the real renderer: `Enter` carries
 * `keyChar: "\n"`, so testing `keyChar` alone would type a newline instead of
 * activating the row.
 */
export const typedChar = (event: EventPayload): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(event.keyChar),
    Option.filter(
      (char) =>
        char.length === 1 &&
        char !== " " &&
        Option.exists(
          Option.fromNullishOr(event.key),
          (key) =>
            key.length === 1 &&
            event.modifiers?.cmd !== true &&
            event.modifiers?.ctrl !== true &&
            event.modifiers?.alt !== true,
        ),
    ),
  );

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
