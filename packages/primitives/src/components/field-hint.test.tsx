/**
 * A field's hint is painted, not handed to the runtime.
 *
 * The bug this suite guards: `nativeTextTheme` fills `textFaint`, but at the
 * pinned `@gpuix/native@0.11.0` an empty `<input>`/`<textarea>` shapes its
 * placeholder with a fixed `#8F8F8F` (`custom_elements/input.rs`), so every
 * field's hint was that grey — **2.84:1** on a white field, under the 4.5:1 the
 * token contract holds `placeholder` to — and no theme value could reach it.
 * The field now gives the host no placeholder and paints the caller's words in
 * the measured `placeholder` role.
 *
 * A hint is **content the reader is about to replace**, so it is held to the
 * same rules as the value: the hint fades with the field's own disabled paint
 * rather than staying full-opacity beside a faded box.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { disabledOpacity } from "@gpuixui/tokens";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  fieldChrome,
  fieldHint,
  hintFrame,
  renderFieldHint,
  renderInput,
  type FieldHint,
  type FieldProps,
} from "./Input.js";
import {
  numberFieldPart,
  renderNumberFieldInput,
  type NumberFieldHandlers,
} from "./NumberField.js";
import type { FocusState } from "./internal.js";
import { renderTextArea } from "./TextArea.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostTag,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const empty = initValueState(Option.none(), "");

const hintOf = (
  props: Pick<FieldProps, "placeholder" | "disabled">,
  value = "",
  align: "center" | "top" = "center",
) => fieldHint(props, testTheme, value, { size: "md", align, origin: "field" });

const handlers = (): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
});

/** The hint's painted type and colour. */
const styleOf = (hint: FieldHint) => hint.textStyle;

describe("a field's hint", () => {
  it("gives the host no placeholder, so the runtime's fixed grey never paints", () => {
    // Every field the package renders: the single-line input, the textarea and
    // the number field's own host. A host handed a `placeholder` paints it in
    // the runtime's `#8F8F8F`, which no token can move.
    const input = renderInput(
      { placeholder: "Search projects" },
      testTheme,
      empty,
      idle,
      vi.fn(),
    );
    expect(Option.isNone(hostProp(input, "placeholder"))).toBe(true);

    const area = renderTextArea(
      { placeholder: "Describe the issue" },
      testTheme,
      empty,
      idle,
      vi.fn(),
    );
    expect(Option.isNone(hostProp(area, "placeholder"))).toBe(true);

    const part = numberFieldPart(
      { placeholder: "Quantity" },
      testTheme,
      initValueState(Option.some(0), 0),
      "",
      idle,
      handlers(),
    );
    const [host] = elementChildren(renderNumberFieldInput({}, part));
    expect(
      Option.isNone(
        hostProp(host ?? expect.fail("the part drew no input"), "placeholder"),
      ),
    ).toBe(true);
  });

  it("paints the caller's words in the measured placeholder role", () => {
    // The role the token contract measures on both field fills (secondary
    // floor) — not the runtime's grey, which nothing can move.
    const hint = expectSome(hintOf({ placeholder: "Search projects" }));
    expect(hint.text).toBe("Search projects");
    expect(styleOf(hint).color).toBe(testTheme.colors.placeholder);
    expect(styleOf(hint).fontSize).toBe(testTheme.typography.body.fontSize);
    expect(styleOf(hint).fontFamily).toBe(testTheme.typography.sans);
  });

  it("shows no hint once the field has a value", () => {
    expect(
      Option.isNone(hintOf({ placeholder: "Search projects" }, "typed")),
    ).toBe(true);
  });

  it("treats a blank placeholder as no hint", () => {
    expect(Option.isNone(hintOf({ placeholder: "" }))).toBe(true);
    expect(Option.isNone(hintOf({}))).toBe(true);
  });

  it("fades with the field it sits in", () => {
    // The field chrome fades a disabled field by `disabledOpacity`; a hint left
    // at full opacity would be the brightest thing in a disabled box.
    const chrome = fieldChrome(
      { placeholder: "Search projects", disabled: true },
      testTheme,
      false,
    );
    const hint = expectSome(
      hintOf({ placeholder: "Search projects", disabled: true }),
    );
    expect(chrome.opacity).toBe(disabledOpacity);
    expect(styleOf(hint).opacity).toBe(disabledOpacity);
  });

  it("frames the hint at the field's own text origin", () => {
    // A frame over the field's border box: the hint starts where the value
    // starts, takes no pointer input, and cannot spill over the edge.
    const frame = hintFrame(testTheme, {
      size: "md",
      align: "center",
      origin: "field",
    });
    expect(frame.position).toBe("absolute");
    expect(frame.pointerEvents).toBe("none");
    expect(frame.overflow).toBe("hidden");
    expect(frame.paddingLeft).toBe(
      testTheme.borderWidth.thin + testTheme.density.controlPaddingX.md,
    );
    expect(frame.alignItems).toBe("center");

    const firstRow = hintFrame(testTheme, {
      size: "md",
      align: "top",
      origin: "field",
    });
    expect(firstRow.alignItems).toBe("flex-start");
    expect(firstRow.paddingTop).toBe(
      testTheme.borderWidth.thin + testTheme.density.controlPaddingX.md,
    );

    // A host that already sits inside the field's chrome (the number field's
    // input) is framed from its own content box.
    const content = hintFrame(testTheme, {
      size: "md",
      align: "center",
      origin: "content",
    });
    expect(content.paddingLeft).toBe(0);
    expect(content.paddingTop).toBe(0);
  });

  it("puts the hint in a label with a derived locator", () => {
    const hint = expectSome(hintOf({ placeholder: "Search projects" }));
    const element = renderFieldHint(hint, "field");
    expect(expectSome(hostTag(element))).toBe("div");
    const [label] = elementChildren(element);
    expect(
      expectSome(hostTag(label ?? expect.fail("the hint painted no text"))),
    ).toBe("text");
    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "testId")),
    ).toBe("field-hint");
    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "children")),
    ).toBe("Search projects");
  });

  it("paints a NumberField's hint inside the input part", () => {
    const part = numberFieldPart(
      { placeholder: "Quantity" },
      testTheme,
      initValueState(Option.some(0), 0),
      "",
      idle,
      handlers(),
    );
    const field = renderNumberFieldInput({ testId: "qty" }, part);
    const [host, hint] = elementChildren(field);
    expect(
      Option.fromNullishOr(
        expectSome(hostTag(host ?? expect.fail("no input"))),
      ),
    ).toStrictEqual(Option.some("input"));
    const [label] = elementChildren(hint ?? expect.fail("no hint"));
    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "testId")),
    ).toBe("qty-hint");
  });
});
