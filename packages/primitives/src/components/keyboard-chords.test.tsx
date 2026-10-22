/**
 * A shortcut chord is not a control's key.
 *
 * The guarded defect: every control read the key name off `KeyEvent` and
 * ignored `modifiers`, so a chord meant for the platform or the application
 * acted as a plain key. `Cmd+A` on a radio group chose the option whose label
 * starts with "a" (type-ahead), on an OTP cell typed an "a" into the code; a
 * chorded arrow moved a slider, a number field and a scroll region; `Ctrl+Space`
 * activated a focused action. This suite holds the other half of the rule
 * `activation.test.tsx` starts: each reader **ignores** a chord and still
 * answers its plain key, so a fix cannot pass by disabling the control.
 *
 * `activation.test.tsx` covers Enter/Space on the actions; this file covers the
 * arrow, Home/End, type-ahead and typing paths. The scroll region's chord is
 * measured in a window (`runtime/layout.runtime.test.tsx`), because its handler
 * reads the renderer.
 */

import type { ReactElement } from "react";
import type { KeyEvent } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { decideTypeAhead } from "../core/keyboard.js";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderCheckboxGroup } from "./CheckboxGroup.js";
import { renderNumberField } from "./NumberField.js";
import { renderOtpField } from "./OTPField.js";
import { renderRadioGroup } from "./RadioGroup.js";
import {
  renderRangeSlider,
  renderSlider,
  type RangeSliderHandlers,
  type SliderHandlers,
} from "./Slider.js";
import { renderToggleGroup } from "./ToggleGroup.js";
import { keyEvent, keyUpEvent, type KeyEventFixture } from "./testing/event.js";
import { elementChildren, hostHandler } from "./testing/element.js";

type Chord = NonNullable<KeyEvent["modifiers"]>;

const CTRL: Chord = { shift: false, ctrl: true, alt: false, cmd: false };
const CMD: Chord = { shift: false, ctrl: false, alt: false, cmd: true };
const ALT: Chord = { shift: false, ctrl: false, alt: true, cmd: false };

/** Every handler a tree installs for one key channel, in tree order. */
const keyHandlers = (
  element: ReactElement,
  name: "onKeyDown" | "onKeyUp",
): ReadonlyArray<(event: KeyEvent) => void> => {
  const own = Option.match(hostHandler(element, name), {
    onSome: (handler) => [handler],
    onNone: () => [],
  });
  return [
    ...own,
    ...Arr.flatMap(elementChildren(element), (child) =>
      keyHandlers(child, name),
    ),
  ];
};

/** Deliver a key to every handler the tree installs, as the runtime would. */
const send = (
  element: ReactElement,
  name: "onKeyDown" | "onKeyUp",
  event: KeyEventFixture,
): void => {
  Arr.forEach(keyHandlers(element, name), (handler) => handler(event));
};

const idleFocus = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const idleGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

/** The labels a group's type-ahead searches, wired as the components wire it. */
const matcher =
  (labels: ReadonlyArray<string>) => (from: number, key: string) =>
    decideTypeAhead(labels, from, key);

