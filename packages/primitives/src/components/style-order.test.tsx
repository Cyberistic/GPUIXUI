/**
 * A caller's `style` wins last, on every part that takes one (plan 097).
 *
 * The defect this suite guards: two parts re-applied their own layout **after**
 * the merge — `Progress` forced `display`/`flexDirection` over the caller's
 * style, and `TextArea` re-based `height`/padding after `fieldChrome` had
 * already resolved it — so the documented rule (`docs/component-api.md` §3,
 * `COMPONENTS.md`) was false for them, and a fixed-height composer painted one
 * row. The guard walks the whole element tree of every `render*` that takes a
 * `style` prop and requires a caller's property to survive on some painted
 * element, so the next re-base cannot hide in one component.
 *
 * Out of scope because they take no `style` prop of their own: `IconButton`
 * (forwards to `Button`), `InfoTip` and `Tooltip` (style their content from the
 * theme).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderBox } from "./Box.js";
import { renderButton } from "./Button.js";
import { renderButtonGroup } from "./ButtonGroup.js";
import { renderCheckbox } from "./Checkbox.js";
import {
  renderCheckboxGroup,
  type CheckboxGroupHandlers,
} from "./CheckboxGroup.js";
import { renderInput } from "./Input.js";
import { renderLabel } from "./Label.js";
import { renderMeter } from "./Meter.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import { renderOtpField, type OTPFieldHandlers } from "./OTPField.js";
import { renderProgress } from "./Progress.js";
import { renderRadioGroup, type RadioGroupHandlers } from "./RadioGroup.js";
import { renderRating, type RatingHandlers } from "./Rating.js";
import { renderScrollArea } from "./ScrollArea.js";
import { renderSelect, type SelectHandlers } from "./Select.js";
import { renderSeparator, renderSpacer } from "./Separator.js";
import { renderSkeleton } from "./Skeleton.js";
import {
  renderRangeSlider,
  renderSlider,
  type RangeSliderHandlers,
  type SliderHandlers,
} from "./Slider.js";
import { renderSpinner } from "./Spinner.js";
import { renderGrid, renderStack } from "./Stack.js";
import { renderSwitch } from "./Switch.js";
import { renderText } from "./Text.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import { renderToggleGroup, type ToggleGroupHandlers } from "./ToggleGroup.js";
import type { FocusState } from "./internal.js";
import { elementChildren, elementProp, hostStyle } from "./testing/element.js";

/** The two properties every case must carry, whatever else it declares. */
const SENTINELS: StyleDesc = { backgroundColor: "#010203", height: 77 };

const UNIVERSAL_KEYS: ReadonlyArray<keyof StyleDesc> = [
  "backgroundColor",
  "height",
];

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

const groupFocus = {
  focusedIndex: Option.none<number>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const rangeFocus = {
  focusedIndex: Option.none<0 | 1>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const option = (value: string) => ({ value, label: value.toUpperCase() });

const textState = (value: string) => initValueState(Option.some(value), "");

const arrayState = (value: ReadonlyArray<string>) =>
  initValueState(Option.some(value), []);

const booleanState = (value: boolean) =>
  initValueState(Option.some(value), false);

const numberState = (value: number) => initValueState(Option.some(value), 0);

const spanState = (value: readonly [number, number]) =>
  initValueState(Option.some(value), [0, 100] as const);

const numberHandlers = (): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onBlurCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
});

const checkboxGroupHandlers = (): CheckboxGroupHandlers => ({
  onToggle: vi.fn(),
  onToggleAll: vi.fn(),
});

