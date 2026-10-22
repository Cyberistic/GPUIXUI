/**
 * Key predicates. The bugs these guard: `isActivation` accepted only `"enter"`
 * because `"space"` looked like the DOM's `" "`, so Space never activated a
 * focused control; it accepted a **repeat** event, so holding Enter ran the
 * focused menu row's action again on every repeat; and it took no **phase**, so
 * Space activated on the press — one keystroke did two things, and the press
 * could not be swallowed to stop the container behind the control scrolling
 * while the release was still to come. Every predicate is asserted against a
 * neighbouring key, so a typo in any key name fails here instead of in a
 * component.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import {
  activationHandlers,
  axisDirection,
  isActivation,
  isDismiss,
  isDown,
  isFirst,
  isLast,
  isLeft,
  isMenuKey,
  isRight,
  isTab,
  isUp,
  swallowsDefault,
} from "./key.js";

const keyEvent = (key: string, ctrl = false, shift = false): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key,
  modifiers: { shift, ctrl, alt: false, cmd: false },
});

const repeated = (key: string): EventPayload => ({
  ...keyEvent(key),
  isHeld: true,
});

describe("key predicates", () => {
  it("activates Enter on the press and Space on the release", () => {
    expect(isActivation(keyEvent("enter"), "down")).toBe(true);
    expect(isActivation(keyEvent("enter"), "up")).toBe(false);
    expect(isActivation(keyEvent("space"), "down")).toBe(false);
    expect(isActivation(keyEvent("space"), "up")).toBe(true);
    expect(isActivation(keyEvent("tab"), "down")).toBe(false);
    expect(isActivation(keyEvent("tab"), "up")).toBe(false);
  });

  it("does not activate on a repeat while the key is held", () => {
    expect(isActivation(repeated("enter"), "down")).toBe(false);
    expect(isActivation(repeated("space"), "up")).toBe(false);
    // A first press of the same key still activates.
    expect(isActivation(keyEvent("enter"), "down")).toBe(true);
  });

  it("swallows the platform default on a Space press only", () => {
    expect(swallowsDefault(keyEvent("space"), "down")).toBe(true);
    expect(swallowsDefault(keyEvent("space"), "up")).toBe(false);
    expect(swallowsDefault(keyEvent("enter"), "down")).toBe(false);
    expect(swallowsDefault(keyEvent("tab"), "down")).toBe(false);
  });

  it("reads the arrow keys in their own direction only", () => {
    expect(isDown(keyEvent("down"))).toBe(true);
    expect(isUp(keyEvent("down"))).toBe(false);
    expect(isRight(keyEvent("right"))).toBe(true);
    expect(isLeft(keyEvent("right"))).toBe(false);
  });

  it("accepts Ctrl+N and Ctrl+P as menu movement", () => {
    expect(isDown(keyEvent("n", true))).toBe(true);
    expect(isUp(keyEvent("p", true))).toBe(true);
  });

  it("does not treat a bare n as menu movement", () => {
    expect(isDown(keyEvent("n"))).toBe(false);
    expect(isUp(keyEvent("p"))).toBe(false);
  });

  it("recognises Home, End, Escape and Tab", () => {
    expect(isFirst(keyEvent("home"))).toBe(true);
    expect(isLast(keyEvent("end"))).toBe(true);
    expect(isDismiss(keyEvent("escape"))).toBe(true);
    expect(isTab(keyEvent("tab"))).toBe(true);
    expect(isDismiss(keyEvent("tab"))).toBe(false);
  });

  it("opens a context menu from Shift+F10 or the Menu key", () => {
    expect(isMenuKey(keyEvent("f10", false, true))).toBe(true);
    expect(isMenuKey(keyEvent("contextmenu"))).toBe(true);
    expect(isMenuKey(keyEvent("f10"))).toBe(false);
    expect(isMenuKey(keyEvent("f10", true))).toBe(false);
    expect(isMenuKey(keyEvent("enter", false, true))).toBe(false);
  });
});

describe("activationHandlers", () => {
  const press = (key: string, phase: "down" | "up") => {
    let prevented = false;
    const event: KeyEvent = {
      ...keyEvent(key),
      eventType: phase === "down" ? "keyDown" : "keyUp",
      get defaultPrevented() {
        return prevented;
      },
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => undefined,
    };
    return { event, prevented: () => prevented };
  };

  it("runs the activation on Enter's press and Space's release", () => {
    const activate = vi.fn();
    const handlers = activationHandlers(activate);

    const enter = press("enter", "down");
    handlers.onKeyDown?.(enter.event);
    expect(activate).toHaveBeenCalledTimes(1);

    const spacePress = press("space", "down");
    handlers.onKeyDown?.(spacePress.event);
    expect(activate).toHaveBeenCalledTimes(1);

    const spaceRelease = press("space", "up");
    handlers.onKeyUp?.(spaceRelease.event);
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it("swallows the platform default on the Space press, and nothing else", () => {
    const handlers = activationHandlers(() => undefined);

    const spacePress = press("space", "down");
    handlers.onKeyDown?.(spacePress.event);
    expect(spacePress.prevented()).toBe(true);

    const enterPress = press("enter", "down");
    handlers.onKeyDown?.(enterPress.event);
    expect(enterPress.prevented()).toBe(false);

    const spaceRelease = press("space", "up");
    handlers.onKeyUp?.(spaceRelease.event);
    expect(spaceRelease.prevented()).toBe(false);
  });

  it("still runs the caller's own key handlers", () => {
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    const handlers = activationHandlers(() => undefined, {
      onKeyDown,
      onKeyUp,
    });

    const down = press("a", "down");
    const up = press("a", "up");
    handlers.onKeyDown?.(down.event);
    handlers.onKeyUp?.(up.event);

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyUp).toHaveBeenCalledTimes(1);
  });
});

describe("axisDirection", () => {
  it("maps the axis arrow keys to a direction", () => {
    expect(axisDirection(keyEvent("right"), "horizontal")).toEqual(
      Option.some(1),
    );
    expect(axisDirection(keyEvent("left"), "horizontal")).toEqual(
      Option.some(-1),
    );
    expect(axisDirection(keyEvent("down"), "vertical")).toEqual(Option.some(1));
    expect(axisDirection(keyEvent("up"), "vertical")).toEqual(Option.some(-1));
  });

  it("ignores Up/Down for a horizontal list and Left/Right for a vertical one", () => {
    expect(axisDirection(keyEvent("down"), "horizontal")).toEqual(
      Option.none(),
    );
    expect(axisDirection(keyEvent("right"), "vertical")).toEqual(
      Option.some(1),
    );
    expect(axisDirection(keyEvent("p", true), "horizontal")).toEqual(
      Option.none(),
    );
  });

  it("has no direction for a non-arrow key", () => {
    expect(axisDirection(keyEvent("enter"), "vertical")).toEqual(Option.none());
  });
});
