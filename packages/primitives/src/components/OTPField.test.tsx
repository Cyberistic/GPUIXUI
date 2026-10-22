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
  otpFieldPart,
  OTPFieldInput,
  renderOtpField,
  renderOtpFieldInput,
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
  hostRef,
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

/** The inputs, one per cell. A context provider draws nothing. */
const cellsOf = (element: ReactElement): ReadonlyArray<ReactElement> => {
  const body =
    elementChildren(element)[0] ?? expect.fail("the field drew no body");
  return elementChildren(body);
};

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

  it("keeps one cell in the tab order: the one the code has reached", () => {
    // The bug: every cell was tabIndex=0, so Tab walked through all six.
    const tabStops = (value: string, length = 4) =>
      [0, 1, 2, 3].map((index) =>
        expectSome(
          hostProp(cell(render({ length }, value), index), "tabIndex"),
        ),
      );
    expect(tabStops("12")).toStrictEqual([-1, -1, 0, -1]);
    expect(tabStops("1234")).toStrictEqual([-1, -1, -1, 0]);
    expect(tabStops("")).toStrictEqual([0, -1, -1, -1]);
  });

  it("moves the tab stop to the cell that holds focus", () => {
    const focused = render({ length: 4 }, "12", {
      focusedIndex: Option.some(1),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    });
    expect(expectSome(hostProp(cell(focused, 1), "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(cell(focused, 2), "tabIndex"))).toBe(-1);
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

  it("reports Enter from the cell that has the caret, through onSubmit", () => {
    // A code is entered to be sent: the runtime turns Enter into a submit only
    // when the field installs a listener, so every cell carries the caller's.
    const onSubmit = vi.fn();
    const element = render({ length: 4, onSubmit }, "12");
    cellsOf(element).forEach((input) => {
      expectSome(hostHandler(input, "onSubmit"))(changeEvent(""));
    });
    expect(onSubmit).toHaveBeenCalledTimes(4);
  });

  it("installs no submit on a disabled field", () => {
    const onSubmit = vi.fn();
    const element = render({ length: 3, disabled: true, onSubmit }, "1");
    cellsOf(element).forEach((input) => {
      expect(hostProp(input, "onSubmit")).toStrictEqual(Option.none());
    });
    expect(onSubmit).toHaveBeenCalledTimes(0);
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

describe("OTPField parts", () => {
  it("renders one cell from the part with its index's value and name", () => {
    const onEdit = vi.fn();
    const onKey = vi.fn();
    const part = otpFieldPart(
      { length: 4, label: "Verification code", testId: "otp" },
      testTheme,
      initValueState(Option.some("1234"), ""),
      idle,
      handlers({ onEdit, onKey }),
    );
    const cell2 = renderOtpFieldInput({ index: 2 }, part);
    expect(expectSome(hostProp(cell2, "value"))).toBe("3");
    expect(expectSome(hostProp(cell2, "aria-label"))).toBe(
      "Verification code digit 3",
    );
    expect(expectSome(hostProp(cell2, "testId"))).toBe("otp-cell-3");
    expectSome(hostHandler(cell2, "onChange"))(changeEvent("9"));
    expect(onEdit).toHaveBeenCalledWith(2, "9");
    expectSome(hostHandler(cell2, "onKeyUp"))(keyUpEvent("backspace"));
    expect(onKey).toHaveBeenCalledWith(2, "backspace");
  });

  it("lets a caller compose the cells", () => {
    const element = render(
      {
        length: 2,
        children: (
          <>
            <OTPFieldInput index={0} />
            <OTPFieldInput index={1} />
          </>
        ),
      },
      "12",
    );
    expect(cellsOf(element).map((part) => part.type)).toEqual([
      OTPFieldInput,
      OTPFieldInput,
    ]);
  });
});

describe("an OTP field's address and help", () => {
  it("carries the help on every cell and the address on the first", () => {
    // Bug guarded: a form could not focus the code field it failed on, and the
    // help a `Label` paints reached nobody. Every cell is independently
    // focusable, so each announces the help; the first cell is the address a
    // caller focuses or knows by `aria-id`.
    const ref = vi.fn();
    const layout = vi.fn();
    const element = render(
      {
        length: 3,
        label: "Verification code",
        description: "Six digits from the email.",
        ref,
        "aria-id": "verification-code",
        onLayout: layout,
      },
      "12",
    );
    const cells = cellsOf(element);
    expect(
      cells.map((input) => hostProp(input, "aria-description")),
    ).toStrictEqual([
      Option.some("Six digits from the email."),
      Option.some("Six digits from the email."),
      Option.some("Six digits from the email."),
    ]);
    const first = cells[0] ?? expect.fail("no first cell");
    const second = cells[1] ?? expect.fail("no second cell");
    const merged = Option.getOrElse(hostRef(first), () =>
      expect.fail("the first cell carried no ref"),
    );
    merged(null);
    expect(ref).toHaveBeenCalledWith(null);
    expect(expectSome(hostProp(first, "aria-id"))).toBe("verification-code");
    expect(Option.getOrUndefined(hostHandler(first, "onLayout"))).toBe(layout);
    expect(hostProp(second, "aria-id")).toStrictEqual(Option.none());
  });

  it("publishes nothing rather than a blank description", () => {
    const element = render({ length: 2, description: "  " }, "");
    expect(hostProp(cell(element, 0), "aria-description")).toStrictEqual(
      Option.none(),
    );
  });
});
