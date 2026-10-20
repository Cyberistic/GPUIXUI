/**
 * The selection family's read-only state, in the element tree.
 *
 * The bug guarded (plan `799`): `Checkbox`, `Switch`, `CheckboxGroup` and
 * `RadioGroup` offered only `disabled` — faded **and** out of the tab order —
 * so a review form could not show a value it refuses to change. `readOnly`
 * keeps the tab stop, the ring, the name and the announced state, refuses every
 * activation path, and paints full contrast with a `default` cursor.
 *
 * The native contract (Tab reaches it, the ring paints, the gestures report
 * nothing) is proven in `runtime/selection-read-only.runtime.test.tsx`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactElement } from "react";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderCheckbox, type CheckboxState } from "./Checkbox.js";
import {
  renderCheckboxGroup,
  type CheckboxGroupFocus,
  type CheckboxGroupHandlers,
  type CheckboxGroupState,
  type CheckboxRowState,
} from "./CheckboxGroup.js";
import {
  renderRadioGroup,
  type RadioGroupFocus,
  type RadioGroupHandlers,
  type RadioGroupState,
  type RadioOption,
  type RadioOptionState,
} from "./RadioGroup.js";
import { renderSwitch, type SwitchState } from "./Switch.js";
import type { FocusState, StateStyle } from "./internal.js";
import { clickEvent, keyEvent } from "./testing/event.js";
import {
  elementChildren,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const groupFocus: CheckboxGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
const unfocused: RadioGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const selection = (
  values: ReadonlyArray<string>,
): ValueState<ReadonlyArray<string>> => initValueState(Option.some(values), []);
const text = (value: string): ValueState<string | undefined> =>
  initValueState(Option.some(value), undefined);
const options: ReadonlyArray<RadioOption> = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
];
const tabStop = (element: ReactElement): unknown =>
  expectSome(hostProp(element, "tabIndex"));
const nthChild = (element: ReactElement, index: number): ReactElement =>
  expectSome(Arr.get(elementChildren(element), index));

/** A style callback that records its payload and paints one inert property. */
const recorder = <State,>(): {
  readonly seen: Array<State>;
  readonly style: StateStyle<State>;
} => {
  const seen: Array<State> = [];
  return {
    seen,
    style: (state) => {
      seen.push(state);
      return { opacity: 1 };
    },
  };
};

const radioHandlers = (
  onSelect: (value: string) => void = vi.fn(),
): RadioGroupHandlers => ({
  onSelect,
  onFocusMove: vi.fn(),
  onTypeahead: vi.fn(),
  registerItem: () => () => {},
});

