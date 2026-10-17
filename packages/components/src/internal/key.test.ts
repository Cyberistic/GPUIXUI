/**
 * Key predicates. The bug these guard: `isActivation` accepted only `"enter"`
 * because `"space"` looked like the DOM's `" "`, so Space never activated a
 * focused control. Every predicate is asserted against a neighbouring key, so a
 * typo in any key name fails here instead of in a component.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import {
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
} from "./key.js";

const keyEvent = (key: string, ctrl = false, shift = false): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key,
  modifiers: { shift, ctrl, alt: false, cmd: false },
});

describe("key predicates", () => {
  it("activates on Enter and Space, and not on Tab", () => {
    expect(isActivation(keyEvent("enter"))).toBe(true);
    expect(isActivation(keyEvent("space"))).toBe(true);
    expect(isActivation(keyEvent("tab"))).toBe(false);
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
