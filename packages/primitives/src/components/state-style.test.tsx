/**
 * State-aware `style` (plan 079).
 *
 * The defect this suite guards: a Tier 1 part accepted only a plain `StyleDesc`,
 * so a consumer could not change the look of a *checked*, *focused*, *loading*
 * or *invalid* state without forking the component. The contract
 * (`docs/component-api.md` §3, components plan 305) is the runtime's own
 * `StateStyle<<Part>State>`: an object **or** a callback over a public state.
 *
 * Every case proves three things: the callback receives the documented state,
 * its result wins over the component's own rules, and the old object form still
 * behaves exactly as before.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton, type ButtonState } from "./Button.js";
import { renderCheckbox, type CheckboxState } from "./Checkbox.js";
import { fieldChrome, type FieldState } from "./Input.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import { renderSwitch, type SwitchState } from "./Switch.js";
import { renderToggle, type ToggleState } from "./Toggle.js";
import type { FocusState, StateStyle } from "./internal.js";
import { expectSome, hostStyleString } from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const focused: FocusState = {
  focused: true,
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const PAINT = "#123456";

/**
 * A style callback that records the state it received and paints one known
 * colour, so the test can assert both the payload and that the callback won.
 */
const recorder = <State,>(): {
  readonly seen: Array<State>;
  readonly style: StateStyle<State>;
} => {
  const seen: Array<State> = [];
  return {
    seen,
    style: (state) => {
      seen.push(state);
      return { backgroundColor: PAINT };
    },
  };
};

/** The one state a single render produced. */
const lastState = <State,>(seen: ReadonlyArray<State>): State =>
  seen[0] ?? expect.fail("the style callback was never called");

const background = (element: ReactElement): string =>
  expectSome(hostStyleString(element, "backgroundColor"));

const booleanState = (value: boolean) =>
  initValueState(Option.some(value), false);

const numberHandlers = (): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
});

describe("Button", () => {
  it("hands the callback its disabled, focused and loading state", () => {
    const record = recorder<ButtonState>();
    const element = renderButton(
      { style: record.style, disabled: true, loading: true },
      testTheme,
      { focused: true },
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      focused: true,
      loading: true,
    });
    expect(background(element)).toBe(PAINT);
  });

  it("keeps an object style painting exactly as before", () => {
    const element = renderButton(
      { style: { backgroundColor: PAINT } },
      testTheme,
      { focused: false },
    );
    expect(background(element)).toBe(PAINT);
  });
});

describe("Toggle", () => {
  it("reports its pressed state as checked", () => {
    const record = recorder<ToggleState>();
    const element = renderToggle(
      { style: record.style },
      testTheme,
      booleanState(true),
      idle,
      vi.fn(),
    );
    expect(lastState(record.seen)).toStrictEqual({
      checked: true,
      disabled: false,
      focused: false,
    });
    expect(background(element)).toBe(PAINT);
  });
});

describe("Checkbox", () => {
  it("reports checked and indeterminate as separate facts", () => {
    const checked = recorder<CheckboxState>();
    const mixed = recorder<CheckboxState>();
    const checkedElement = renderCheckbox(
      { style: checked.style },
      testTheme,
      booleanState(true),
      idle,
      vi.fn(),
    );
    renderCheckbox(
      { style: mixed.style, indeterminate: true },
      testTheme,
      booleanState(false),
      focused,
      vi.fn(),
    );
    expect(lastState(checked.seen)).toStrictEqual({
      checked: true,
      indeterminate: false,
      disabled: false,
      focused: false,
      invalid: false,
    });
    expect(lastState(mixed.seen)).toStrictEqual({
      checked: false,
      indeterminate: true,
      disabled: false,
      focused: true,
      invalid: false,
    });
    expect(background(checkedElement)).toBe(PAINT);
  });
});

describe("Switch", () => {
  it("reports the checked and invalid state it painted", () => {
    const record = recorder<SwitchState>();
    const element = renderSwitch(
      { style: record.style, invalid: true, disabled: true },
      testTheme,
      booleanState(true),
      focused,
      vi.fn(),
    );
    expect(lastState(record.seen)).toStrictEqual({
      checked: true,
      disabled: true,
      focused: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });
});

describe("fields", () => {
  it("gives the field chrome its disabled, focused and invalid state", () => {
    const record = recorder<FieldState>();
    const chrome = fieldChrome(
      { style: record.style, invalid: true },
      testTheme,
      true,
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: false,
      focused: true,
      invalid: true,
    });
    expect(chrome.backgroundColor).toBe(PAINT);
  });

  it("gives NumberField the same state through its own chrome", () => {
    const record = recorder<FieldState>();
    const element = renderNumberField(
      { style: record.style, invalid: true, disabled: true },
      testTheme,
      initValueState(Option.some(2), 0),
      "2",
      focused,
      numberHandlers(),
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      focused: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });
});