describe("a read-only Checkbox", () => {
  it("keeps its tab stop and reports read-only to its style callback", () => {
    const record = recorder<CheckboxState>();
    const element = renderCheckbox(
      { style: record.style, readOnly: true, label: "Accept" },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(tabStop(element)).toBe(0);
    expect(record.seen).toStrictEqual([
      {
        checked: false,
        indeterminate: false,
        disabled: false,
        readOnly: true,
        focused: false,
        invalid: false,
      },
    ]);
  });

  it("refuses a click and both activation keys", () => {
    const onValueChange = vi.fn();
    const element = renderCheckbox(
      { readOnly: true, label: "Accept" },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onClick"))(clickEvent);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("paints full contrast with the default pointer", () => {
    const element = renderCheckbox(
      { readOnly: true, label: "Accept" },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(element, "cursor"))).toBe("default");
    expect(Option.isNone(hostStyle(element, "opacity"))).toBe(true);
  });
});

describe("a read-only Switch", () => {
  it("keeps its tab stop and reports read-only to its style callback", () => {
    const record = recorder<SwitchState>();
    const element = renderSwitch(
      { style: record.style, readOnly: true, label: "Pause" },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(tabStop(element)).toBe(0);
    expect(record.seen).toStrictEqual([
      {
        checked: true,
        disabled: false,
        readOnly: true,
        focused: false,
        invalid: false,
      },
    ]);
    expect(expectSome(hostStyleString(element, "cursor"))).toBe("default");
  });

  it("refuses a click and both activation keys", () => {
    const onValueChange = vi.fn();
    const element = renderSwitch(
      { readOnly: true, label: "Pause" },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onClick"))(clickEvent);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });
});

describe("a read-only CheckboxGroup", () => {
  const groupHandlers = (
    onToggle: (value: string) => void,
    onToggleAll: () => void,
  ): CheckboxGroupHandlers => ({ onToggle, onToggleAll });

  it("reports read-only on the group and on every row", () => {
    const groupSeen: Array<CheckboxGroupState> = [];
    const row = recorder<CheckboxRowState>();
    renderCheckboxGroup(
      {
        options: [{ value: "email", label: "Email" }],
        readOnly: true,
        style: (state) => {
          groupSeen.push(state);
          return {};
        },
        rowStyle: row.style,
      },
      testTheme,
      selection([]),
      groupFocus,
      groupHandlers(vi.fn(), vi.fn()),
    );
    expect(groupSeen).toStrictEqual([
      { disabled: false, readOnly: true, invalid: false },
    ]);
    expect(row.seen).toStrictEqual([
      {
        value: Option.some("email"),
        index: 0,
        parent: false,
        selection: "unchecked",
        disabled: false,
        readOnly: true,
        focused: false,
        invalid: false,
      },
    ]);
  });

  it("keeps every row's tab stop and refuses its click and keys", () => {
    const onToggle = vi.fn();
    const onToggleAll = vi.fn();
    const element = renderCheckboxGroup(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
        ],
        selectAll: "All",
        readOnly: true,
      },
      testTheme,
      selection(["email"]),
      groupFocus,
      groupHandlers(onToggle, onToggleAll),
    );
    const rows = elementChildren(element);
    expect(Arr.map(rows, tabStop)).toStrictEqual([0, 0, 0]);
    Arr.forEach(rows, (row) => {
      expectSome(hostHandler(row, "onClick"))(clickEvent);
      expectSome(hostHandler(row, "onKeyDown"))(keyEvent("enter"));
      expectSome(hostHandler(row, "onKeyUp"))(keyEvent("space"));
    });
    expect(onToggle).toHaveBeenCalledTimes(0);
    expect(onToggleAll).toHaveBeenCalledTimes(0);
  });

  it("paints no hover or press wash on a read-only row", () => {
    const element = renderCheckboxGroup(
      { options: [{ value: "email", label: "Email" }], readOnly: true },
      testTheme,
      selection([]),
      groupFocus,
      groupHandlers(vi.fn(), vi.fn()),
    );
    const row = nthChild(element, 0);
    expect(Option.isNone(hostStyle(row, "hover"))).toBe(true);
    expect(Option.isNone(hostStyle(row, "active"))).toBe(true);
    expect(expectSome(hostStyleString(row, "cursor"))).toBe("default");
  });
});

describe("a read-only RadioGroup", () => {
  it("reports read-only on the group and on every option", () => {
    const groupSeen: Array<RadioGroupState> = [];
    const option = recorder<RadioOptionState>();
    renderRadioGroup(
      {
        options,
        readOnly: true,
        style: (state) => {
          groupSeen.push(state);
          return {};
        },
        optionStyle: option.style,
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(),
    );
    expect(groupSeen).toStrictEqual([
      { disabled: false, readOnly: true, invalid: false },
    ]);
    expect(option.seen).toStrictEqual([
      {
        value: "alpha",
        index: 0,
        checked: true,
        disabled: false,
        readOnly: true,
        focused: false,
        invalid: false,
      },
      {
        value: "beta",
        index: 1,
        checked: false,
        disabled: false,
        readOnly: true,
        focused: false,
        invalid: false,
      },
    ]);
  });

  it("keeps its one tab stop and refuses a click and activation", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options, readOnly: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(onSelect),
    );
    expect(Arr.map(elementChildren(element), tabStop)).toStrictEqual([0, -1]);
    expectSome(hostHandler(nthChild(element, 1), "onClick"))(clickEvent);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("moves focus with an arrow without selecting", () => {
    // A read-only group is the platform's read-only radio group: the ring
    // moves, the committed value does not.
    const onSelect = vi.fn();
    const onFocusMove = vi.fn();
    const element = renderRadioGroup(
      { options, readOnly: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      { ...radioHandlers(onSelect), onFocusMove },
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onFocusMove).toHaveBeenCalledWith(1);
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("lets disabled win over read-only, so the arrows move nothing", () => {
    const onFocusMove = vi.fn();
    const element = renderRadioGroup(
      { options, readOnly: true, disabled: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      { ...radioHandlers(), onFocusMove },
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onFocusMove).toHaveBeenCalledTimes(0);
  });

  it("paints the row with a default pointer and no wash", () => {
    const element = renderRadioGroup(
      { options, readOnly: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(),
    );
    const row = nthChild(element, 0);
    expect(expectSome(hostStyleString(row, "cursor"))).toBe("default");
    expect(Option.isNone(hostStyle(row, "hover"))).toBe(true);
    expect(Option.isNone(hostStyle(row, "active"))).toBe(true);
  });
});