const radioGroupHandlers = (): RadioGroupHandlers => ({
  onSelect: vi.fn(),
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

const toggleGroupHandlers = (): ToggleGroupHandlers => ({
  onPress: vi.fn(),
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

const ratingHandlers = (): RatingHandlers => ({
  onSelect: vi.fn(),
  onMove: vi.fn(),
  registerItem: () => () => {},
});

const otpHandlers = (): OTPFieldHandlers => ({
  onEdit: vi.fn(),
  onKey: vi.fn(),
  onPick: vi.fn(),
  registerCell: () => () => {},
});

const selectHandlers = (): SelectHandlers => ({
  onOpenChange: vi.fn(),
  onValueChange: vi.fn(),
  registerTrigger: () => {},
  registerContent: () => {},
  registerItem: () => () => {},
  onHighlight: vi.fn(),
});

const sliderHandlers = (): SliderHandlers => ({
  onValueChange: vi.fn(),
  onCommit: vi.fn(),
  registerTrack: () => {},
  onPointerDown: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
});

const rangeHandlers = (): RangeSliderHandlers => ({
  onSpanChange: vi.fn(),
  onSpanCommit: vi.fn(),
  registerTrack: () => {},
  registerThumb: () => () => {},
  onPointerDown: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
});

interface Guard {
  readonly name: string;
  /** Renders with the caller's style; `{}` is a caller who sets nothing. */
  readonly render: (style: StyleDesc) => ReactElement;
  /** Properties this part used to re-apply after the merge. */
  readonly extra?: StyleDesc;
  readonly extraKeys?: ReadonlyArray<keyof StyleDesc>;
}

const GUARDS: ReadonlyArray<Guard> = [
  {
    name: "Box",
    render: (style) => renderBox({ tone: "none", style }, testTheme),
  },
  {
    name: "Stack",
    render: (style) => renderStack({ direction: "column", style }, testTheme),
  },
  {
    name: "Grid",
    render: (style) => renderGrid({ columns: 2, style }, testTheme),
  },
  {
    name: "Separator (plain)",
    render: (style) =>
      renderSeparator({ orientation: "horizontal", style }, testTheme),
  },
  {
    name: "Separator (labelled)",
    render: (style) =>
      renderSeparator(
        { orientation: "horizontal", label: "or", style },
        testTheme,
      ),
  },
  { name: "Spacer", render: (style) => renderSpacer({ style }, testTheme) },
  {
    name: "ScrollArea",
    render: (style) => renderScrollArea({ axis: "vertical", style }, testTheme),
  },
  { name: "Text", render: (style) => renderText({ style }, testTheme) },
  {
    name: "Button",
    render: (style) => renderButton({ style }, testTheme, { focused: false }),
  },
  {
    name: "ButtonGroup",
    render: (style) => renderButtonGroup({ style }, testTheme),
  },
  {
    name: "Checkbox",
    render: (style) =>
      renderCheckbox({ style }, testTheme, booleanState(false), idle, vi.fn()),
  },
  {
    name: "CheckboxGroup",
    render: (style) =>
      renderCheckboxGroup(
        { options: [option("alpha")], style },
        testTheme,
        arrayState([]),
        groupFocus,
        checkboxGroupHandlers(),
      ),
  },
  {
    name: "RadioGroup",
    render: (style) =>
      renderRadioGroup(
        { options: [option("alpha")], style },
        testTheme,
        textState(""),
        0,
        groupFocus,
        radioGroupHandlers(),
      ),
  },
  {
    name: "Switch",
    render: (style) =>
      renderSwitch({ style }, testTheme, booleanState(false), idle, vi.fn()),
  },
  {
    name: "Input",
    render: (style) =>
      renderInput({ style }, testTheme, textState(""), idle, vi.fn()),
  },
  {
    name: "TextArea",
    render: (style) =>
      renderTextArea({ style }, testTheme, textState(""), idle, vi.fn()),
  },
  {
    name: "NumberField",
    render: (style) =>
      renderNumberField(
        { style },
        testTheme,
        numberState(2),
        "2",
        idle,
        numberHandlers(),
      ),
  },
  {
    name: "OTPField",
    render: (style) =>
      renderOtpField(
        { length: 3, style },
        testTheme,
        textState(""),
        groupFocus,
        otpHandlers(),
      ),
  },
  {
    name: "Select",
    render: (style) =>
      renderSelect(
        { options: [], style },
        testTheme,
        textState(""),
        false,
        idle,
        selectHandlers(),
      ),
  },
  {
    name: "Progress",
    render: (style) => renderProgress({ value: 40, style }, testTheme, 0),
    extra: { display: "block", flexDirection: "column" },
    extraKeys: ["display", "flexDirection"],
  },
  {
    name: "Meter",
    render: (style) => renderMeter({ value: 40, style }, testTheme),
  },
  {
    name: "Skeleton",
    render: (style) => renderSkeleton({ style }, testTheme, 0),
  },
  {
    name: "Spinner",
    render: (style) => renderSpinner({ style }, testTheme, 0),
  },
  {
    name: "Slider",
    render: (style) =>
      renderSlider(
        { style },
        testTheme,
        numberState(50),
        idle,
        sliderHandlers(),
      ),
  },
  {
    name: "RangeSlider",
    render: (style) =>
      renderRangeSlider(
        { style },
        testTheme,
        spanState([20, 80]),
        rangeFocus,
        rangeHandlers(),
      ),
  },
  {
    name: "Rating",
    render: (style) =>
      renderRating(
        { style },
        testTheme,
        numberState(2),
        groupFocus,
        { preview: Option.none(), onEnter: vi.fn(), onLeave: vi.fn() },
        ratingHandlers(),
      ),
  },
  {
    name: "Toggle",
    render: (style) =>
      renderToggle({ style }, testTheme, booleanState(false), idle, vi.fn()),
  },
  {
    name: "ToggleGroup",
    render: (style) =>
      renderToggleGroup(
        { type: "multiple", options: [option("bold")], style },
        testTheme,
        arrayState([]),
        0,
        groupFocus,
        toggleGroupHandlers(),
      ),
  },
  {
    name: "Label",
    render: (style) => renderLabel({ style, children: "Email" }),
  },
];

const styleOf = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(
    elementProp(element, "style"),
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown)),
  );

/** Every resolved `style` in a tree — host or composed component. */
const paintedStyles = (
  element: ReactElement,
): ReadonlyArray<Record<string, unknown>> =>
  Arr.appendAll(
    Option.match(styleOf(element), {
      onNone: () => Arr.empty<Record<string, unknown>>(),
      onSome: (record) => [record],
    }),
    Arr.flatMap(elementChildren(element), paintedStyles),
  );

const sentinelsOf = (guard: Guard): StyleDesc => ({
  ...SENTINELS,
  ...guard.extra,
});

/** The keys to check: the universal pair plus a part's own extra properties. */
const keysOf = (guard: Guard): ReadonlyArray<keyof StyleDesc> => [
  ...UNIVERSAL_KEYS,
  ...(guard.extraKeys ?? []),
];

const valuesOf = (
  styles: ReadonlyArray<Record<string, unknown>>,
  name: keyof StyleDesc,
): ReadonlyArray<unknown> =>
  Arr.getSomes(Arr.map(styles, (style) => Option.fromNullishOr(style[name])));

describe("a caller's style wins last", () => {
  it.each(GUARDS)("$name paints every caller property", (guard) => {
    const sentinels = sentinelsOf(guard);
    const styles = paintedStyles(guard.render(sentinels));
    Arr.forEach(keysOf(guard), (name) => {
      expect(valuesOf(styles, name), `${name} did not survive`).toContain(
        sentinels[name],
      );
    });
  });

  it.each(GUARDS)("$name does not paint a sentinel on its own", (guard) => {
    const sentinels = sentinelsOf(guard);
    const styles = paintedStyles(guard.render({}));
    Arr.forEach(keysOf(guard), (name) => {
      expect(valuesOf(styles, name), `${name} is a base value`).not.toContain(
        sentinels[name],
      );
    });
  });
});

describe("TextArea's row re-base", () => {
  const render = (style: StyleDesc = {}): ReactElement =>
    renderTextArea({ style }, testTheme, textState(""), idle, vi.fn());

  it("honours a caller's height over the row model", () => {
    expect(hostStyle(render({ height: 120 }), "height")).toStrictEqual(
      Option.some(120),
    );
  });

  it("leaves the height to the rows when the caller sets none", () => {
    expect(hostStyle(render(), "height")).toStrictEqual(Option.none());
  });
});
