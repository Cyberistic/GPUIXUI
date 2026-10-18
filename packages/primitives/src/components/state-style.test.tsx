/**
 * State-aware `style` (plans 079, 080).
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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton, type ButtonState } from "./Button.js";
import {
  renderCheckboxGroup,
  type CheckboxGroupHandlers,
  type CheckboxGroupState,
  type CheckboxRowState,
} from "./CheckboxGroup.js";
import { renderCheckbox, type CheckboxState } from "./Checkbox.js";
import { fieldChrome, type FieldState } from "./Input.js";
import { renderLabel, type LabelState } from "./Label.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import {
  renderOtpField,
  type OTPCellState,
  type OTPFieldHandlers,
  type OTPFieldState,
} from "./OTPField.js";
import {
  renderRadioGroup,
  type RadioGroupHandlers,
  type RadioGroupState,
  type RadioOptionState,
} from "./RadioGroup.js";
import {
  renderRating,
  type RatingHandlers,
  type RatingHover,
  type RatingStarState,
  type RatingState,
} from "./Rating.js";
import { renderScrollArea, type ScrollAreaState } from "./ScrollArea.js";
import {
  renderSelect,
  selectTriggerPartStyle,
  type SelectHandlers,
  type SelectState,
  type SelectTriggerState,
} from "./Select.js";
import {
  renderRangeSlider,
  renderSlider,
  type RangeSliderHandlers,
  type RangeSliderState,
  type RangeSliderThumbState,
  type SliderHandlers,
  type SliderState,
  type SliderThumbState,
} from "./Slider.js";
import { renderSwitch, type SwitchState } from "./Switch.js";
import { renderToggle, type ToggleState } from "./Toggle.js";
import {
  renderToggleGroup,
  type ToggleGroupHandlers,
  type ToggleGroupState,
  type ToggleItemState,
} from "./ToggleGroup.js";
import { fieldVariant } from "../core/variants.js";
import type { FocusState, StateStyle } from "./internal.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostStyleString,
} from "./testing/element.js";

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

/** A component root's resolved style (Stack, the GPUix Select root). */
const componentStyle = (element: ReactElement): Record<string, unknown> =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
      expectSome(elementProp(element, "style")),
    ),
  );

const componentBackground = (element: ReactElement): unknown =>
  componentStyle(element)["backgroundColor"];

