import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import type { StyleDesc } from "@gpuix/react";
import { disabledOpacity } from "@gpuixui/tokens";
import * as hintSubpath from "@gpuixui/primitives/hint";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
import {
  fieldHelp as publishedFieldHelp,
  fieldHint as publishedFieldHint,
  hintFrame as publishedHintFrame,
  hintHost as publishedHintHost,
  renderFieldHint as publishedRenderFieldHint,
} from "../index.js";
import { fieldChrome, renderInput, type FieldProps } from "./Input.js";
import {
  fieldHelp,
  fieldHint,
  hintFrame,
  hintHost,
  renderFieldHint,
  type FieldHint,
} from "./hint.js";
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

const styleOf = (hint: FieldHint) => hint.textStyle;

describe("a field's hint", () => {
  it("gives the host no placeholder, so the runtime's fixed grey never paints", () => {
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

  it("paints no hint for a placeholder that is only spaces", () => {
    expect(Option.isNone(hintOf({ placeholder: "   " }))).toBe(true);
    expect(Option.isNone(hintOf({ placeholder: "\t\n" }))).toBe(true);

    expect(fieldHelp({ placeholder: "   " }, "")).toBeUndefined();

    const padded = expectSome(hintOf({ placeholder: "  Search projects  " }));
    expect(padded.text).toBe("  Search projects  ");
  });

  it("fades with the field it sits in", () => {
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

    const content = hintFrame(testTheme, {
      size: "md",
      align: "center",
      origin: "content",
    });
    expect(content.paddingLeft).toBe(0);
    expect(content.paddingTop).toBe(0);
  });

  it("insets a stored size at the default step", () => {
    const stored = hintFrame(testTheme, {
      size: "xl" as ControlSize,
      align: "center",
      origin: "field",
    });
    const fallback = hintFrame(testTheme, {
      size: "md",
      align: "center",
      origin: "field",
    });
    expect(stored).toStrictEqual(fallback);
    expect(stored.paddingLeft).toBe(
      testTheme.borderWidth.thin + testTheme.density.controlPaddingX.md,
    );
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

describe("the published hint seam", () => {
  it("publishes the frame, the hint and its element from the package root", () => {
    expect(publishedFieldHelp).toBe(fieldHelp);
    expect(publishedFieldHint).toBe(fieldHint);
    expect(publishedHintFrame).toBe(hintFrame);
    expect(publishedHintHost).toBe(hintHost);
    expect(publishedRenderFieldHint).toBe(renderFieldHint);

    const hint = expectSome(
      publishedFieldHint({ placeholder: "Search projects" }, testTheme, "", {
        size: "md",
        align: "center",
        origin: "field",
      }),
    );
    const element = publishedRenderFieldHint(hint, "search");
    const [label] = elementChildren(element);
    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "testId")),
    ).toBe("search-hint");
    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "children")),
    ).toBe("Search projects");

    const frame = publishedHintFrame(testTheme, {
      size: "md",
      align: "center",
      origin: "field",
    });
    expect(frame.pointerEvents).toBe("none");
  });

  it("follows a host package's own resolved style", () => {
    const style: StyleDesc = {
      borderWidth: 2,
      paddingLeft: 10,
      paddingRight: 8,
      paddingTop: 6,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: "Inter",
      textAlign: "left",
    };
    const frame = hintFrame(testTheme, {
      origin: "host",
      align: "center",
      style,
    });
    expect(frame.paddingLeft).toBe(12);
    expect(frame.paddingRight).toBe(8);
    expect(frame.paddingTop).toBe(0);
    expect(frame.pointerEvents).toBe("none");

    const top = hintFrame(testTheme, { origin: "host", align: "top", style });
    expect(top.paddingTop).toBe(8);

    const hint = expectSome(
      fieldHint({ placeholder: "Search" }, testTheme, "", {
        origin: "host",
        align: "center",
        style,
      }),
    );
    expect(styleOf(hint).fontSize).toBe(15);
    expect(styleOf(hint).lineHeight).toBe(20);
    expect(styleOf(hint).fontFamily).toBe("Inter");
    expect(styleOf(hint).textAlign).toBe("left");
  });

  it("documents the seam where a consumer reads the package", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("../../README.md", import.meta.url)),
      "utf8",
    );
    expect(
      Arr.filter(
        ["fieldHint", "hintFrame", "hintHost", "renderFieldHint", "fieldHelp"],
        (name) => !readme.includes(`\`${name}\``),
      ),
    ).toEqual([]);
    expect(readme).toContain("@gpuixui/primitives/hint");
  });

  it("loads the seam from its subpath without the package barrel", () => {
    expect(Arr.sort(Object.keys(hintSubpath), Order.String)).toEqual([
      "fieldHelp",
      "fieldHint",
      "hintFrame",
      "hintHost",
      "renderFieldHint",
    ]);
    expect(hintSubpath.fieldHelp).toBe(fieldHelp);
    expect(hintSubpath.fieldHint).toBe(fieldHint);
    expect(hintSubpath.hintFrame).toBe(hintFrame);
    expect(hintSubpath.hintHost).toBe(hintHost);
    expect(hintSubpath.renderFieldHint).toBe(renderFieldHint);
  });

  it("gives a hinted host its positioning context", () => {
    expect(hintSubpath.hintHost()).toEqual({
      position: "relative",
      display: "flex",
    });
    expect(
      hintSubpath.hintHost({ paddingLeft: 8, alignItems: "center" }),
    ).toEqual({
      position: "relative",
      display: "flex",
      paddingLeft: 8,
      alignItems: "center",
    });
    expect(hintSubpath.hintHost({ position: "absolute" }).position).toBe(
      "absolute",
    );
  });
});
