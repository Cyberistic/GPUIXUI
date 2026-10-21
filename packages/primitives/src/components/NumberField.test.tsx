/**
 * `NumberField` — the element tree the runtime receives.
 *
 * The bug this suite guards at the tree level: a numeric *text* field must keep
 * the draft it is given (so `1.` does not become `1` mid-edit), must add no tab
 * stops beyond the input, must not step past a bound, and must leave an
 * unrelated key to the form. Parsing and stepping live in `core/number.ts` and
 * are proven there; the pointer/focus behaviour is the runtime suite's.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  numberFieldPart,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  renderNumberField,
  renderNumberFieldInput,
  type NumberFieldHandlers,
  type NumberFieldPart,
  type NumberFieldProps,
} from "./NumberField.js";
import type { FieldState } from "./Input.js";
import type { FocusState } from "./internal.js";
import { changeEvent, keyEvent } from "./testing/event.js";
import {
  elementChildren,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const focused: FocusState = {
  focused: true,
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const handlers = (
  over: Partial<NumberFieldHandlers> = {},
): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
  ...over,
});

const render = (
  props: NumberFieldProps,
  value: number,
  text: string,
  focus: FocusState = idle,
  over: Partial<NumberFieldHandlers> = {},
): ReactElement =>
  renderNumberField(
    props,
    testTheme,
    initValueState(Option.some(value), 0),
    text,
    focus,
    handlers(over),
  );

/** The field's body: a context provider draws nothing in the runtime. */
const bodyOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the number field drew nothing");

/** The native input, the spin column, and the two step buttons. */
const partsOf = (element: ReactElement) => {
  const [input, column] = elementChildren(bodyOf(element));
  const [up, down] = column === undefined ? [] : elementChildren(column);
  return {
    input: input ?? expect.fail("the number field has no input"),
    up: up ?? expect.fail("the number field has no increment"),
    down: down ?? expect.fail("the number field has no decrement"),
  };
};

const partOf = (
  props: NumberFieldProps,
  over: Partial<NumberFieldHandlers> = {},
): NumberFieldPart =>
  numberFieldPart(
    props,
    testTheme,
    initValueState(Option.some(50), 0),
    "50",
    idle,
    handlers(over),
  );