const radioGroup = () => {
  const onSelect = vi.fn();
  const onFocusMove = vi.fn();
  const labels = ["Compact", "Comfortable", "Spacious"];
  const element = renderRadioGroup(
    {
      label: "Density",
      options: Arr.map(labels, (label) => ({
        value: label.toLowerCase(),
        label,
      })),
    },
    testTheme,
    initValueState(Option.some("comfortable"), ""),
    1,
    { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
    {
      onSelect,
      onFocusMove,
      registerItem: () => () => {},
      typeAhead: matcher(labels),
    },
  );
  return { element, onSelect, onFocusMove };
};

const checkboxGroup = () => {
  const onToggle = vi.fn();
  const onFocusMove = vi.fn();
  const labels = ["Email", "Push", "SMS"];
  const element = renderCheckboxGroup(
    {
      label: "Channels",
      options: Arr.map(labels, (label) => ({
        value: label.toLowerCase(),
        label,
      })),
    },
    testTheme,
    [],
    Option.some(0),
    idleGroupFocus,
    {
      onToggle,
      onFocusMove,
      registerItem: () => () => {},
      typeAhead: matcher(labels),
    },
  );
  return { element, onToggle, onFocusMove };
};

const toggleGroup = () => {
  const onToggle = vi.fn();
  const onFocusMove = vi.fn();
  const labels = ["Bold", "Italic", "Underline"];
  const element = renderToggleGroup(
    {
      type: "multiple",
      label: "Format",
      options: Arr.map(labels, (label) => ({
        value: label.toLowerCase(),
        label,
      })),
    },
    testTheme,
    [],
    Option.some(0),
    idleGroupFocus,
    {
      onToggle,
      onFocusMove,
      registerItem: () => () => {},
      typeAhead: matcher(labels),
    },
  );
  return { element, onToggle, onFocusMove };
};

const otpField = () => {
  const onKey = vi.fn();
  const element = renderOtpField(
    { label: "Code", length: 6 },
    testTheme,
    initValueState(Option.some(""), ""),
    { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
    {
      onEdit: vi.fn(),
      onKey,
      onPick: vi.fn(),
      registerCell: () => () => {},
    },
  );
  return { element, onKey };
};

const sliderHandlers = (
  onValueChange: (next: number) => void,
): SliderHandlers => ({
  onValueChange,
  registerTrack: () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

const rangeHandlers = (
  onSpanChange: (next: readonly [number, number]) => void,
): RangeSliderHandlers => ({
  onSpanChange,
  registerTrack: () => {},
  registerThumb: () => () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

const slider = () => {
  const onValueChange = vi.fn();
  const element = renderSlider(
    { value: 42, label: "Volume" },
    testTheme,
    initValueState(Option.some(42), 0),
    idleFocus,
    sliderHandlers(onValueChange),
  );
  return { element, onValueChange };
};

const rangeSlider = () => {
  const onSpanChange = vi.fn();
  const element = renderRangeSlider(
    { label: "Price" },
    testTheme,
    initValueState<readonly [number, number]>(Option.some([20, 60] as const), [
      0, 100,
    ] as const),
    { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
    rangeHandlers(onSpanChange),
  );
  return { element, onSpanChange };
};

const numberField = () => {
  const onValue = vi.fn();
  const element = renderNumberField(
    { label: "Quantity", value: 5 },
    testTheme,
    initValueState(Option.some(5), 0),
    "5",
    idleFocus,
    {
      onTextChange: vi.fn(),
      onCommit: vi.fn(),
      onValue,
      registerInput: () => {},
    },
  );
  return { element, onValue };
};

describe("a chord is not the control's key", () => {
  it("leaves a radio group's arrows, type-ahead and selection alone", () => {
    const { element, onSelect, onFocusMove } = radioGroup();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(element, "onKeyDown", keyEvent("down", { modifiers }));
      send(element, "onKeyDown", keyEvent("s", { modifiers }));
      send(element, "onKeyUp", keyEvent("space", { modifiers }));
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFocusMove).not.toHaveBeenCalled();
    // The plain keys still act: the group is not simply switched off.
    send(element, "onKeyDown", keyEvent("s"));
    expect(onSelect).toHaveBeenLastCalledWith("spacious");
    send(element, "onKeyDown", keyEvent("down"));
    expect(onSelect).toHaveBeenLastCalledWith("spacious");
  });

  it("leaves a checkbox group's focus moves and toggles alone", () => {
    const { element, onToggle, onFocusMove } = checkboxGroup();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(element, "onKeyDown", keyEvent("down", { modifiers }));
      send(element, "onKeyDown", keyEvent("p", { modifiers }));
      send(element, "onKeyUp", keyEvent("space", { modifiers }));
    });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onFocusMove).not.toHaveBeenCalled();
    send(element, "onKeyDown", keyEvent("down"));
    expect(onFocusMove).toHaveBeenLastCalledWith(1);
    send(element, "onKeyUp", keyEvent("space"));
    expect(onToggle).toHaveBeenLastCalledWith("email");
  });

  it("leaves a toggle group's focus moves and presses alone", () => {
    const { element, onToggle, onFocusMove } = toggleGroup();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(element, "onKeyDown", keyEvent("right", { modifiers }));
      send(element, "onKeyDown", keyEvent("u", { modifiers }));
      send(element, "onKeyUp", keyEvent("enter", { modifiers }));
    });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onFocusMove).not.toHaveBeenCalled();
    send(element, "onKeyDown", keyEvent("right"));
    expect(onFocusMove).toHaveBeenLastCalledWith(1);
    send(element, "onKeyDown", keyEvent("enter"));
    expect(onToggle).toHaveBeenLastCalledWith("bold");
  });

  it("does not type a chord into an OTP cell", () => {
    const { element, onKey } = otpField();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(element, "onKeyUp", keyUpEvent("a", { modifiers }));
    });
    expect(onKey).not.toHaveBeenCalled();
    // The tree installs one handler per cell; the runtime dispatches to the
    // focused one, and every cell would read the same typed character.
    send(element, "onKeyUp", keyUpEvent("a"));
    expect(onKey).toHaveBeenCalledWith(0, "a");
  });

  it("does not move a slider or a range with a chorded arrow", () => {
    const one = slider();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(one.element, "onKeyDown", keyEvent("right", { modifiers }));
    });
    expect(one.onValueChange).not.toHaveBeenCalled();
    send(one.element, "onKeyDown", keyEvent("right"));
    expect(one.onValueChange).toHaveBeenLastCalledWith(43);

    const range = rangeSlider();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(range.element, "onKeyDown", keyEvent("right", { modifiers }));
    });
    expect(range.onSpanChange).not.toHaveBeenCalled();
    send(range.element, "onKeyDown", keyEvent("right"));
    expect(range.onSpanChange).toHaveBeenLastCalledWith([20, 61]);
  });

  it("does not step a number field with a chorded arrow", () => {
    const { element, onValue } = numberField();
    Arr.forEach([CTRL, CMD, ALT], (modifiers) => {
      send(element, "onKeyDown", keyEvent("up", { modifiers }));
    });
    expect(onValue).not.toHaveBeenCalled();
    send(element, "onKeyDown", keyEvent("up"));
    expect(onValue).toHaveBeenLastCalledWith(6);
  });
});
