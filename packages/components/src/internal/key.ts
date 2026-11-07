import type { EventPayload, KeyEvent, Props } from "@gpuix/react";
import * as Option from "effect/Option";

export type KeyPhase = "down" | "up";

export const isActivation = (event: EventPayload, phase: KeyPhase): boolean => {
  if (event.isHeld === true) return false;
  if (event.key === "enter") return phase === "down";
  return event.key === "space" && phase === "up";
};

export const swallowsDefault = (
  event: EventPayload,
  phase: KeyPhase,
): boolean => event.key === "space" && phase === "down";

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

export const isEnter = (event: EventPayload): boolean => event.key === "enter";

export const isDown = (event: EventPayload): boolean =>
  event.key === "down" || (event.key === "n" && event.modifiers?.ctrl === true);

export const isUp = (event: EventPayload): boolean =>
  event.key === "up" || (event.key === "p" && event.modifiers?.ctrl === true);

export const isRight = (event: EventPayload): boolean => event.key === "right";

export const isLeft = (event: EventPayload): boolean => event.key === "left";

export const isFirst = (event: EventPayload): boolean => event.key === "home";

export const isLast = (event: EventPayload): boolean => event.key === "end";

export const isPageUp = (event: EventPayload): boolean =>
  event.key === "pageup";

export const isPageDown = (event: EventPayload): boolean =>
  event.key === "pagedown";

export const isDismiss = (event: EventPayload): boolean =>
  event.key === "escape";

export const isTab = (event: EventPayload): boolean => event.key === "tab";

export const isSelectAll = (event: EventPayload): boolean =>
  event.key === "a" &&
  (event.modifiers?.cmd === true || event.modifiers?.ctrl === true);

export const isMenuKey = (event: EventPayload): boolean =>
  (event.key === "f10" && event.modifiers?.shift === true) ||
  event.key === "contextmenu";

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
