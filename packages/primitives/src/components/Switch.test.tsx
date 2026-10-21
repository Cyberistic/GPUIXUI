/**
 * `Switch` — the element tree the runtime receives.
 *
 * The bug this suite guards is the one a part split can reintroduce: the thumb
 * is a real second region, so a caller's glyph lives inside it — and GPUI
 * hit-tests to the deepest element, so a glyph without the `pointerEvents:
 * "none"` guard silently swallows the press that toggles the switch (measured
 * for the filled thumb, plan 041 §9).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderSwitch } from "./Switch.js";
import type { FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const customGlyph = <Icon name="sun" color="red" size={8} />;

/** The thumb a switch draws: root → the part's context → the knob. */
const thumbOf = (element: ReactElement): ReactElement => {
  const provider =
    elementChildren(element)[0] ?? expect.fail("the switch drew no thumb");
  return (
    elementChildren(provider)[0] ?? expect.fail("the thumb part drew nothing")
  );
};

const numberAt = (element: ReactElement, name: string): number =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Number)(
      expectSome(hostStyle(element, name)),
    ),
  );

describe("Switch", () => {
  it("announces itself as a switch and toggles on Space key up", () => {
    const onValueChange = vi.fn();
    const element = renderSwitch(
      {},
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expect(expectSome(hostProp(element, "role"))).toBe("switch");
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe("SwitchThumb", () => {
  it("draws a plain knob sized from the theme scale", () => {
    const thumb = thumbOf(
      renderSwitch({}, testTheme, checked(false), idle, vi.fn()),
    );
    const side = testTheme.iconSize.md - testTheme.spacing["2xs"] * 2;
    expect(numberAt(thumb, "width")).toBe(side);
    expect(numberAt(thumb, "height")).toBe(side);
    expect(elementChildren(thumb)).toStrictEqual([]);
  });

  it("draws the caller's glyph inside the knob", () => {
    const thumb = thumbOf(
      renderSwitch(
        { children: customGlyph },
        testTheme,
        checked(false),
        idle,
        vi.fn(),
      ),
    );
    const glyph = elementChildren(thumb)[0] ?? customGlyph;
    expect(expectSome(elementProp(glyph, "name"))).toBe("sun");
  });

  it("keeps a custom glyph out of the press that toggles the switch", () => {
    const thumb = thumbOf(
      renderSwitch(
        { children: customGlyph },
        testTheme,
        checked(true),
        idle,
        vi.fn(),
      ),
    );
    expect(expectSome(hostStyleString(thumb, "pointerEvents"))).toBe("none");
  });
});
