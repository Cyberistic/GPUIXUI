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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderNumberField,
  numberRange,
  type NumberFieldHandlers,
  type NumberFieldProps,
} from "./NumberField.js";
import type { FocusState } from "./internal.js";
import {
  changeEvent,
  clickEvent,
  keyEvent,
  submitEvent,
} from "./testing/event.js";
import {
  elementChildren,
  expectSome,
  hostHandler,
  hostProp,
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

/** The native input, the spin column, and the two step buttons. */
const partsOf = (element: ReactElement) => {
  const [input, column] = elementChildren(element);
  const [up, down] = column === undefined ? [] : elementChildren(column);
  return {
    input: input ?? expect.fail("the number field has no input"),
    up: up ?? expect.fail("the number field has no increment"),
    down: down ?? expect.fail("the number field has no decrement"),
  };
};

describe("NumberField", () => {
  it("is a named text input showing the draft it was given", () => {
    const { input } = partsOf(render({ label: "Quantity" }, 12, "12"));
    expect(expectSome(hostProp(input, "value"))).toBe("12");
    expect(expectSome(hostProp(input, "aria-label"))).toBe("Quantity");
    // The draft is the component's job: a trailing dot survives while typing.
    expect(
      expectSome(hostProp(partsOf(render({}, 1, "1.")).input, "value")),
    ).toBe("1.");
    // Plan 026: a blank label is absent, a padded one is trimmed.
    expect(
      hostProp(partsOf(render({ label: "   " }, 1, "1")).input, "aria-label"),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(
        hostProp(
          partsOf(render({ label: "  Quantity  " }, 1, "1")).input,
          "aria-label",
        ),
      ),
    ).toBe("Quantity");
  });

  it("names the inner text host, so a focused field is addressable", () => {
    // The bug guarded (plan 584): `focused()` reports the focused element's
    // `testId`; the wrapper owned it, the input did not, so a NumberField that
    // held focus looked unfocused to every native test. The host takes the
    // child locator the rest of the package uses (`-trigger`, `-cell-N`).
    const withId = render({ testId: "nf", label: "Amount" }, 1, "1");
    expect(expectSome(hostProp(withId, "testId"))).toBe("nf");
    expect(expectSome(hostProp(partsOf(withId).input, "testId"))).toBe(
      "nf-input",
    );
    const anonymous = render({ label: "Amount" }, 1, "1");
    expect(hostProp(anonymous, "testId")).toStrictEqual(Option.none());
    expect(hostProp(partsOf(anonymous).input, "testId")).toStrictEqual(
      Option.none(),
    );
  });

  it("routes only the keys the runtime delivers", () => {
    const onValue = vi.fn();
    const onCommit = vi.fn();
    const { input } = partsOf(
      render({ min: 0, max: 999 }, 50, "50", idle, { onValue, onCommit }),
    );
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expect(onValue).toHaveBeenCalledWith(51);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("down"));
    expect(onValue).toHaveBeenCalledWith(49);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("pageup"));
    expect(onValue).toHaveBeenCalledWith(60);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("pagedown"));
    expect(onValue).toHaveBeenCalledWith(40);
    expect(onValue).toHaveBeenCalledTimes(4);
  });

  it("commits on the host's submit, then calls the caller", () => {
    // Measured (plan 339): an `<input>` consumes Enter's key down and reports a
    // `submit` instead — the keydown branch never ran, so Enter never committed.
    const order: string[] = [];
    const onSubmit = vi.fn(() => order.push("caller"));
    const onCommit = vi.fn(() => order.push("commit"));
    const { input } = partsOf(
      render({ onSubmit }, 50, "50", idle, { onCommit }),
    );
    expectSome(hostHandler(input, "onSubmit"))(submitEvent());
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(order).toStrictEqual(["commit", "caller"]);
  });

  it("ignores submit while disabled", () => {
    const onCommit = vi.fn();
    const onSubmit = vi.fn();
    const { input } = partsOf(
      render({ disabled: true, onSubmit }, 50, "50", idle, { onCommit }),
    );
    expectSome(hostHandler(input, "onSubmit"))(submitEvent());
    expect(onCommit).toHaveBeenCalledTimes(0);
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it("leaves the caret keys unhandled", () => {
    // Measured (plan 338): the native editor consumes these key downs to move
    // the caret, so the field never sees them — and if it did, stepping would
    // steal the caret. The handler must answer none of them.
    const onValue = vi.fn();
    const { input } = partsOf(
      render({ min: 0, max: 100 }, 50, "50", idle, {
        onValue,
      }),
    );
    Arr.forEach(["left", "right", "home", "end"], (key) => {
      expectSome(hostHandler(input, "onKeyDown"))(keyEvent(key));
    });
    expect(onValue).toHaveBeenCalledTimes(0);
  });

  it("leaves an unrelated key to the form", () => {
    const onValue = vi.fn();
    const { input } = partsOf(render({}, 5, "5", idle, { onValue }));
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("a"));
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

  it("steps its spin buttons inside a swapped range", () => {
    // The bug guarded (plan 378): the steppers derived their blocked state from
    // the raw `min`/`max`, so an inverted pair (`min={100} max={0}`) blocked
    // both buttons even though the normalised range — and the arrow keys —
    // could move. Both halves are asserted: the press reports, and the paint
    // says which button is live.
    const onValue = vi.fn();
    const middle = partsOf(
      render({ min: 100, max: 0 }, 50, "50", idle, { onValue }),
    );
    expectSome(hostHandler(middle.up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(51);
    expectSome(hostHandler(middle.down, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(49);

    const atMin = partsOf(
      render({ min: 100, max: 0 }, 0, "0", idle, { onValue }),
    );
    expect(expectSome(hostStyleRecord(atMin.up))["cursor"]).toBe("pointer");
    expect(expectSome(hostStyleRecord(atMin.down))["cursor"]).toBe(
      "not-allowed",
    );
    expectSome(hostHandler(atMin.up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(1);
    expectSome(hostHandler(atMin.down, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledTimes(3);

    const atMax = partsOf(
      render({ min: 100, max: 0 }, 100, "100", idle, { onValue }),
    );
    expect(expectSome(hostStyleRecord(atMax.up))["cursor"]).toBe("not-allowed");
    expect(expectSome(hostStyleRecord(atMax.down))["cursor"]).toBe("pointer");
    expectSome(hostHandler(atMax.down, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(99);
  });

  it("steps from the bound when the supplied value is outside it", () => {
    // Plan 362: the value came from the parent, so the field painted it raw and
    // stepped from it — the first ArrowDown reported the bound again and the
    // first ArrowUp reported a *smaller* number. Every step now starts at the
    // bounded value the field paints.
    const onValue = vi.fn();
    const { up, down } = partsOf(
      render({ max: 100 }, 150, "100", idle, { onValue }),
    );
    expectSome(hostHandler(up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledTimes(0);
    expectSome(hostHandler(down, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledWith(99);
  });

  it("forwards the caller's key-up to the input", () => {
    // Plan 362: `passiveTriggerHandlers` omits key handlers because each control
    // composes them, and this field wired only `onKeyDown` — the caller's
    // `onKeyUp` stopped at the component boundary.
    const onKeyUp = vi.fn();
    const { input } = partsOf(render({ onKeyUp }, 5, "5"));
    expectSome(hostHandler(input, "onKeyUp"))(keyEvent("up"));
    expect(onKeyUp).toHaveBeenCalledTimes(1);
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

  it("forwards a slot's handlers and description to its input", () => {
    // Plan 345: a Tooltip around a NumberField dropped its cloned props at the
    // component boundary, so the tip never opened and no description reached AT.
    // The host is the inner input: the wrapper div is chrome and is not focusable.
    const onMouseEnter = vi.fn();
    const onKeyDown = vi.fn();
    const onValue = vi.fn();
    const { input } = partsOf(
      render(
        { onMouseEnter, onKeyDown, "aria-description": "A hint" },
        12,
        "12",
        idle,
        { onValue },
      ),
    );
    expectSome(hostHandler(input, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expect(onValue).toHaveBeenCalledWith(13);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(expectSome(hostProp(input, "aria-description"))).toBe("A hint");
  });
});

describe("NumberField styles", () => {
  it("rings the field's own chrome, not the input inside it", () => {
    const element = render({}, 50, "50", focused);
    expect(expectSome(hostStyleRecord(element))["boxShadow"]).toBeDefined();
    const { input } = partsOf(element);
    expect(
      Option.getOrUndefined(hostStyleRecord(input))?.["boxShadow"],
    ).toBeUndefined();
  });
});

describe("numberRange", () => {
  it("is total: a bound or step it cannot use never reaches the field", () => {
    // The bug guarded (plan 371): the raw props went to the paint, so
    // `min={NaN}` painted "NaN", an inverted pair collapsed to `max`, and an
    // infinite step reported Infinity on the first ArrowUp.
    expect(numberRange({ min: Number.NaN, max: 9 })).toStrictEqual({
      min: undefined,
      max: 9,
      step: 1,
    });
    expect(numberRange({ min: 100, max: 0 })).toStrictEqual({
      min: 0,
      max: 100,
      step: 1,
    });
    expect(numberRange({ step: Number.POSITIVE_INFINITY }).step).toBe(1);
    expect(numberRange({ min: 0, max: 10, step: 2 })).toStrictEqual({
      min: 0,
      max: 10,
      step: 2,
    });
  });
});
