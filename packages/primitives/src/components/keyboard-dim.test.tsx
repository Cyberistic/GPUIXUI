/**
 * Which primitives opt out of the runtime's keyboard dim.
 *
 * While one element has keyboard focus, `@gpuix/native@0.11.0` fades **every
 * other focusable element** to `keyboardFocusDimOpacity` (40%) — the
 * where-can-Tab-go cue measured by the `keyboard-focus-dim` probe and by
 * `keyboardDimFailures` in `@gpuixui/tokens`. The bug this suite guards is that
 * the cue was applied to text the reader is reading: a field's value and its
 * placeholder are content, not chrome, and a 40% composite over the field's own
 * fill is what makes them unreadable. The fields declare
 * `keyboardFocusDim: false`; a control whose content is not a value (a toggle,
 * a slider) keeps the cue, so the opt-out cannot quietly become the rule.
 *
 * The opt-back direction matters too: `keyboardFocusDim` is an ordinary style
 * property, and a caller's `style` merges last, so an application that wants the
 * cue on a field can still ask for it.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { fieldVariant } from "../core/variants.js";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderInput } from "./Input.js";
import { renderNumberField } from "./NumberField.js";
import { renderOtpField } from "./OTPField.js";
import { selectTriggerStyle } from "./Select.js";
import { renderSlider } from "./Slider.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import type { FocusState } from "./internal.js";
import {
  elementChildren,
  expectSome,
  hostStyle,
  hostTag,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

const text = (value: string) => initValueState(Option.some(value), "");

/** Every host element in the tree, depth first. */
const hosts = (element: ReactElement): ReadonlyArray<ReactElement> => [
  ...(Option.isSome(hostTag(element)) ? [element] : []),
  ...elementChildren(element).flatMap(hosts),
];

/** The host elements whose tag names a native text field. */
const fields = (element: ReactElement): ReadonlyArray<ReactElement> =>
  hosts(element).filter((host) =>
    Option.match(hostTag(host), {
      onSome: (tag) => tag === "input" || tag === "textarea",
      onNone: () => false,
    }),
  );

/** The dim declaration an element carries: `none` means the cue stays on. */
const dim = (element: ReactElement): Option.Option<boolean> =>
  Option.flatMap(
    hostStyle(element, "keyboardFocusDim"),
    Schema.decodeUnknownOption(Schema.Boolean),
  );

describe("a field keeps its own content lit", () => {
  it("opts an Input's value and placeholder out of the dim", () => {
    const input = renderInput({}, testTheme, text("hello"), idle, vi.fn());
    expect(dim(input)).toStrictEqual(Option.some(false));
  });

  it("opts a TextArea out through the shared field chrome", () => {
    const area = renderTextArea({}, testTheme, text("a"), idle, vi.fn());
    expect(dim(area)).toStrictEqual(Option.some(false));
  });

  it("opts a NumberField's input out, on the element that holds focus", () => {
    const field = renderNumberField(
      {},
      testTheme,
      initValueState(Option.some(1), 0),
      "1",
      idle,
      {
        onTextChange: vi.fn(),
        onCommit: vi.fn(),
        onValue: vi.fn(),
        registerInput: vi.fn(),
      },
    );
    const [input] = fields(field);
    expect(
      dim(input ?? expect.fail("the number field drew no input")),
    ).toStrictEqual(Option.some(false));
  });

  it("opts every OTP cell out, since each cell holds a digit", () => {
    const field = renderOtpField(
      { length: 4 },
      testTheme,
      text("1234"),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      {
        onEdit: vi.fn(),
        onKey: vi.fn(),
        onPick: vi.fn(),
        registerCell: () => () => {},
      },
    );
    const cells = fields(field);
    expect(cells).toHaveLength(4);
    cells.forEach((cell) =>
      expect(dim(cell)).toStrictEqual(Option.some(false)),
    );
  });

  it("opts a Select's trigger out, because it shows the chosen value", () => {
    const trigger = selectTriggerStyle(
      { variant: fieldVariant, size: "md" },
      testTheme,
    )({ open: false, disabled: false, placeholder: false });
    expect(trigger.keyboardFocusDim).toBe(false);
  });

  it("lets a caller's style put the dim back on a field", () => {
    const element = renderInput(
      { style: { keyboardFocusDim: true } },
      testTheme,
      text("hello"),
      idle,
      vi.fn(),
    );
    expect(expectSome(dim(element))).toBe(true);
  });
});

describe("a control whose content is not a value keeps the cue", () => {
  it("leaves a Toggle dimmed", () => {
    const element = renderToggle(
      {},
      testTheme,
      initValueState(Option.some(false), false),
      idle,
      vi.fn(),
    );
    expect(hosts(element).map(dim)).not.toContainEqual(Option.some(false));
  });

  it("leaves a Slider dimmed", () => {
    const element = renderSlider(
      {},
      testTheme,
      initValueState(Option.some(40), 0),
      idle,
      {
        onValueChange: vi.fn(),
        registerTrack: vi.fn(),
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
      },
    );
    expect(hosts(element).map(dim)).not.toContainEqual(Option.some(false));
  });
});
