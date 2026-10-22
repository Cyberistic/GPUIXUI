/**
 * The focus matrix: every focusable Tier 1 control in one table.
 *
 * The guarded defects are the two that only a sweep can catch: a control that
 * declares a focus ring but keeps a tab stop while disabled, and a new focusable
 * part that lands without a ring at all. Each row states how many tab stops the
 * control owes at rest; the renderer is then asked for the tree with and without
 * `disabled`, and the same two rules are applied to every row:
 *
 * - **rest**: exactly the stated number of tab stops, and at least one element
 *   declares the keyboard outline (`focusVisible`);
 * - **disabled**: no tab stop and no outline anywhere in the tree.
 *
 * `Select` is absent on purpose: its trigger and items are GPUix's own
 * components, so this element tree never contains their host nodes; its ring and
 * tab behaviour are pinned in `Select.test.tsx` and the runtime suite.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderCheckboxGroup } from "./CheckboxGroup.js";
import { renderIconButton } from "./IconButton.js";
import { renderInput } from "./Input.js";
import { renderNumberField } from "./NumberField.js";
import { renderOtpField } from "./OTPField.js";
import { renderRadioGroup } from "./RadioGroup.js";
import { renderRating } from "./Rating.js";
import { renderRangeSlider, renderSlider } from "./Slider.js";
import { renderSwitch } from "./Switch.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import { renderToggleGroup } from "./ToggleGroup.js";
import type { FocusState } from "./internal.js";
import {
  elementChildren,
  hostProp,
  hostStyleRecord,
  hostTag,
} from "./testing/element.js";

const noop = (): void => {};

const focus = (): FocusState => ({
  focused: false,
  onFocus: noop,
  onBlur: noop,
});

const boolean = () => initValueState(Option.none(), false);
const text = () => initValueState(Option.none(), "");
const count = () => initValueState(Option.some(1), 0);
const rating = () => initValueState(Option.some(3), 0);
const slider = () => initValueState(Option.some(40), 0);
const span = () =>
  initValueState<readonly [number, number]>(Option.some([20, 60] as const), [
    0, 100,
  ] as const);
const selected = () => initValueState(Option.some("a"), "");

/** A control in the matrix. */
interface Row {
  readonly name: string;
  /** Tab stops the control owes while enabled. */
  readonly stops: number;
  readonly render: (disabled: boolean) => ReactElement;
}

