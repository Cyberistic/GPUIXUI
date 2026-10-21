/**
 * `Toggle` — the element tree the runtime receives.
 *
 * The bug this suite guards is the a11y contract: GPUix has no `aria-pressed`,
 * so a toggle must announce its state through `aria-valuetext` and must not
 * write the attribute the runtime ignores. The rest is the shared activation
 * contract — Enter on key down, Space on key up, a held key ignored — and the
 * pressed paint coming from the accent role rather than a literal.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderToggle, type ToggleState } from "./Toggle.js";
import type { FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const state = (pressed: boolean) => initValueState(Option.some(pressed), false);
const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const focused: FocusState = {
  focused: true,
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

describe("Toggle", () => {
  it("is a button that announces its pressed state instead of aria-pressed", () => {
    const element = renderToggle(
      { label: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("button");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Bold");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("not pressed");
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    expect(hostProp(element, "aria-pressed")).toStrictEqual(Option.none());
  });

  it("publishes its plain text child when it has no label", () => {
    const element = renderToggle(
      { children: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Bold");
  });

  it("announces a pressed toggle", () => {
    const element = renderToggle(
      { pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("pressed");
  });

  it("paints the accent role while pressed and nothing at rest", () => {
    const pressed = renderToggle(
      { pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(pressed, "backgroundColor"))).toBe(
      testTheme.colors.accent,
    );
    expect(expectSome(hostStyleString(pressed, "color"))).toBe(
      testTheme.colors.accentForeground,
    );
    const rest = renderToggle({}, testTheme, state(false), idle, vi.fn());
    expect(hostStyleString(rest, "backgroundColor")).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the border of the outline variant while pressed", () => {
    const element = renderToggle(
      { variant: "outline", pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(element, "borderColor"))).toBe(
      testTheme.colors.border,
    );
  });

  it("toggles on a click, on Enter down and on Space up", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      {},
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expectSome(hostHandler(element, "onClick"))(keyEvent("click"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expect(onPressedChange).toHaveBeenCalledTimes(3);
  });

  it("ignores a held key", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      {},
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expectSome(hostHandler(element, "onKeyDown"))(
      keyEvent("enter", { isHeld: true }),
    );
    expect(onPressedChange).toHaveBeenCalledTimes(0);
  });

  it("refuses activation and leaves the tab order while disabled", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      { disabled: true },
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    // No press handler is installed while disabled; the keys stay observable
    // but their activation is refused.
    expect(hostHandler(element, "onClick")).toStrictEqual(Option.none());
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenCalledTimes(0);
  });

  it("declares the keyboard ring at rest, and never a focus-painted shadow", () => {
    // The bug: the ring was merged only while `focused`, so a click looked
    // exactly like a Tab. The outline is declared once and the runtime paints it
    // after keyboard input (`focusVisible`).
    const rest = renderToggle({}, testTheme, state(false), idle, vi.fn());
    const style = expectSome(hostStyleRecord(rest));
    expect(style["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(
      Option.none(),
    );
    const held = renderToggle({}, testTheme, state(false), focused, vi.fn());
    expect(expectSome(hostStyleRecord(held))["focusVisible"]).toEqual(
      style["focusVisible"],
    );
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: ToggleState[] = [];
    const element = renderToggle(
      {
        disabled: true,
        style: (next) => {
          seen.push(next);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      state(true),
      focused,
      vi.fn(),
    );

    expect(seen).toEqual([{ disabled: true, focused: true, selected: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });
});
