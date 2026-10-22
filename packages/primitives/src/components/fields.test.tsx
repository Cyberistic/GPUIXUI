/**
 * The field wiring: `Input` and the narrower `TextArea`.
 *
 * `core/state.test.ts` proves the controlled/uncontrolled decision; this suite
 * proves the elements are *driven by it* — the rendered value comes from the
 * resolved state, an edit is reported from `event.value`, a runtime event with
 * no value is not a `null` change, and the field carries the name GPUix can
 * actually read (`aria-label`; there is no `aria-labelledby`; see `docs/gpuix-capabilities.md`).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderInput, type FieldState } from "./Input.js";
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

describe("Input", () => {
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

  it("hands the native element an address, its help and its tab order", () => {
    // Bug guarded: a field was reachable only by its `testId`, and the help a
    // visible `Label` painted was announced to nobody. A form that focuses the
    // field it failed on needs the element itself, an automation host needs the
    // author id, a layout needs the box, and the words need `aria-description`
    // (0.11.0 has no `aria-describedby`).
    const ref = vi.fn();
    const layout = vi.fn();
    const element = renderInput(
      {
        label: "Email",
        description: "We never share it.",
        ref,
        "aria-id": "contact-email",
        onLayout: layout,
        tabIndex: 2,
      },
      testTheme,
      controlled(""),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-id"))).toBe("contact-email");
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "We never share it.",
    );
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Email");
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(2);
  });

  it("publishes nothing rather than an empty description", () => {
    // The same rule as a blank tooltip: an empty `aria-description` is an
    // announcement of nothing, which reads as a field with a help text that
    // cannot be heard.
    const blank = renderInput(
      { description: "   " },
      testTheme,
      controlled(""),
      idle,
      vi.fn(),
    );
    expect(hostProp(blank, "aria-description")).toStrictEqual(Option.none());
  });

  it("takes the tab stop from a disabled field whatever order it was given", () => {
    const element = renderInput(
      { disabled: true, tabIndex: 2 },
      testTheme,
      controlled(""),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(-1);
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

  it("carries the same address and help as the single-line field", () => {
    // One seam: a `TextArea` is the same `FieldProps` on a different host, so a
    // form that hands a description to its fields does not lose it on the
    // multi-line one.
    const ref = vi.fn();
    const area = renderTextArea(
      {
        label: "Notes",
        description: "Markdown is not interpreted.",
        ref,
        "aria-id": "project-notes",
        tabIndex: 3,
      },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostProp(area, "ref"))).toBe(ref);
    expect(expectSome(hostProp(area, "aria-id"))).toBe("project-notes");
    expect(expectSome(hostProp(area, "aria-description"))).toBe(
      "Markdown is not interpreted.",
    );
    expect(expectSome(hostProp(area, "tabIndex"))).toBe(3);
  });

  it("lets the rows decide the height instead of a fixed control height", () => {
    const area = renderTextArea({}, testTheme, draft(""), idle, vi.fn());
    const field = renderInput({}, testTheme, draft(""), idle, vi.fn());
    expect(heightOf(area)).toStrictEqual(Option.none());
    expect(Option.isSome(heightOf(field))).toBe(true);
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: FieldState[] = [];
    const focused: FocusState = {
      focused: true,
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    const field = renderInput(
      {
        invalid: true,
        style: (state) => {
          seen.push(state);
          return { opacity: 0.4 };
        },
      },
      testTheme,
      draft(""),
      focused,
      vi.fn(),
    );
    const area = renderTextArea(
      {
        disabled: true,
        style: (state) => {
          seen.push(state);
          return { opacity: 0.4 };
        },
      },
      testTheme,
      draft(""),
      idle,
      vi.fn(),
    );

    expect(seen).toEqual([
      { disabled: false, focused: true, invalid: true },
      { disabled: true, focused: false, invalid: false },
    ]);
    expect(chromeOf(field).opacity).toStrictEqual(Option.some(0.4));
    expect(chromeOf(area).opacity).toStrictEqual(Option.some(0.4));
  });
});
