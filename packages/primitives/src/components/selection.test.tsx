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
import { clickEvent, keyEvent } from "./testing/event.js";
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
const text = (value: string): ValueState<string | undefined> =>
  initValueState(Option.some(value), undefined);
/** A radio selection that has never been made. */
const nothing = (): ValueState<string | undefined> =>
  initValueState(Option.none(), undefined);
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

  it("publishes a blank label as absent and trims a real one", () => {
    // Plan 026: a computed empty label must not become an empty name.
    const blank = renderCheckbox(
      { label: "   " },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(hostProp(blank, "aria-label")).toStrictEqual(Option.none());
    const padded = renderCheckbox(
      { label: "  Accept terms  " },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(padded, "aria-label"))).toBe("Accept terms");
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

  it("keeps the destructive border on hover and press while invalid", () => {
    // Plan 356: on an unfilled box the border is the only error cue, and the
    // healthy interaction rule replaced it for the whole gesture.
    const element = renderCheckbox(
      { invalid: true },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const destructive = Option.some({
      borderColor: testTheme.colors.destructive,
    });
    expect(hostStyle(element, "hover")).toStrictEqual(destructive);
    expect(hostStyle(element, "active")).toStrictEqual(destructive);
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

  it("publishes a blank label as absent and trims a real one", () => {
    // Plan 026: the switch has no text child to fall back to, so a blank label
    // must publish no name rather than whitespace.
    const blank = renderSwitch(
      { label: "   " },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(hostProp(blank, "aria-label")).toStrictEqual(Option.none());
    const padded = renderSwitch(
      { label: "  Wifi  " },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(padded, "aria-label"))).toBe("Wifi");
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

  it("keeps the destructive track border on hover and press while invalid", () => {
    // Plan 356: the off track's border is the error cue, and hover/press used to
    // paint the healthy border over it.
    const element = renderSwitch(
      { invalid: true },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const destructive = Option.some({
      borderColor: testTheme.colors.destructive,
    });
    expect(hostStyle(element, "hover")).toStrictEqual(destructive);
    expect(hostStyle(element, "active")).toStrictEqual(destructive);
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

  it("publishes a blank group or option label as absent", () => {
    // Plan 026: both the group's and the option's label are names.
    const element = renderRadioGroup(
      { label: "   ", options: [{ value: "alpha", label: "   " }] },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(hostProp(element, "aria-label")).toStrictEqual(Option.none());
    const option = expectSome(Arr.head(elementChildren(element)));
    expect(hostProp(option, "aria-label")).toStrictEqual(Option.none());
  });

  it("publishes an option description as its accessible description", () => {
    // The bug this guards (plan 500): the caption was painted but the row
    // published no aria-description, because the docs mistook the unsupported
    // `aria-describedby` for the supported `aria-description`.
    const element = renderRadioGroup(
      {
        options: [
          { value: "alpha", label: "Alpha", description: "Every Monday." },
        ],
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const option = expectSome(Arr.head(elementChildren(element)));
    expect(expectSome(hostProp(option, "aria-description"))).toBe(
      "Every Monday.",
    );
  });

  it("publishes a blank option description as absent", () => {
    const element = renderRadioGroup(
      {
        options: [{ value: "alpha", label: "Alpha", description: "   " }],
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const option = expectSome(Arr.head(elementChildren(element)));
    expect(hostProp(option, "aria-description")).toStrictEqual(Option.none());
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

  it("continues an arrow from the focused option, not the deferred value", () => {
    // The bug guarded (plan 359): a controlled parent that does not apply the
    // reported value leaves the ring one option ahead of the tab stop; starting
    // the next move from the tab stop repeated the first move and trapped the
    // keyboard. The focused option is the cursor.
    const onSelect = vi.fn();
    const handlers = radioHandlers(onSelect);
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      { ...unfocused, focusedIndex: Option.some(1) },
      handlers,
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("gamma");
    expect(handlers.onFocusMove).toHaveBeenCalledWith(2);
  });

  it("activates the focused option, not the deferred value", () => {
    // Plan 353's rule, kept in one place with the cursor (plan 359): Space up
    // never re-selects the option the value still names.
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      { ...unfocused, focusedIndex: Option.some(1) },
      radioHandlers(onSelect),
    );
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onSelect).toHaveBeenCalledWith("beta");
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
      nothing(),
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
        undefined,
      ),
    ).toBe(1);
    // An option valued "" is a real choice, not the absence (plan 502).
    expect(initialActiveIndex([{ value: "" }, { value: "a" }], undefined)).toBe(
      0,
    );
    expect(initialActiveIndex([{ value: "a" }, { value: "" }], undefined)).toBe(
      0,
    );
    expect(initialActiveIndex([{ value: "a" }, { value: "" }], "")).toBe(1);
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

  it("paints a radio option valued the empty string as checked", () => {
    // The bug guarded (plan 502): `itemState` excluded `""`, so a "None" option
    // could be chosen and reported but never looked or announced as chosen.
    const element = renderRadioGroup(
      { options: [{ value: "", label: "None" }] },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const item = expectSome(Option.fromNullishOr(elementChildren(element)[0]));
    expect(hostProp(item, "aria-valuetext")).toStrictEqual(
      Option.some("checked"),
    );
  });

  it("keeps the empty-string option unchecked when nothing is selected", () => {
    // The other half: absence is `undefined`, so it cannot check a real `""`.
    const element = renderRadioGroup(
      { options: [{ value: "", label: "None" }] },
      testTheme,
      nothing(),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const item = expectSome(Option.fromNullishOr(elementChildren(element)[0]));
    expect(hostProp(item, "aria-valuetext")).toStrictEqual(
      Option.some("unchecked"),
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
      nothing(),
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

  it("keeps an unanswered circle's error border through hover and press", () => {
    // Plan 356: the circles share `selectionBoxStyle` with the checkbox.
    const element = renderRadioGroup(
      { options, invalid: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const row = expectSome(Arr.get(elementChildren(element), 1));
    const circle = expectSome(Arr.get(elementChildren(row), 0));
    const destructive = Option.some({
      borderColor: testTheme.colors.destructive,
    });
    expect(hostStyle(circle, "hover")).toStrictEqual(destructive);
    expect(hostStyle(circle, "active")).toStrictEqual(destructive);
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

  it("publishes a blank group or row label as absent", () => {
    // Plan 026: the group name and each row's data label follow one rule.
    const element = render({
      label: "   ",
      options: [{ value: "email", label: "   " }],
    });
    expect(hostProp(element, "aria-label")).toStrictEqual(Option.none());
    expect(hostProp(row(element, 0), "aria-label")).toStrictEqual(
      Option.none(),
    );
  });

  it("names each row with its label and describes it with the option text", () => {
    // Plan 500: the visible caption was the only place the description lived,
    // so a screen reader heard the label alone.
    const element = render();
    expect(expectSome(hostProp(row(element, 0), "aria-description"))).toBe(
      "A digest.",
    );
    expect(hostProp(row(element, 1), "aria-description")).toStrictEqual(
      Option.none(),
    );
  });

  it("publishes a blank option description as absent", () => {
    const element = render({
      options: [{ value: "email", label: "Email", description: "   " }],
    });
    expect(hostProp(row(element, 0), "aria-description")).toStrictEqual(
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

  it("keeps an empty row's error border through hover and press", () => {
    // Plan 356: the row's box shares the checkbox painter.
    const element = render({ invalid: true, selectAll: "All channels" });
    const destructive = Option.some({
      borderColor: testTheme.colors.destructive,
    });
    expect(hostStyle(box(element, 2), "hover")).toStrictEqual(destructive);
    expect(hostStyle(box(element, 2), "active")).toStrictEqual(destructive);
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

describe("selection controls as slot triggers", () => {
  it("forwards a slot's handlers and description to a Checkbox", () => {
    // Plan 345: `Tooltip`'s asChild clones handlers onto the child; a component
    // that does not declare them drops the tip entirely. The control's own
    // activation must still run alongside the slot's Escape handler.
    const onMouseEnter = vi.fn();
    const onKeyDown = vi.fn();
    const onValueChange = vi.fn();
    const box = renderCheckbox(
      { onMouseEnter, onKeyDown, "aria-description": "A hint" },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(box, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(box, "onKeyDown"))(keyEvent("enter"));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(expectSome(hostProp(box, "aria-description"))).toBe("A hint");
  });

  it("forwards a slot's handlers and description to a Switch", () => {
    const onMouseEnter = vi.fn();
    const onKeyDown = vi.fn();
    const onValueChange = vi.fn();
    const element = renderSwitch(
      { onMouseEnter, onKeyDown, "aria-description": "A hint" },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(expectSome(hostProp(element, "aria-description"))).toBe("A hint");
  });
});

describe("the row that owns the pointer paints its feedback", () => {
  // Plan 355: `CheckboxGroup` and `RadioGroup` put the role, name, tab stop and
  // both handlers on the row, but only the inner box declared hover/active, so
  // hovering the label column — most of the hit area — painted nothing.
  const wash = (element: ReactElement): unknown =>
    expectSome(hostStyle(element, "hover"));

  it("gives every enabled CheckboxGroup row the theme's wash", () => {
    const element = renderCheckboxGroup(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
        ],
        selectAll: "All channels",
        label: "Channels",
      },
      testTheme,
      initValueState(Option.some([]), []),
      groupFocus,
      groupHandlers(),
    );
    const rows = elementChildren(element);
    expect(Arr.length(rows)).toBe(3);
    Arr.forEach(rows, (row) => {
      expect(wash(row)).toMatchObject({
        backgroundColor: testTheme.colors.hover,
      });
      expect(expectSome(hostStyle(row, "active"))).toMatchObject({
        backgroundColor: testTheme.colors.active,
      });
      // A label stacked over its description aligns to the top of the box.
      expect(expectSome(hostStyleString(row, "alignItems"))).toBe("flex-start");
    });
  });

  it("declares no feedback on a disabled CheckboxGroup row or group", () => {
    const oneDisabled = renderCheckboxGroup(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      testTheme,
      initValueState(Option.some([]), []),
      groupFocus,
      groupHandlers(),
    );
    const disabledRow = expectSome(Arr.get(elementChildren(oneDisabled), 1));
    expect(hostStyle(disabledRow, "hover")).toStrictEqual(Option.none());
    const disabledGroup = renderCheckboxGroup(
      { options: [{ value: "email", label: "Email" }], disabled: true },
      testTheme,
      initValueState(Option.some([]), []),
      groupFocus,
      groupHandlers(),
    );
    expect(
      hostStyle(
        expectSome(Arr.get(elementChildren(disabledGroup), 0)),
        "hover",
      ),
    ).toStrictEqual(Option.none());
  });

  it("lets a caller's rowStyle replace the wash, merged last", () => {
    const element = renderCheckboxGroup(
      {
        options: [{ value: "email", label: "Email" }],
        rowStyle: { hover: { backgroundColor: "#123456" } },
      },
      testTheme,
      initValueState(Option.some([]), []),
      groupFocus,
      groupHandlers(),
    );
    expect(
      wash(expectSome(Arr.get(elementChildren(element), 0))),
    ).toMatchObject({ backgroundColor: "#123456" });
  });

  it("gives every enabled RadioGroup row the theme's wash", () => {
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    Arr.forEach(elementChildren(element), (row) => {
      expect(wash(row)).toMatchObject({
        backgroundColor: testTheme.colors.hover,
      });
      expect(expectSome(hostStyle(row, "active"))).toMatchObject({
        backgroundColor: testTheme.colors.active,
      });
      // The radio's description is a sibling, so the row centres its content.
      expect(expectSome(hostStyleString(row, "alignItems"))).toBe("center");
    });
  });

  it("declares no feedback on a disabled radio option", () => {
    const element = renderRadioGroup(
      {
        options: [
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta", disabled: true },
        ],
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const enabledRow = expectSome(Arr.get(elementChildren(element), 0));
    const disabledRow = expectSome(Arr.get(elementChildren(element), 1));
    expect(wash(enabledRow)).toMatchObject({
      backgroundColor: testTheme.colors.hover,
    });
    expect(hostStyle(disabledRow, "hover")).toStrictEqual(Option.none());
  });

  it("lets a caller's optionStyle replace the wash, merged last", () => {
    const element = renderRadioGroup(
      {
        options: [{ value: "alpha", label: "Alpha" }],
        optionStyle: { hover: { backgroundColor: "#654321" } },
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(
      wash(expectSome(Arr.get(elementChildren(element), 0))),
    ).toMatchObject({ backgroundColor: "#654321" });
  });

  it("shrinks its rows so a horizontal group contains a long label", () => {
    // The bug guarded (plan 380): a horizontal group's row kept the automatic
    // content floor, so it stayed at its max-content width and a long label
    // painted past the group (measured: 492 px outside a 220 px group).
    const element = renderRadioGroup(
      { options, orientation: "horizontal" },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    Arr.forEach(elementChildren(element), (row) => {
      expect(expectSome(hostStyle(row, "minWidth"))).toBe(0);
    });
  });
});
