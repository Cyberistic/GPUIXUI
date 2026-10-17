/**
 * The selection controls: `Checkbox`, `Switch`, `RadioGroup`.
 *
 * The bug this suite exists for is the a11y contract on a runtime that exposes
 * neither `aria-checked` nor `aria-valuenow` (plan 020 §1.4): state must be
 * legible through `aria-valuetext`, and the unsupported attributes must stay
 * *absent* rather than being written for the DOM's benefit and ignored by GPUix.
 * The rest is the keyboard and roving-index contract the platform expects.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  checkboxState,
  renderCheckbox,
  selectionValueText,
} from "./Checkbox.js";
import {
  initialActiveIndex,
  renderRadioGroup,
  type RadioGroupHandlers,
  type RadioGroupFocus,
  type RadioOption,
} from "./RadioGroup.js";
import { renderSwitch } from "./Switch.js";
import type { FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  expectSome,
  hostHandler,
  hostProp,
  hostStyleString,
  hostTag,
  elementChildren,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const unfocused: RadioGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
/** The group's handlers, with the focus move recorded by default. */
const radioHandlers = (
  onSelect: (value: string) => void,
): RadioGroupHandlers => ({
  onSelect,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const text = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");

const options: ReadonlyArray<RadioOption> = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma" },
];

describe("Checkbox", () => {
  it("announces its state as value text, and never invents aria-checked", () => {
    const element = renderCheckbox(
      { checked: true },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("checkbox");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("checked");
    expect(hostProp(element, "aria-checked")).toStrictEqual(Option.none());
  });

  it("reports the indeterminate state as mixed", () => {
    const element = renderCheckbox(
      { indeterminate: true },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("mixed");
  });

  it("toggles to the opposite of what it currently shows", () => {
    const onValueChange = vi.fn();
    const element = renderCheckbox(
      {},
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onClick"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle while disabled", () => {
    const onValueChange = vi.fn();
    const element = renderCheckbox(
      { disabled: true },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onClick"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });
});

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

describe("RadioGroup", () => {
  it("moves the selection with the arrow key and reports the option it landed on", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(onSelect),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("radiogroup");
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("moves focus to the option an arrow lands on", () => {
    // The bug guarded: arrows moved the selection and the tab stop while native
    // focus stayed on the old radio, so the platform's "selection follows
    // focus" contract was broken and a ring would have sat on the wrong item.
    const handlers = radioHandlers(vi.fn());
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      handlers,
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(1);
  });

  it("jumps focus to the option Home lands on", () => {
    const handlers = radioHandlers(vi.fn());
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      handlers,
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("home"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(0);
    expect(handlers.onFocusMove).toHaveBeenCalledTimes(1);
  });

  it("wraps from the last option back to the first", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      radioHandlers(onSelect),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("alpha");
  });

  it("never selects a disabled option through a click", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options: [{ value: "alpha", label: "Alpha", disabled: true }] },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(onSelect),
    );
    expect(expectSome(hostTag(element))).toBe("div");
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("starts the roving index on the selection, or the first option a user can pick", () => {
    expect(initialActiveIndex(options, "gamma")).toBe(2);
    expect(
      initialActiveIndex(
        [
          { value: "a", label: "A", disabled: true },
          { value: "b", label: "B" },
        ],
        "",
      ),
    ).toBe(1);
  });

  it("never makes a selected-but-disabled option the tab stop", () => {
    const mixed = [
      { value: "a", label: "A", disabled: true },
      { value: "b", label: "B" },
    ];
    const element = renderRadioGroup(
      { options: mixed },
      testTheme,
      text("a"),
      initialActiveIndex(mixed, "a"),
      unfocused,
      radioHandlers(vi.fn()),
    );
    const items = elementChildren(element);
    expect(
      hostProp(expectSome(Option.fromNullishOr(items[0])), "tabIndex"),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(
        hostProp(expectSome(Option.fromNullishOr(items[1])), "tabIndex"),
      ),
    ).toBe(0);
  });

  it("reports selection state through value text, not aria-checked", () => {
    expect(selectionValueText(checkboxState({ indeterminate: true }))).toBe(
      "mixed",
    );
    expect(selectionValueText(checkboxState({ checked: true }))).toBe(
      "checked",
    );
  });

  it("paints a failed validation on the empty circles only", () => {
    const element = renderRadioGroup(
      { options, invalid: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const circleBorder = (index: number): string => {
      const row = expectSome(Arr.get(elementChildren(element), index));
      const circle = expectSome(Arr.get(elementChildren(row), 0));
      return expectSome(hostStyleString(circle, "borderColor"));
    };
    // The chosen circle keeps its accent; the unanswered ones take the error.
    expect(circleBorder(0)).toBe(testTheme.colors.primary);
    expect(circleBorder(1)).toBe(testTheme.colors.destructive);
    expect(circleBorder(2)).toBe(testTheme.colors.destructive);

    const valid = renderRadioGroup(
      { options },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const firstCircle = expectSome(
      Arr.get(
        elementChildren(expectSome(Arr.get(elementChildren(valid), 0))),
        0,
      ),
    );
    expect(expectSome(hostStyleString(firstCircle, "borderColor"))).toBe(
      testTheme.colors.input,
    );
  });
});
