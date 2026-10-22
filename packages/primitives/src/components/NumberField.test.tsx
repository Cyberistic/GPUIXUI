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
  type NumberFieldScrub,
} from "./NumberField.js";
import type { FieldState } from "./Input.js";
import type { FocusState } from "./internal.js";
import { changeEvent, clickEvent, keyEvent } from "./testing/event.js";
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
  scrub?: NumberFieldScrub,
): ReactElement =>
  renderNumberField(
    props,
    testTheme,
    initValueState(Option.some(value), 0),
    text,
    focus,
    handlers(over),
    scrub,
  );

/** The field's body: a context provider draws nothing in the runtime. */
const bodyOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the number field drew nothing");

/** The native input inside the part's positioning frame. */
const inputOf = (part: ReactElement): ReactElement =>
  elementChildren(part)[0] ?? expect.fail("the input part drew nothing");

/** The native input, the spin column, and the two step buttons. */
const partsOf = (element: ReactElement) => {
  const [part, column] = elementChildren(bodyOf(element));
  const input = inputOf(part ?? expect.fail("the number field has no input"));
  const [up, down] = column === undefined ? [] : elementChildren(column);
  return {
    input,
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

  it("reads a value it cannot paint as the bound it can", () => {
    // The bug guarded: `NaN` reached the part unchanged, so the field painted
    // "NaN" and both steppers read as available. The display, the bounds and a
    // step now agree on the clamped value.
    const part = numberFieldPart(
      { min: 0, max: 10 },
      testTheme,
      initValueState(Option.some(Number.NaN), 0),
      "",
      idle,
      handlers(),
    );
    expect(part.current).toBe(0);
    expect(part.atMin).toBe(true);
    expect(part.atMax).toBe(false);
  });

  it("reads inverted bounds as the range they mean, so the steppers work", () => {
    // The bug guarded: the part compared the raw props, so `min: 100, max: 0`
    // clamped every value to 0 and both steppers read as blocked. The range is
    // the one the core arithmetic uses — swapped, the same rule a slider follows.
    const onValue = vi.fn();
    const { up } = partsOf(
      render({ min: 100, max: 0 }, 50, "50", idle, { onValue }),
    );
    expectSome(hostHandler(up, "onClick"))(clickEvent);
    expect(onValue).toHaveBeenCalledWith(51);
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
  });

  it("commits before it reports Enter, and installs no listener while disabled", () => {
    const onCommit = vi.fn();
    const onSubmit = vi.fn();
    const { input } = partsOf(render({ onSubmit }, 5, "5", idle, { onCommit }));
    expectSome(hostHandler(input, "onSubmit"))(changeEvent(""));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    const disabled = partsOf(
      render({ disabled: true, onSubmit: vi.fn() }, 5, "5"),
    );
    expect(hostProp(disabled.input, "onSubmit")).toStrictEqual(Option.none());
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

describe("NumberField scrub", () => {
  /** A gesture whose scrubbed state a test can set, so the click is observable. */
  const gesture = () => {
    let scrubbed = false;
    const scrub: NumberFieldScrub = {
      onMouseDown: vi.fn(),
      onMouseMove: vi.fn(),
      onMouseUp: vi.fn(),
      consumedClick: () => {
        const value = scrubbed;
        scrubbed = false;
        return value;
      },
    };
    return {
      scrub,
      moved: (value: boolean) => {
        scrubbed = value;
      },
    };
  };

  it("hands both steppers the drag gesture", () => {
    // The bug guarded: a number field's only pointer affordance was its two
    // chevrons, so a caller could not scrub a value the way a design tool's
    // field does. The pure renderer only carries the handlers; the gesture
    // itself lives in the component (`runtime/number-field.runtime.test.tsx`
    // drags it in a window).
    const { scrub } = gesture();
    const { up, down } = partsOf(render({}, 50, "50", idle, {}, scrub));
    expect(Option.getOrUndefined(hostHandler(up, "onMouseDown"))).toBe(
      scrub.onMouseDown,
    );
    expect(Option.getOrUndefined(hostHandler(up, "onMouseMove"))).toBe(
      scrub.onMouseMove,
    );
    expect(Option.getOrUndefined(hostHandler(down, "onMouseUp"))).toBe(
      scrub.onMouseUp,
    );
  });

  it("refuses the click a scrubbing drag leaves behind", () => {
    const onValue = vi.fn();
    const { scrub, moved } = gesture();
    const { up } = partsOf(render({}, 50, "50", idle, { onValue }, scrub));
    const click = () =>
      expectSome(hostHandler(up, "onClick"))(keyEvent("click"));
    moved(true);
    click();
    expect(onValue).toHaveBeenCalledTimes(0);
    // The flag is consumed: the next plain click steps once, as before.
    click();
    expect(onValue).toHaveBeenCalledWith(51);
  });

  it("installs no gesture on a disabled field", () => {
    const onValue = vi.fn();
    const { scrub } = gesture();
    const { up } = partsOf(
      render({ disabled: true }, 50, "50", idle, { onValue }, scrub),
    );
    expect(hostHandler(up, "onMouseDown")).toStrictEqual(Option.none());
    expectSome(hostHandler(up, "onClick"))(keyEvent("click"));
    expect(onValue).toHaveBeenCalledTimes(0);
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
    const input = inputOf(
      renderNumberFieldInput(
        { testId: "qty" },
        partOf({ label: "Quantity", min: 0, max: 100 }, { onValue }),
      ),
    );
    expect(expectSome(hostProp(input, "value"))).toBe("50");
    expect(expectSome(hostProp(input, "aria-label"))).toBe("Quantity");
    expect(expectSome(hostProp(input, "testId"))).toBe("qty");
    expectSome(hostHandler(input, "onKeyDown"))(keyEvent("up"));
    expect(onValue).toHaveBeenCalledWith(51);
  });
});

describe("NumberField styles", () => {
  it("declares the keyboard ring on the input, the element that holds focus", () => {
    // The bug this guards: the ring was declared on the field's wrapper, and
    // the runtime applies `focusVisible` only to an element it tracks focus for
    // (measured by `runtime/groups.runtime.test.tsx`), so a Tab painted no ring
    // at all. The input is the tab stop, so the declaration belongs there.
    const element = render({}, 50, "50", focused);
    const chrome = expectSome(hostStyleRecord(element));
    expect(Option.fromNullishOr(chrome["focusVisible"])).toStrictEqual(
      Option.none(),
    );
    const { input } = partsOf(element);
    const ringed = expectSome(hostStyleRecord(input));
    expect(ringed["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(ringed["boxShadow"])).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the value lit while another control holds keyboard focus", () => {
    // A field's value is content, not chrome: the runtime's 40% keyboard dim
    // composites it into its own fill, so the input opts out. The part's own
    // `style` merges last and can put the dim back.
    const { input } = partsOf(render({}, 50, "50", focused));
    expect(expectSome(hostStyle(input, "keyboardFocusDim"))).toBe(false);
    const overridden = inputOf(
      renderNumberFieldInput({ style: { keyboardFocusDim: true } }, partOf({})),
    );
    expect(expectSome(hostStyle(overridden, "keyboardFocusDim"))).toBe(true);
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

describe("a number field's address and help", () => {
  it("hands the address and help to the input, and keeps its own registration", () => {
    // Bug guarded: a form could not focus the number field it failed on, and a
    // `Label`'s description reached nobody. The address belongs to the inner
    // `<input>` — the chrome is not focusable — and the field's own ref
    // (which points native focus at the input when a stepper runs) must not be
    // replaced by the caller's.
    const registerInput = vi.fn();
    const ref = vi.fn();
    const layout = vi.fn();
    const { input } = partsOf(
      render(
        {
          label: "Copies",
          description: "One to ninety-nine.",
          ref,
          "aria-id": "copies",
          onLayout: layout,
        },
        5,
        "5",
        idle,
        { registerInput },
      ),
    );
    expect(expectSome(hostProp(input, "aria-description"))).toBe(
      "One to ninety-nine.",
    );
    expect(expectSome(hostProp(input, "aria-id"))).toBe("copies");
    expect(Option.getOrUndefined(hostHandler(input, "onLayout"))).toBe(layout);
    const merged = Option.getOrElse(hostRef(input), () =>
      expect.fail("the input carried no ref"),
    );
    merged(null);
    expect(registerInput).toHaveBeenCalledWith(null);
    expect(ref).toHaveBeenCalledWith(null);
  });

  it("publishes nothing rather than a blank description", () => {
    const { input } = partsOf(render({ description: " " }, 5, "5"));
    expect(hostProp(input, "aria-description")).toStrictEqual(Option.none());
  });
});