const ROWS: ReadonlyArray<Row> = [
  {
    name: "Button",
    stops: 1,
    render: (disabled) =>
      renderButton({ disabled, onActivate: noop }, testTheme, focus()),
  },
  {
    name: "IconButton",
    stops: 1,
    render: (disabled) =>
      renderIconButton(
        { disabled, label: "Delete", icon: null, onActivate: noop },
        testTheme,
        focus(),
      ),
  },
  {
    name: "Toggle",
    stops: 1,
    render: (disabled) =>
      renderToggle(
        { disabled, onPressedChange: noop },
        testTheme,
        boolean(),
        focus(),
        noop,
      ),
  },
  {
    name: "Checkbox",
    stops: 1,
    render: (disabled) =>
      renderCheckbox({ disabled }, testTheme, boolean(), focus(), noop),
  },
  {
    name: "Switch",
    stops: 1,
    render: (disabled) =>
      renderSwitch({ disabled }, testTheme, boolean(), focus(), noop),
  },
  {
    name: "CheckboxGroup",
    stops: 1,
    render: (disabled) =>
      renderCheckboxGroup(
        {
          disabled,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        testTheme,
        [],
        Option.none(),
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        {
          onToggle: noop,
          onFocusMove: noop,
          registerItem: () => () => {},
        },
      ),
  },
  {
    name: "ToggleGroup",
    stops: 1,
    render: (disabled) =>
      renderToggleGroup(
        {
          disabled,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        testTheme,
        [],
        Option.none(),
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        {
          onToggle: noop,
          onFocusMove: noop,
          registerItem: () => () => {},
        },
      ),
  },
  {
    name: "RadioGroup",
    stops: 1,
    render: (disabled) =>
      renderRadioGroup(
        {
          disabled,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        testTheme,
        selected(),
        0,
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        {
          onSelect: noop,
          onFocusMove: noop,
          registerItem: () => () => {},
        },
      ),
  },
  {
    name: "Rating",
    stops: 1,
    render: (disabled) =>
      renderRating(
        { disabled },
        testTheme,
        rating(),
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        { onSelect: noop, onMove: noop, registerItem: () => () => {} },
      ),
  },
  {
    name: "Slider",
    stops: 1,
    render: (disabled) =>
      renderSlider({ disabled }, testTheme, slider(), focus(), {
        onValueChange: noop,
        registerTrack: noop,
        onPointerDown: noop,
        onPointerMove: noop,
        onPointerUp: noop,
      }),
  },
  {
    name: "RangeSlider",
    stops: 2,
    render: (disabled) =>
      renderRangeSlider(
        { disabled },
        testTheme,
        span(),
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        {
          onSpanChange: noop,
          registerTrack: noop,
          registerThumb: () => () => {},
          onPointerDown: noop,
          onPointerMove: noop,
          onPointerUp: noop,
        },
      ),
  },
  {
    name: "Input",
    stops: 1,
    render: (disabled) =>
      renderInput({ disabled }, testTheme, text(), focus(), noop),
  },
  {
    name: "TextArea",
    stops: 1,
    render: (disabled) =>
      renderTextArea({ disabled }, testTheme, text(), focus(), noop),
  },
  {
    name: "NumberField",
    stops: 1,
    render: (disabled) =>
      renderNumberField({ disabled }, testTheme, count(), "1", focus(), {
        onTextChange: noop,
        onCommit: noop,
        onValue: noop,
        registerInput: noop,
      }),
  },
  {
    name: "OTPField",
    stops: 1,
    render: (disabled) =>
      renderOtpField(
        { disabled },
        testTheme,
        text(),
        { focusedIndex: Option.none(), onFocus: noop, onBlur: noop },
        {
          onEdit: noop,
          onKey: noop,
          onPick: noop,
          registerCell: () => () => {},
        },
      ),
  },
];

/** Every element in the tree, host or component, depth first. */
const flatten = (element: ReactElement): ReadonlyArray<ReactElement> => [
  element,
  ...Arr.flatMap(elementChildren(element), flatten),
];

const tabIndexOf = (element: ReactElement): Option.Option<number> =>
  Option.flatMap(
    hostProp(element, "tabIndex"),
    Schema.decodeUnknownOption(Schema.Number),
  );

/**
 * Whether the runtime would put the element in the Tab order.
 *
 * Two conventions are in use: a `div` states `tabIndex={0}`, and a native field
 * leaves the prop out and is focusable by default; `-1` takes either out of the
 * tab order while keeping programmatic focus, which is what a disabled field
 * does.
 */
const isTabStop = (element: ReactElement): boolean =>
  Option.match(tabIndexOf(element), {
    onSome: (index) => index === 0,
    onNone: () =>
      Option.match(hostTag(element), {
        onSome: (tag) => tag === "input" || tag === "textarea",
        onNone: () => false,
      }),
  });

/** Whether the element declares the keyboard outline at rest. */
const declaresRing = (element: ReactElement): boolean =>
  Option.match(hostStyleRecord(element), {
    onSome: (style) => style["focusVisible"] !== undefined,
    onNone: () => false,
  });

const stops = (element: ReactElement): number =>
  Arr.filter(flatten(element), isTabStop).length;

const rings = (element: ReactElement): number =>
  Arr.filter(flatten(element), declaresRing).length;

describe.each(ROWS)("$name", ({ stops: owed, render }) => {
  it(`is ${owed} tab stop${owed === 1 ? "" : "s"} and declares a ring at rest`, () => {
    const element = render(false);
    expect(stops(element)).toBe(owed);
    expect(rings(element)).toBeGreaterThanOrEqual(1);
  });

  it("leaves the tab order and paints no ring while disabled", () => {
    const element = render(true);
    expect(stops(element)).toBe(0);
    expect(rings(element)).toBe(0);
  });
});
