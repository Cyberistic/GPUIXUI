/**
 * The field family's read-only state, in the element tree.
 *
 * The bug guarded (plan `786`): `Input` and `TextArea` accepted `readOnly`, but
 * `NumberField` and `OTPField` had no such state, and `FieldState`,
 * `OTPFieldState`, `OTPCellState` and `RatingState` could not tell a callback
 * that a field was read-only. A read-only field must stay focusable — the state
 * exists so its value can be read, selected and copied — while `disabled` is the
 * stronger state that also leaves the tab order. The native behaviour is proven
 * in `runtime/readonly.runtime.test.tsx`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderInput, type FieldState } from "./Input.js";
import { renderTextArea } from "./TextArea.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import {
  renderOtpField,
  type OTPCellState,
  type OTPFieldHandlers,
  type OTPFieldState,
} from "./OTPField.js";
import {
  renderRating,
  type RatingHandlers,
  type RatingState,
} from "./Rating.js";
import type { FocusState, StateStyle } from "./internal.js";
import { elementChildren, expectSome, hostProp } from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

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

const text = (value: string) => initValueState(Option.some(value), "");

const numberHandlers = (): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onBlurCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
});

const otpHandlers = (): OTPFieldHandlers => ({
  onEdit: vi.fn(),
  onKey: vi.fn(),
  onPick: vi.fn(),
  registerCell: () => () => {},
});

const groupFocus = {
  focusedIndex: Option.none<number>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

describe("a read-only field", () => {
  it("stays focusable and tells Input's style callback it is read-only", () => {
    const record = recorder<FieldState>();
    const element = renderInput(
      { style: record.style, readOnly: true, label: "Total" },
      testTheme,
      text("12"),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "readOnly"))).toBe(true);
    expect(Option.isNone(hostProp(element, "tabIndex"))).toBe(true);
    expect(record.seen).toStrictEqual([
      { disabled: false, readOnly: true, focused: false, invalid: false },
    ]);
  });

  it("separates read-only from disabled in the same state", () => {
    const record = recorder<FieldState>();
    renderInput(
      { style: record.style, disabled: true },
      testTheme,
      text("12"),
      idle,
      vi.fn(),
    );
    expect(record.seen).toStrictEqual([
      { disabled: true, readOnly: false, focused: false, invalid: false },
    ]);
  });

  it("reaches a TextArea's host", () => {
    const element = renderTextArea(
      { readOnly: true, label: "Notes" },
      testTheme,
      text("draft"),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "readOnly"))).toBe(true);
    expect(Option.isNone(hostProp(element, "tabIndex"))).toBe(true);
  });

  it("reaches NumberField's inner host and its chrome state", () => {
    const record = recorder<FieldState>();
    const element = renderNumberField(
      { style: record.style, readOnly: true, label: "Total" },
      testTheme,
      initValueState(Option.some(3), 0),
      "3",
      idle,
      numberHandlers(),
    );
    const input = elementChildren(element)[0];
    if (input === undefined) throw new Error("NumberField painted no input");
    expect(expectSome(hostProp(input, "readOnly"))).toBe(true);
    expect(Option.isNone(hostProp(input, "tabIndex"))).toBe(true);
    expect(record.seen).toStrictEqual([
      { disabled: false, readOnly: true, focused: false, invalid: false },
    ]);
  });

  it("keeps one tab stop on OTPField's first cell, and every cell read-only", () => {
    const group = recorder<OTPFieldState>();
    const cell = recorder<OTPCellState>();
    const element = renderOtpField(
      { length: 3, readOnly: true, style: group.style, cellStyle: cell.style },
      testTheme,
      text("123"),
      groupFocus,
      otpHandlers(),
    );
    const cells = elementChildren(element);
    expect(cells.map((entry) => expectSome(hostProp(entry, "readOnly")))) //
      .toStrictEqual([true, true, true]);
    expect(
      cells.map((entry) => Option.getOrUndefined(hostProp(entry, "tabIndex"))),
    ) //
      .toStrictEqual([0, -1, -1]);
    expect(group.seen).toStrictEqual([
      { disabled: false, readOnly: true, invalid: false },
    ]);
    expect(cell.seen.map((state) => state.readOnly)).toStrictEqual([
      true,
      true,
      true,
    ]);
  });

  it("reports readOnly on Rating's own state", () => {
    const record = recorder<RatingState>();
    const handlers: RatingHandlers = {
      onSelect: vi.fn(),
      onMove: vi.fn(),
      registerItem: () => () => {},
    };
    renderRating(
      { style: record.style, readOnly: true, max: 3 },
      testTheme,
      initValueState(Option.some(2), 0),
      groupFocus,
      { preview: Option.none(), onEnter: vi.fn(), onLeave: vi.fn() },
      handlers,
    );
    expect(record.seen).toStrictEqual([
      { disabled: false, readOnly: true, invalid: false },
    ]);
  });
});
