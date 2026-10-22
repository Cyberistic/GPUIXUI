/**
 * One activation per interaction, on every control that can be activated.
 *
 * The guarded defect: `Rating` is a `radiogroup` whose stars are `role="radio"`
 * tab stops, but it only moved its value with the arrows — Space and Enter did
 * nothing on a focused star, so a keyboard user could not choose the star they
 * had landed on. The fix is `core/keyboard.ts`'s contract, and this matrix is
 * what stops the next part from drifting: **Enter** activates on the key
 * *press*, **Space** on the *release*, a held key never activates, and the pair
 * fires exactly once.
 *
 * Each case counts the control's own change callback, so the assertion is the
 * behaviour the caller sees rather than which handler was wired: a part that
 * activated on both the press and the release would report two.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderIconButton } from "./IconButton.js";
import { renderRadioGroup, type RadioGroupHandlers } from "./RadioGroup.js";
import { noPreview, renderRating, type RatingHandlers } from "./Rating.js";
import { renderSwitch } from "./Switch.js";
import { renderToggle } from "./Toggle.js";
import { keyEvent } from "./testing/event.js";
import { expectSome, hostHandler } from "./testing/element.js";

const focus = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

/** A control, the tree it renders, and the count of activations it reported. */
interface Part {
  readonly element: () => ReactElement;
  readonly activations: () => number;
}

const button = (): Part => {
  const onActivate = vi.fn();
  return {
    element: () => renderButton({ onActivate }, testTheme, focus),
    activations: () => onActivate.mock.calls.length,
  };
};

const iconButton = (): Part => {
  const onActivate = vi.fn();
  return {
    element: () =>
      renderIconButton(
        { label: "Delete", icon: null, onActivate },
        testTheme,
        focus,
      ),
    activations: () => onActivate.mock.calls.length,
  };
};

const toggle = (): Part => {
  const onPressedChange = vi.fn();
  return {
    element: () =>
      renderToggle(
        { onPressedChange },
        testTheme,
        initValueState(Option.none(), false),
        focus,
        onPressedChange,
      ),
    activations: () => onPressedChange.mock.calls.length,
  };
};

const checkbox = (): Part => {
  const onValueChange = vi.fn();
  return {
    element: () =>
      renderCheckbox(
        {},
        testTheme,
        initValueState(Option.none(), false),
        focus,
        onValueChange,
      ),
    activations: () => onValueChange.mock.calls.length,
  };
};

const switchPart = (): Part => {
  const onValueChange = vi.fn();
  return {
    element: () =>
      renderSwitch(
        {},
        testTheme,
        initValueState(Option.none(), false),
        focus,
        onValueChange,
      ),
    activations: () => onValueChange.mock.calls.length,
  };
};

const radioGroup = (): Part => {
  const onSelect = vi.fn();
  const handlers: RadioGroupHandlers = {
    onSelect,
    onFocusMove: vi.fn(),
    registerItem: () => () => {},
  };
  return {
    element: () =>
      renderRadioGroup(
        {
          label: "Density",
          options: [
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ],
        },
        testTheme,
        initValueState(Option.some(""), ""),
        1,
        { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
        handlers,
      ),
    activations: () => onSelect.mock.calls.length,
  };
};

const rating = (): Part => {
  const onSelect = vi.fn();
  const handlers: RatingHandlers = {
    onSelect,
    onMove: vi.fn(),
    registerItem: () => () => {},
  };
  return {
    element: () =>
      renderRating(
        { label: "Quality" },
        testTheme,
        initValueState(Option.some(0), 0),
        { focusedIndex: Option.some(4), onFocus: vi.fn(), onBlur: vi.fn() },
        noPreview,
        handlers,
      ),
    activations: () => onSelect.mock.calls.length,
  };
};

const PARTS: ReadonlyArray<readonly [string, () => Part]> = [
  ["Button", button],
  ["IconButton", iconButton],
  ["Toggle", toggle],
  ["Checkbox", checkbox],
  ["Switch", switchPart],
  ["RadioGroup", radioGroup],
  ["Rating", rating],
];

const handler = (part: Part, name: "onKeyDown" | "onKeyUp") =>
  expectSome(hostHandler(part.element(), name));

describe("the activation contract", () => {
  it.each(PARTS)("activates %s once with Enter on the press", (_name, make) => {
    const part = make();
    const press = keyEvent("enter");
    handler(part, "onKeyDown")(press);
    handler(part, "onKeyUp")(keyEvent("enter"));
    expect(part.activations()).toBe(1);
    expect(press.prevented).toBe(false);
  });

  it.each(PARTS)(
    "waits for the Space release on %s, then fires once",
    (_name, make) => {
      const part = make();
      const press = keyEvent("space");
      handler(part, "onKeyDown")(press);
      expect(part.activations()).toBe(0);
      expect(press.prevented).toBe(true);
      handler(part, "onKeyUp")(keyEvent("space"));
      expect(part.activations()).toBe(1);
    },
  );

  it.each(PARTS)("ignores a held activating key on %s", (_name, make) => {
    const part = make();
    handler(part, "onKeyDown")(keyEvent("enter", { isHeld: true }));
    handler(part, "onKeyDown")(keyEvent("space", { isHeld: true }));
    expect(part.activations()).toBe(0);
    handler(part, "onKeyUp")(keyEvent("space"));
    expect(part.activations()).toBe(1);
  });
});

describe("a rating's activating key", () => {
  const select = (focused: Option.Option<number>): unknown => {
    const onSelect = vi.fn();
    const element = renderRating(
      {},
      testTheme,
      initValueState(Option.some(2), 0),
      { focusedIndex: focused, onFocus: vi.fn(), onBlur: vi.fn() },
      noPreview,
      { onSelect, onMove: vi.fn(), registerItem: () => () => {} },
    );
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    return onSelect.mock.calls[0]?.[0];
  };

  it("selects the focused star, not the current value", () => {
    expect(select(Option.some(4))).toBe(4);
  });

  it("falls back to the tab stop when no star reported focus", () => {
    expect(select(Option.none())).toBe(2);
  });
});
