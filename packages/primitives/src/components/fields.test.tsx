/**
 * The field wiring: `Input` and the narrower `TextArea`.
 *
 * `core/state.test.ts` proves the controlled/uncontrolled decision; this suite
 * proves the elements are *driven by it* — the rendered value comes from the
 * resolved state, an edit is reported from `event.value`, a runtime event with
 * no value is not a `null` change, and the field carries the name GPUix can
 * actually read (`aria-label`; there is no `aria-labelledby`, plan 020 §1.4).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderInput } from "./Input.js";
import { renderTextArea } from "./TextArea.js";
import type { FocusState } from "./internal.js";
import { changeEvent } from "./testing/event.js";
import {
  expectSome,
  hostHandler,
  hostProp,
  hostTag,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
/** A control whose parent owns the value. */
const controlled = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");
/** An uncontrolled control holding its own draft. */
const draft = (initial: string): ValueState<string> =>
  initValueState(Option.none(), initial);

/** The resolved `height`, which a textarea leaves to its rows. */
const heightOf = (element: ReactElement): Option.Option<number> =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Struct({ height: Schema.OptionFromNullishOr(Schema.Number) }),
    )(expectSome(hostProp(element, "style"))),
  ).height;

/** The two chrome values that make a field look and behave disabled. */
const chromeOf = (element: ReactElement) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Struct({
        opacity: Schema.OptionFromNullishOr(Schema.Number),
        cursor: Schema.OptionFromNullishOr(Schema.String),
      }),
    )(expectSome(hostProp(element, "style"))),
  );

/** The field's surface and boundary, which `invalid` must not confuse. */
const paintOf = (element: ReactElement) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Struct({
        backgroundColor: Schema.OptionFromNullishOr(Schema.String),
        borderColor: Schema.OptionFromNullishOr(Schema.String),
      }),
    )(expectSome(hostProp(element, "style"))),
  );

describe("Input", () => {
  it("keeps an invalid field's surface and moves only its border", () => {
    // The bug guarded (plan 091): the shared control resolver filled an invalid
    // field with the destructive role instead of recolouring its border.
    const element = renderInput(
      { invalid: true },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );
    const paint = paintOf(element);
    expect(Option.getOrUndefined(paint.backgroundColor)).toBe(
      testTheme.colors.input,
    );
    expect(Option.getOrUndefined(paint.borderColor)).toBe(
      testTheme.colors.destructive,
    );
  });

  it("renders the value the state machine resolved, not its own draft", () => {
    const element = renderInput(
      {},
      testTheme,
      controlled("from the parent"),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "value"))).toBe("from the parent");
  });

  it("reports the text the runtime sent in the event", () => {
    const onValueChange = vi.fn();
    const element = renderInput(
      {},
      testTheme,
      draft("before"),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onChange"))(changeEvent("after"));
    expect(onValueChange).toHaveBeenCalledWith("after");
  });

  it("treats an event with no value as an empty string", () => {
    const onValueChange = vi.fn();
    const element = renderInput(
      {},
      testTheme,
      draft("before"),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onChange"))({
      elementId: 0,
      eventType: "change",
    });
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("carries its accessible name on the element, since GPUix has no labelledby", () => {
    const element = renderInput(
      { label: "Email" },
      testTheme,
      controlled(""),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Email");
    expect(hostProp(element, "aria-labelledby")).toStrictEqual(Option.none());
  });

  it("makes a disabled field read-only, untabbable and de-emphasised", () => {
    const element = renderInput(
      { disabled: true, autoFocus: true },
      testTheme,
      draft("locked"),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "readOnly"))).toBe(true);
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(-1);
    expect(hostProp(element, "autoFocus")).toStrictEqual(Option.none());
    const chrome = chromeOf(element);
    expect(expectSome(chrome.opacity)).toBeLessThan(1);
    expect(expectSome(chrome.cursor)).toBe("not-allowed");
  });

  it("guards a disabled field's edit and submit handlers", () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();
    const element = renderInput(
      { disabled: true, onSubmit },
      testTheme,
      draft("locked"),
      idle,
      onValueChange,
    );
    Option.map(hostHandler(element, "onChange"), (handler) =>
      handler(changeEvent("unwanted")),
    );
    expect(onValueChange).not.toHaveBeenCalled();
    expect(hostHandler(element, "onSubmit")).toStrictEqual(Option.none());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("TextArea", () => {
  it("is the runtime's textarea element with the row limits forwarded", () => {
    const element = renderTextArea(
      { minRows: 3, maxRows: 8 },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostTag(element))).toBe("textarea");
    expect(expectSome(hostProp(element, "minRows"))).toBe(3);
    expect(expectSome(hostProp(element, "maxRows"))).toBe(8);
  });

  it("has no submit handler, which the runtime would trade the newline for", () => {
    void renderTextArea(
      {
        // @ts-expect-error — `TextAreaProps` omits `onSubmit` on purpose (046).
        onSubmit: vi.fn(),
        minRows: 2,
      },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );
    const area = renderTextArea({}, testTheme, draft(""), idle, vi.fn());
    expect(hostProp(area, "onSubmit")).toStrictEqual(Option.none());
  });

  it("keeps a disabled TextArea read-only and untabbable", () => {
    const area = renderTextArea(
      { disabled: true, autoFocus: true },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(area, "readOnly"))).toBe(true);
    expect(expectSome(hostProp(area, "tabIndex"))).toBe(-1);
    expect(hostProp(area, "autoFocus")).toStrictEqual(Option.none());
    expect(chromeOf(area).cursor).toStrictEqual(Option.some("not-allowed"));
  });

  it("lets the rows decide the height instead of a fixed control height", () => {
    const area = renderTextArea({}, testTheme, draft(""), idle, vi.fn());
    const field = renderInput({}, testTheme, draft(""), idle, vi.fn());
    expect(heightOf(area)).toStrictEqual(Option.none());
    expect(Option.isSome(heightOf(field))).toBe(true);
  });
});