const groupFocus = {
  focusedIndex: Option.none<number>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const noPreview: RatingHover = {
  preview: Option.none(),
  onEnter: vi.fn(),
  onLeave: vi.fn(),
};

const rangeFocus = {
  focusedIndex: Option.none<0 | 1>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const option = (value: string) => ({ value, label: value.toUpperCase() });

const arrayState = (value: ReadonlyArray<string>) =>
  initValueState(Option.some(value), []);

const textState = (value: string) => initValueState(Option.some(value), "");

const noFocus = { focused: false, onFocus: () => {}, onBlur: () => {} };

const spanState = (value: readonly [number, number]) =>
  initValueState(Option.some(value), [0, 100] as const);

describe("group roots and overlays", () => {
  it("CheckboxGroup reports disabled and invalid on its box", () => {
    const record = recorder<CheckboxGroupState>();
    const handlers: CheckboxGroupHandlers = {
      onToggle: vi.fn(),
      onToggleAll: vi.fn(),
    };
    const element = renderCheckboxGroup(
      {
        options: [option("alpha")],
        style: record.style,
        disabled: true,
        invalid: true,
      },
      testTheme,
      arrayState([]),
      groupFocus,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });

  it("RadioGroup reports disabled and invalid on its box", () => {
    const record = recorder<RadioGroupState>();
    const handlers: RadioGroupHandlers = {
      onSelect: vi.fn(),
      onFocusMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderRadioGroup(
      {
        options: [option("alpha")],
        style: record.style,
        disabled: true,
        invalid: true,
      },
      testTheme,
      textState("alpha"),
      0,
      groupFocus,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });

  it("ToggleGroup reports its disabled state on the group", () => {
    const record = recorder<ToggleGroupState>();
    const handlers: ToggleGroupHandlers = {
      onPress: vi.fn(),
      onFocusMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderToggleGroup(
      {
        type: "multiple",
        options: [option("bold")],
        style: record.style,
        disabled: true,
      },
      testTheme,
      arrayState([]),
      0,
      groupFocus,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({ disabled: true });
    expect(background(element)).toBe(PAINT);
  });

  it("Rating reports disabled and invalid on its box", () => {
    const record = recorder<RatingState>();
    const handlers: RatingHandlers = {
      onSelect: vi.fn(),
      onMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderRating(
      { style: record.style, disabled: true, invalid: true },
      testTheme,
      initValueState(Option.some(3), 0),
      groupFocus,
      noPreview,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });

  it("OTPField reports disabled and invalid on the group", () => {
    const record = recorder<OTPFieldState>();
    const handlers: OTPFieldHandlers = {
      onEdit: vi.fn(),
      onKey: vi.fn(),
      onPick: vi.fn(),
      registerCell: () => () => {},
    };
    const element = renderOtpField(
      { style: record.style, disabled: true, invalid: true },
      testTheme,
      textState(""),
      groupFocus,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(background(element)).toBe(PAINT);
  });

  it("Slider and RangeSlider report disabled and invalid on the track", () => {
    const slider = recorder<SliderState>();
    const range = recorder<RangeSliderState>();
    const sliderHandlers: SliderHandlers = {
      onValueChange: vi.fn(),
      registerTrack: () => {},
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const rangeHandlers: RangeSliderHandlers = {
      onSpanChange: vi.fn(),
      registerTrack: () => {},
      registerThumb: () => () => {},
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const sliderElement = renderSlider(
      { style: slider.style, disabled: true, invalid: true },
      testTheme,
      initValueState(Option.some(50), 0),
      idle,
      sliderHandlers,
    );
    const rangeElement = renderRangeSlider(
      { style: range.style, disabled: true, invalid: true },
      testTheme,
      spanState([20, 80]),
      rangeFocus,
      rangeHandlers,
    );
    expect(lastState(slider.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(lastState(range.seen)).toStrictEqual({
      disabled: true,
      invalid: true,
    });
    expect(background(sliderElement)).toBe(PAINT);
    expect(background(rangeElement)).toBe(PAINT);
  });

  it("Label reports its invalid state on the stack", () => {
    const record = recorder<LabelState>();
    const element = renderLabel({ style: record.style, invalid: true });
    expect(lastState(record.seen)).toStrictEqual({ invalid: true });
    expect(componentBackground(element)).toBe(PAINT);
  });

  it("ScrollArea reports focus only for a labelled, focused area", () => {
    const record = recorder<ScrollAreaState>();
    const element = renderScrollArea(
      { style: record.style, axis: "vertical", label: "Files" },
      testTheme,
      { focused: true },
    );
    expect(lastState(record.seen)).toStrictEqual({ focused: true });
    expect(background(element)).toBe(PAINT);

    const inert = recorder<ScrollAreaState>();
    renderScrollArea({ style: inert.style, axis: "vertical" }, testTheme, {
      focused: true,
    });
    expect(lastState(inert.seen)).toStrictEqual({ focused: false });
  });

  it("Select reports open, disabled and invalid on its root", () => {
    const record = recorder<SelectState>();
    const handlers: SelectHandlers = {
      onOpenChange: vi.fn(),
      onValueChange: vi.fn(),
      registerTrigger: () => {},
      registerItem: () => () => {},
      onHighlight: vi.fn(),
    };
    const element = renderSelect(
      { options: [], style: record.style, disabled: true, invalid: true },
      testTheme,
      textState(""),
      true,
      noFocus,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      open: true,
      disabled: true,
      invalid: true,
    });
    expect(componentBackground(element)).toBe(PAINT);
  });
});

describe("per-item style", () => {
  const painted = (element: ReactElement): string =>
    expectSome(hostStyleString(element, "backgroundColor"));

  it("CheckboxGroup gives each row its own value, index and tri-state", () => {
    const record = recorder<CheckboxRowState>();
    const handlers: CheckboxGroupHandlers = {
      onToggle: vi.fn(),
      onToggleAll: vi.fn(),
    };
    const element = renderCheckboxGroup(
      {
        options: [option("alpha"), option("beta")],
        selectAll: "All",
        rowStyle: record.style,
      },
      testTheme,
      arrayState(["alpha"]),
      groupFocus,
      handlers,
    );
    expect(record.seen).toStrictEqual([
      {
        value: Option.none(),
        index: 0,
        parent: true,
        selection: "indeterminate",
        disabled: false,
        focused: false,
        invalid: false,
      },
      {
        value: Option.some("alpha"),
        index: 1,
        parent: false,
        selection: "checked",
        disabled: false,
        focused: false,
        invalid: false,
      },
      {
        value: Option.some("beta"),
        index: 2,
        parent: false,
        selection: "unchecked",
        disabled: false,
        focused: false,
        invalid: false,
      },
    ]);
    expect(Arr.map(elementChildren(element), painted)).toStrictEqual([
      PAINT,
      PAINT,
      PAINT,
    ]);
  });

  it("RadioGroup gives each option its own value, index and checked state", () => {
    const record = recorder<RadioOptionState>();
    const handlers: RadioGroupHandlers = {
      onSelect: vi.fn(),
      onFocusMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderRadioGroup(
      {
        options: [option("alpha"), option("beta")],
        optionStyle: record.style,
      },
      testTheme,
      textState("alpha"),
      0,
      groupFocus,
      handlers,
    );
    expect(record.seen).toStrictEqual([
      {
        value: "alpha",
        index: 0,
        checked: true,
        disabled: false,
        focused: false,
        invalid: false,
      },
      {
        value: "beta",
        index: 1,
        checked: false,
        disabled: false,
        focused: false,
        invalid: false,
      },
    ]);
    expect(Arr.map(elementChildren(element), painted)).toStrictEqual([
      PAINT,
      PAINT,
    ]);
  });

  it("ToggleGroup gives each item its own pressed state", () => {
    const record = recorder<ToggleItemState>();
    const handlers: ToggleGroupHandlers = {
      onPress: vi.fn(),
      onFocusMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderToggleGroup(
      {
        type: "multiple",
        options: [option("bold"), option("italic")],
        itemStyle: record.style,
      },
      testTheme,
      arrayState(["bold"]),
      0,
      groupFocus,
      handlers,
    );
    expect(record.seen).toStrictEqual([
      {
        value: "bold",
        index: 0,
        pressed: true,
        disabled: false,
        focused: false,
      },
      {
        value: "italic",
        index: 1,
        pressed: false,
        disabled: false,
        focused: false,
      },
    ]);
    expect(Arr.map(elementChildren(element), painted)).toStrictEqual([
      PAINT,
      PAINT,
    ]);
  });

  it("Rating gives each star its 1-based index and filled state", () => {
    const record = recorder<RatingStarState>();
    const handlers: RatingHandlers = {
      onSelect: vi.fn(),
      onMove: vi.fn(),
      registerItem: () => () => {},
    };
    const element = renderRating(
      { max: 3, starStyle: record.style },
      testTheme,
      initValueState(Option.some(2), 0),
      groupFocus,
      noPreview,
      handlers,
    );
    expect(record.seen).toStrictEqual([
      {
        index: 1,
        filled: true,
        disabled: false,
        readOnly: false,
        invalid: false,
        focused: false,
      },
      {
        index: 2,
        filled: true,
        disabled: false,
        readOnly: false,
        invalid: false,
        focused: false,
      },
      {
        index: 3,
        filled: false,
        disabled: false,
        readOnly: false,
        invalid: false,
        focused: false,
      },
    ]);
    expect(Arr.map(elementChildren(element), painted)).toStrictEqual([
      PAINT,
      PAINT,
      PAINT,
    ]);
  });

  it("OTPField gives each cell its own index and filled state", () => {
    const record = recorder<OTPCellState>();
    const handlers: OTPFieldHandlers = {
      onEdit: vi.fn(),
      onKey: vi.fn(),
      onPick: vi.fn(),
      registerCell: () => () => {},
    };
    const element = renderOtpField(
      { length: 3, cellStyle: record.style },
      testTheme,
      textState("12"),
      groupFocus,
      handlers,
    );
    expect(record.seen).toStrictEqual([
      {
        index: 0,
        filled: true,
        focused: false,
        disabled: false,
        invalid: false,
      },
      {
        index: 1,
        filled: true,
        focused: false,
        disabled: false,
        invalid: false,
      },
      {
        index: 2,
        filled: false,
        focused: false,
        disabled: false,
        invalid: false,
      },
    ]);
    expect(Arr.map(elementChildren(element), painted)).toStrictEqual([
      PAINT,
      PAINT,
      PAINT,
    ]);
  });

  it("Slider gives its thumb the focus and validation state", () => {
    const record = recorder<SliderThumbState>();
    const handlers: SliderHandlers = {
      onValueChange: vi.fn(),
      registerTrack: () => {},
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const element = renderSlider(
      { thumbStyle: record.style, disabled: true, invalid: true },
      testTheme,
      initValueState(Option.some(50), 0),
      focused,
      handlers,
    );
    expect(lastState(record.seen)).toStrictEqual({
      focused: true,
      disabled: true,
      invalid: true,
    });
    const rail = expectSome(Arr.get(elementChildren(element), 0));
    expect(painted(expectSome(Arr.get(elementChildren(rail), 1)))).toBe(PAINT);
  });

  it("RangeSlider names the end each thumb paints", () => {
    const record = recorder<RangeSliderThumbState>();
    const handlers: RangeSliderHandlers = {
      onSpanChange: vi.fn(),
      registerTrack: () => {},
      registerThumb: () => () => {},
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const element = renderRangeSlider(
      { thumbStyle: record.style },
      testTheme,
      spanState([20, 80]),
      { ...rangeFocus, focusedIndex: Option.some(1) },
      handlers,
    );
    expect(record.seen).toStrictEqual([
      { end: "start", focused: false, disabled: false, invalid: false },
      { end: "end", focused: true, disabled: false, invalid: false },
    ]);
    const rail = expectSome(Arr.get(elementChildren(element), 0));
    expect(
      Arr.map([1, 3], (index) =>
        painted(expectSome(Arr.get(elementChildren(rail), index))),
      ),
    ).toStrictEqual([PAINT, PAINT]);
  });

  it("Select's trigger takes a style over the runtime's trigger state", () => {
    const record = recorder<SelectTriggerState>();
    const paint = selectTriggerPartStyle(
      { variant: fieldVariant, size: "md" },
      testTheme,
      false,
      record.style,
    );
    const style = paint({ open: true, disabled: false, placeholder: false });
    expect(lastState(record.seen)).toStrictEqual({
      open: true,
      disabled: false,
      placeholder: false,
      focused: false,
    });
    expect(style.backgroundColor).toBe(PAINT);
  });
});
