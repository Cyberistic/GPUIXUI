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
import type { ReactElement } from "react";
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
import {
  renderCheckboxGroup,
  type CheckboxGroupHandlers,
  type CheckboxGroupFocus,
} from "./CheckboxGroup.js";
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
  hostTag,
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
const selection = (
  values: ReadonlyArray<string>,
): ValueState<ReadonlyArray<string>> => initValueState(Option.some(values), []);
const groupFocus: CheckboxGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
const groupHandlers = (
  onToggle: (value: string) => void = vi.fn(),
): CheckboxGroupHandlers => ({ onToggle, onToggleAll: vi.fn() });

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

  it("rests its thumb at the end it reports, and animates only that position", () => {
    // The bug guarded (plan 329): the thumb was laid out with `justifyContent`,
    // so it jumped and there was no transition to assert on. A `motion.div` is
    // not a host tag, so its props are read with `elementProp`, not `hostStyle`.
    const thumbOf = (element: ReactElement): ReactElement =>
      expectSome(Arr.head(elementChildren(element)));
    const off = renderSwitch({}, testTheme, checked(false), idle, vi.fn());
    const on = renderSwitch({}, testTheme, checked(true), idle, vi.fn());
    const offThumb = thumbOf(off);
    const onThumb = thumbOf(on);

    expect(expectSome(elementProp(offThumb, "animate"))).toEqual({ left: 2 });
    expect(expectSome(elementProp(onThumb, "animate"))).toEqual({ left: 12 });
    expect(expectSome(elementProp(offThumb, "style"))).toMatchObject({
      position: "absolute",
      left: 2,
      top: 1,
    });
    expect(Option.isNone(hostStyle(off, "justifyContent"))).toBe(true);
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

describe("CheckboxGroup", () => {
  const options = [
    { value: "email", label: "Email", description: "A digest." },
    { value: "push", label: "Push" },
  ] as const;

  const render = (
    props: Partial<Parameters<typeof renderCheckboxGroup>[0]> = {},
    values: ReadonlyArray<string> = ["email"],
    focus: CheckboxGroupFocus = groupFocus,
    handlers: CheckboxGroupHandlers = groupHandlers(),
  ) =>
    renderCheckboxGroup(
      { options, ...props },
      testTheme,
      selection(values),
      focus,
      handlers,
    );

  const row = (element: ReturnType<typeof render>, index: number) =>
    expectSome(Arr.get(elementChildren(element), index));

  const box = (element: ReturnType<typeof render>, index: number) =>
    expectSome(Arr.get(elementChildren(row(element, index)), 0));

  it("names the group and gives every row the checkbox contract", () => {
    const element = render({ label: "Channels" });
    expect(expectSome(hostProp(element, "role"))).toBe("group");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Channels");
    expect(expectSome(hostProp(row(element, 0), "role"))).toBe("checkbox");
    expect(expectSome(hostProp(row(element, 0), "aria-label"))).toBe("Email");
    expect(expectSome(hostProp(row(element, 0), "aria-valuetext"))).toBe(
      "checked",
    );
    expect(expectSome(hostProp(row(element, 1), "aria-valuetext"))).toBe(
      "unchecked",
    );
    expect(hostProp(row(element, 0), "aria-checked")).toStrictEqual(
      Option.none(),
    );
  });

  it("renders the select-all parent with the state derived from the options", () => {
    const partial = render({ selectAll: "All channels" });
    expect(expectSome(hostProp(row(partial, 0), "aria-label"))).toBe(
      "All channels",
    );
    expect(expectSome(hostProp(row(partial, 0), "aria-valuetext"))).toBe(
      "mixed",
    );
    const all = render({ selectAll: "All channels" }, ["email", "push"]);
    expect(expectSome(hostProp(row(all, 0), "aria-valuetext"))).toBe("checked");
  });

  it("makes the row, not a nested box, the hit area and the tab stop", () => {
    const onToggle = vi.fn();
    const element = render({ selectAll: "All channels" }, [], groupFocus, {
      onToggle,
      onToggleAll: vi.fn(),
    });
    // The parent row is index 0, so "Email" is index 1.
    expect(expectSome(hostProp(row(element, 1), "tabIndex"))).toBe(0);
    expectSome(hostHandler(row(element, 1), "onClick"))(keyEvent("space"));
    expect(onToggle).toHaveBeenCalledWith("email");
  });

  it("takes a disabled row and a disabled group out of the tab order", () => {
    const oneDisabled = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
        selectAll: "All channels",
      },
      [],
    );
    expect(hostProp(row(oneDisabled, 2), "tabIndex")).toStrictEqual(
      Option.none(),
    );
    const disabled = render({ disabled: true, selectAll: "All channels" });
    expect(
      Arr.every(
        Arr.map(elementChildren(disabled), (child) =>
          hostProp(child, "tabIndex"),
        ),
        Option.isNone,
      ),
    ).toBe(true);
    // With nothing left to select, the parent is disabled even though the group
    // itself is not: "select all" of an empty enabled set is not an action.
    const allDisabled = render(
      {
        options: [{ value: "email", label: "Email", disabled: true }],
        selectAll: "All channels",
      },
      [],
    );
    expect(hostProp(row(allDisabled, 0), "tabIndex")).toStrictEqual(
      Option.none(),
    );
  });

  it("paints every empty box destructive under invalid, and a selected one on its accent", () => {
    const element = render({ invalid: true, selectAll: "All channels" });
    // The parent is mixed (one of two selected) and keeps its accent, like a
    // chosen radio; the unselected option takes the error border.
    expect(expectSome(hostStyleString(box(element, 0), "borderColor"))).toBe(
      testTheme.colors.primary,
    );
    expect(expectSome(hostStyleString(box(element, 1), "borderColor"))).toBe(
      testTheme.colors.primary,
    );
    expect(expectSome(hostStyleString(box(element, 2), "borderColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("paints the ring on the focused row's box", () => {
    const element = render({}, [], {
      ...groupFocus,
      focusedIndex: Option.some(1),
    });
    expect(hostStyle(box(element, 0), "boxShadow")).toStrictEqual(
      Option.none(),
    );
    expect(Option.isSome(hostStyle(box(element, 1), "boxShadow"))).toBe(true);
  });

  it("paints no ring on a focused row that cannot act", () => {
    // Plan 332: `disabled` can arrive while a row still holds native focus.
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      [],
      { ...groupFocus, focusedIndex: Option.some(1) },
    );
    expect(hostStyle(box(element, 1), "boxShadow")).toStrictEqual(
      Option.none(),
    );
    // The enabled row at the same focus still rings, so the case above is the
    // disabled rule and not a lost ring.
    const enabled = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      [],
      { ...groupFocus, focusedIndex: Option.some(0) },
    );
    expect(Option.isSome(hostStyle(box(enabled, 0), "boxShadow"))).toBe(true);
  });

  it("ignores Enter and Space on a row that cannot act", () => {
    // Plan 332: the click path refused a disabled row, the key path did not, so
    // a group disabled while focused still toggled from the keyboard.
    const onToggle = vi.fn();
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      [],
      groupFocus,
      { onToggle, onToggleAll: vi.fn() },
    );
    expectSome(hostHandler(row(element, 1), "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(row(element, 1), "onKeyUp"))(keyEvent("space"));
    expect(onToggle).not.toHaveBeenCalled();
    // The enabled neighbour still reports, so the case above is not vacuous.
    expectSome(hostHandler(row(element, 0), "onKeyDown"))(keyEvent("enter"));
    expect(onToggle).toHaveBeenCalledWith("email");
  });
});
