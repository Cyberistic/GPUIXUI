/**
 * `OTPField` — the element tree the runtime receives.
 *
 * The bug this suite guards at the tree level: a code field must be `length`
 * named single-character inputs over one value, must keep its handlers per cell
 * (GPUix dispatches to the element that owns the handler), must not paint a ring
 * on six cells at once, and must remove every tab stop when disabled. The
 * distribution and key contract live in `core/otp.ts`; the native editing,
 * focus movement and paste-shaped insert are the runtime suite's.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
import {
  otpCellLabel,
  renderOtpField,
  type OTPFieldFocus,
  type OTPFieldHandlers,
  type OTPFieldProps,
} from "./OTPField.js";
import type { FieldState } from "./Input.js";
import { changeEvent, keyUpEvent, clickEvent } from "./testing/event.js";
import {
  elementChildren,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const idle: OTPFieldFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const handlers = (over: Partial<OTPFieldHandlers> = {}): OTPFieldHandlers => ({
  onEdit: vi.fn(),
  onKey: vi.fn(),
  onPick: vi.fn(),
  registerCell: () => () => {},
  ...over,
});

const render = (
  props: OTPFieldProps,
  value: string,
  focus: OTPFieldFocus = idle,
  over: Partial<OTPFieldHandlers> = {},
): ReactElement =>
  renderOtpField(
    props,
    testTheme,
    initValueState(Option.some(value), ""),
    focus,
    handlers(over),
  );

/** The inputs, one per cell. */
const cellsOf = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(element);

const cell = (element: ReactElement, index: number): ReactElement =>
  cellsOf(element)[index] ?? expect.fail(`the field has no cell ${index + 1}`);

describe("OTPField", () => {
  it("renders one named input per cell from a single code", () => {
    const element = render({ length: 4, label: "Verification code" }, "12");
    const cells = cellsOf(element);
    expect(cells).toHaveLength(4);
    expect(expectSome(hostProp(element, "role"))).toBe("group");
    expect(expectSome(hostProp(element, "aria-label"))).toBe(
      "Verification code",
    );
    expect(expectSome(hostProp(cell(element, 0), "value"))).toBe("1");
    expect(expectSome(hostProp(cell(element, 1), "value"))).toBe("2");
    expect(expectSome(hostProp(cell(element, 2), "value"))).toBe("");
    expect(expectSome(hostProp(cell(element, 3), "aria-label"))).toBe(
      "Verification code digit 4",
    );
    expect(otpCellLabel(undefined, 0)).toBe("Code digit 1");
  });

  it("reports the index and the raw edit of the cell that changed", () => {
    const onEdit = vi.fn();
    const element = render({ length: 4 }, "12", idle, { onEdit });
    expectSome(hostHandler(cell(element, 2), "onChange"))(changeEvent("9"));
    expect(onEdit).toHaveBeenCalledWith(2, "9");
  });

  it("reports the key from the cell that owns the handler", () => {
    const onKey = vi.fn();
    const element = render({ length: 4 }, "12", idle, { onKey });
    expectSome(hostHandler(cell(element, 1), "onKeyUp"))(keyUpEvent("left"));
    expect(onKey).toHaveBeenCalledWith(1, "left");
  });

  it("points focus at the clicked cell", () => {
    const onPick = vi.fn();
    const element = render({ length: 4 }, "1", idle, { onPick });
    expectSome(hostHandler(cell(element, 3), "onClick"))(clickEvent);
    expect(onPick).toHaveBeenCalledWith(3);
  });

  it("lands autoFocus on the first cell only", () => {
    const element = render({ length: 3, autoFocus: true }, "");
    expect(expectSome(hostProp(cell(element, 0), "autoFocus"))).toBe(true);
    expect(hostProp(cell(element, 1), "autoFocus")).toStrictEqual(
      Option.none(),
    );
  });

  it("declares the keyboard ring on every cell, and lets the runtime pick one", () => {
    // The runtime paints `focusVisible` only on the cell holding the caret, so
    // every cell declares the same outline and no cell paints a shadow ring.
    const element = render({ length: 3 }, "12");
    cellsOf(element).forEach((input) => {
      const style = expectSome(hostStyleRecord(input));
      expect(style["focusVisible"]).toBeDefined();
      expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(
        Option.none(),
      );
    });
  });

  it("paints the destructive border on every cell when invalid", () => {
    const element = render({ length: 3, invalid: true }, "1");
    cellsOf(element).forEach((input) => {
      expect(expectSome(hostStyleString(input, "borderColor"))).toBe(
        testTheme.colors.destructive,
      );
    });
  });

  it("resolves a group style callback against the live field state, last", () => {
    const seen: Array<FieldState> = [];
    const focusedField: OTPFieldFocus = {
      ...idle,
      focusedIndex: Option.some(0),
    };
    const element = render(
      {
        length: 3,
        style: (state) => {
          seen.push(state);
          return { opacity: 0.25 };
        },
      },
      "1",
      focusedField,
    );
    expect(seen).toStrictEqual([
      { disabled: false, focused: true, invalid: false },
    ]);
    expect(expectSome(hostStyle(element, "opacity"))).toBe(0.25);
  });

  it("is a row of equal square cells at the size's control height", () => {
    const size: ControlSize = "md";
    const element = render({ length: 2, size }, "1");
    const input = cell(element, 0);
    const style = expectSome(hostStyleRecord(input));
    expect(style["width"]).toBe(testTheme.density.controlHeight[size]);
    expect(style["height"]).toBe(testTheme.density.controlHeight[size]);
  });

  it("is read-only, out of the tab order and inert when disabled", () => {
    const onEdit = vi.fn();
    const onKey = vi.fn();
    const onPick = vi.fn();
    const element = render({ length: 3, disabled: true }, "1", idle, {
      onEdit,
      onKey,
      onPick,
    });
    cellsOf(element).forEach((input) => {
      expect(expectSome(hostProp(input, "readOnly"))).toBe(true);
      expect(expectSome(hostProp(input, "tabIndex"))).toBe(-1);
    });
    expectSome(hostHandler(cell(element, 0), "onChange"))(changeEvent("12"));
    expectSome(hostHandler(cell(element, 0), "onKeyUp"))(keyUpEvent("left"));
    expectSome(hostHandler(cell(element, 0), "onClick"))(clickEvent);
    expect(onEdit).toHaveBeenCalledTimes(0);
    expect(onKey).toHaveBeenCalledTimes(0);
    expect(onPick).toHaveBeenCalledTimes(0);
  });
});