describe("NumberField", () => {
  it("is a named text input showing the draft it was given", () => {
    const { input } = partsOf(render({ label: "Quantity" }, 12, "12"));
    expect(expectSome(hostProp(input, "value"))).toBe("12");
    expect(expectSome(hostProp(input, "aria-label"))).toBe("Quantity");
    // The draft is the component's job: a trailing dot survives while typing.
    expect(
      expectSome(hostProp(partsOf(render({}, 1, "1.")).input, "value")),
    ).toBe("1.");
  });

  it("moves one step with the arrow keys and a page at a time", () => {
    const onValue = vi.fn();
    const onCommit = vi.fn();
    const { input } = partsOf(
      render({ min: 0, max: 100 }, 50, "50", idle, { onValue, onCommit }),
    );
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expect(onValue).toHaveBeenCalledWith(51);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("down"));
    expect(onValue).toHaveBeenCalledWith(49);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("pageup"));
    expect(onValue).toHaveBeenCalledWith(60);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("end"));
    expect(onValue).toHaveBeenCalledWith(100);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("enter"));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("leaves an unrelated key to the form", () => {
    const onValue = vi.fn();
    const { input } = partsOf(render({}, 5, "5", idle, { onValue }));
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("a"));
    expect(onValue).toHaveBeenCalledTimes(0);
  });

  it("jumps nowhere with Home/End when the field has no bound", () => {
    const onValue = vi.fn();
    const { input } = partsOf(render({}, 5, "5", idle, { onValue }));
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("home"));
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("end"));
    expect(onValue).toHaveBeenCalledTimes(0);
  });

  it("reports the raw text of every edit, so the owner can decide", () => {
    const onTextChange = vi.fn();
    const { input } = partsOf(render({}, 5, "5", idle, { onTextChange }));
    expectSome(hostHandler(input, "onChange"))({
      elementId: 0,
      eventType: "change",
      value: "5.",
    });
    expect(onTextChange).toHaveBeenCalledWith("5.");
  });

  it("steps from the spin buttons and refuses past a bound", () => {
    const onValue = vi.fn();
    const middle = partsOf(
      render({ min: 0, max: 100 }, 50, "50", idle, { onValue }),
    );
    expectSome(hostHandler(middle.up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(51);
    expectSome(hostHandler(middle.down, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(49);

    const atMax = partsOf(render({ max: 100 }, 100, "100", idle, { onValue }));
    expectSome(hostHandler(atMax.up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledTimes(2);
  });

  it("is one tab stop: the spin buttons are presentation", () => {
    const { up, down } = partsOf(render({}, 50, "50"));
    expect(expectSome(hostProp(up, "role"))).toBe("presentation");
    expect(expectSome(hostProp(down, "role"))).toBe("presentation");
    expect(hostProp(up, "tabIndex")).toStrictEqual(Option.none());
  });

  it("paints the destructive border when invalid", () => {
    const invalid = render({ invalid: true }, 50, "50");
    expect(expectSome(hostStyleString(invalid, "borderColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("is read-only, out of the tab order and inert when disabled", () => {
    const onValue = vi.fn();
    const onTextChange = vi.fn();
    const { input, up } = partsOf(
      render({ disabled: true, max: 100 }, 50, "50", idle, {
        onValue,
        onTextChange,
      }),
    );
    expect(expectSome(hostProp(input, "readOnly"))).toBe(true);
    expect(expectSome(hostProp(input, "tabIndex"))).toBe(-1);
    expectSome(hostHandler(up, "onClick"))(keyEvent("click"));
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expectSome(hostHandler(input, "onChange"))(changeEvent("99"));
    expect(onValue).toHaveBeenCalledTimes(0);
    expect(onTextChange).toHaveBeenCalledTimes(0);
  });
});

describe("NumberField parts", () => {
  it("lets a caller replace the composition with the parts", () => {
    const element = render(
      {
        children: (
          <>
            <NumberFieldInput />
            <NumberFieldIncrement />
            <NumberFieldDecrement />
          </>
        ),
      },
      5,
      "5",
    );
    expect(elementChildren(bodyOf(element)).map((part) => part.type)).toEqual([
      NumberFieldInput,
      NumberFieldIncrement,
      NumberFieldDecrement,
    ]);
  });

  it("gives the input part the field's draft, name and keys", () => {
    const onValue = vi.fn();
    const input = renderNumberFieldInput(
      { testId: "qty" },
      partOf({ label: "Quantity", min: 0, max: 100 }, { onValue }),
    );
    expect(expectSome(hostProp(input, "value"))).toBe("50");
    expect(expectSome(hostProp(input, "aria-label"))).toBe("Quantity");
    expect(expectSome(hostProp(input, "testId"))).toBe("qty");
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expect(onValue).toHaveBeenCalledWith(51);
  });
});

describe("NumberField styles", () => {
  it("declares the keyboard ring on the field's own chrome, not the input", () => {
    const element = render({}, 50, "50", focused);
    const chrome = expectSome(hostStyleRecord(element));
    expect(chrome["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(chrome["boxShadow"])).toStrictEqual(
      Option.none(),
    );
    const { input } = partsOf(element);
    expect(
      Option.getOrUndefined(hostStyleRecord(input))?.["focusVisible"],
    ).toBeUndefined();
  });

  it("resolves a style callback against the live field state, last", () => {
    // The bug: a field that reported a stale state to a `style` callback (or
    // merged its result before the chrome) would paint the wrong state and the
    // caller could never override it.
    const seen: Array<FieldState> = [];
    const element = render(
      {
        invalid: true,
        style: (state) => {
          seen.push(state);
          return { opacity: 0.42 };
        },
      },
      50,
      "50",
      focused,
    );
    expect(seen).toStrictEqual([
      { disabled: false, focused: true, invalid: true },
    ]);
    expect(expectSome(hostStyle(element, "opacity"))).toBe(0.42);
  });
});
