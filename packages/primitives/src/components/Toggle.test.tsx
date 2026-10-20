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
import { renderToggle } from "./Toggle.js";
import type { FocusState } from "./internal.js";
import { keyEvent, clickEvent } from "./testing/event.js";
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

  it("names itself from text children, and lets an explicit label win", () => {
    const fromText = renderToggle(
      { children: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(fromText, "aria-label"))).toBe("Bold");
    const explicit = renderToggle(
      { label: "Bold", children: "B" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(explicit, "aria-label"))).toBe("Bold");
    const iconOnly = renderToggle(
      { children: <div /> },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(hostProp(iconOnly, "aria-label")).toStrictEqual(Option.none());
  });

  it("falls back to its text when an explicit label is blank", () => {
    // Plan 396: a computed empty label must not erase the content's name.
    const blank = renderToggle(
      { label: "   ", children: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(blank, "aria-label"))).toBe("Bold");
    const padded = renderToggle(
      { label: "  Bold  ", children: <div /> },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(padded, "aria-label"))).toBe("Bold");
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
    expectSome(hostHandler(element, "onClick"))(keyEvent("click"));
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenCalledTimes(0);
  });

  it("keeps the tab stop and ring while read-only, and refuses every press", () => {
    // The bug guarded (plan 804): `disabled` was the only non-editing state, so
    // a stored mode shown for review was faded and out of the tab order. A
    // read-only toggle is reachable and announced, and only the press is gone.
    const onPressedChange = vi.fn();
    const element = renderToggle(
      { readOnly: true },
      testTheme,
      state(true),
      idle,
      onPressedChange,
    );
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("pressed");
    expectSome(hostHandler(element, "onClick"))(keyEvent("click"));
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenCalledTimes(0);
    const ring = renderToggle(
      { readOnly: true },
      testTheme,
      state(true),
      focused,
      vi.fn(),
    );
    expect(expectSome(hostStyleRecord(ring))["boxShadow"]).toBeDefined();
  });

  it("rings the button while it holds focus", () => {
    const ring = renderToggle({}, testTheme, state(false), focused, vi.fn());
    expect(expectSome(hostStyleRecord(ring))["boxShadow"]).toBeDefined();
    const rest = renderToggle({}, testTheme, state(false), idle, vi.fn());
    expect(
      Option.getOrUndefined(hostStyleRecord(rest))?.["boxShadow"],
    ).toBeUndefined();
  });

  it("forwards a slot's handlers and composes its key rule", () => {
    // The bug guarded (plan 341): a Tooltip can target a toolbar toggle, and
    // the cloned handlers must cross the component boundary.
    const onMouseEnter = vi.fn();
    const onKeyDown = vi.fn();
    const onPressedChange = vi.fn();
    const element = renderToggle(
      { onMouseEnter, onKeyDown },
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expectSome(hostHandler(element, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("forwards the slot's description", () => {
    const element = renderToggle(
      { "aria-description": "A hint" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe("A hint");
  });
});
