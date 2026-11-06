import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { targetInset, targetSize } from "@gpuixui/tokens";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
import type { SelectionAccent } from "../core/selection.js";
import {
  checkboxState,
  renderCheckbox,
  selectionValueText,
  type CheckboxState,
} from "./Checkbox.js";
import { checkedChange, type FocusState } from "./internal.js";
import { labelledBy } from "./Label.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const customMark = <Icon name="star" color="red" size={12} />;

const drawingOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the checkbox drew no box");

const markOf = (element: ReactElement): ReactElement => {
  const provider =
    elementChildren(drawingOf(element))[0] ??
    expect.fail("the box drew no mark");
  return (
    elementChildren(provider)[0] ?? expect.fail("the mark part drew nothing")
  );
};

const glyphOf = (element: ReactElement): ReactElement =>
  elementChildren(markOf(element))[0] ?? expect.fail("the mark drew no glyph");

describe("Checkbox", () => {
  it("draws a size name the scale does not carry at the default size", () => {
    const stored = renderCheckbox(
      { size: "xl" as ControlSize },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const fallback = renderCheckbox(
      { size: "md" },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleRecord(drawingOf(stored)))).toEqual(
      expectSome(hostStyleRecord(drawingOf(fallback))),
    );
    expect(expectSome(hostStyle(drawingOf(stored), "width"))).toBe(
      testTheme.iconSize.md,
    );
  });

  it("paints an accent name the table does not carry as the brand", () => {
    const stored = renderCheckbox(
      { accent: "brand" as SelectionAccent },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    const fallback = renderCheckbox(
      { accent: "primary" },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleRecord(drawingOf(stored)))).toEqual(
      expectSome(hostStyleRecord(drawingOf(fallback))),
    );
    expect(expectSome(hostStyle(drawingOf(stored), "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
  });

  it("announces its state as value text, and never invents aria-checked", () => {
    const element = renderCheckbox(
      { checked: true },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("checkbox");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("checked");
    expect(hostProp(element, "aria-checked")).toStrictEqual(Option.none());
  });

  it("reports the indeterminate state as mixed", () => {
    const element = renderCheckbox(
      { indeterminate: true },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("mixed");
  });

  it("toggles to the opposite of what it currently shows", () => {
    const onValueChange = vi.fn();
    const element = renderCheckbox(
      {},
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expectSome(hostHandler(element, "onClick"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("declares the keyboard ring at rest and never a shadow ring", () => {
    const element = renderCheckbox(
      {},
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const style = expectSome(hostStyleRecord(element));
    expect(style["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(
      Option.none(),
    );
  });

  it("does not toggle while disabled", () => {
    const onValueChange = vi.fn();
    const element = renderCheckbox(
      { disabled: true },
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );

    expect(hostHandler(element, "onClick")).toStrictEqual(Option.none());
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: CheckboxState[] = [];
    const element = renderCheckbox(
      {
        indeterminate: true,
        invalid: true,
        style: (state) => {
          seen.push(state);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      checked(false),
      { ...idle, focused: true },
      vi.fn(),
    );
    expect(seen).toEqual([
      {
        disabled: false,
        focused: true,
        checked: false,
        indeterminate: true,
        invalid: true,
      },
    ]);
    expect(
      expectSome(hostStyleString(drawingOf(element), "backgroundColor")),
    ).toBe(testTheme.colors.destructive);
  });

  it("reserves the pressable floor and keeps the drawing out of the press", () => {
    const element = renderCheckbox(
      {},
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const side = testTheme.iconSize.md;
    const target = expectSome(hostStyleRecord(element));
    expect(target["width"]).toBe(side + targetInset(side) * 2);
    expect(target["height"]).toBe(side + targetInset(side) * 2);
    expect(target["width"]).toBeGreaterThanOrEqual(targetSize.minimum);
    expect(Option.isSome(hostStyle(element, "focusVisible"))).toBe(true);
    expect(
      expectSome(hostStyleString(drawingOf(element), "pointerEvents")),
    ).toBe("none");
    expect(expectSome(hostProp(element, "role"))).toBe("checkbox");
  });
});

describe("CheckboxIndicator", () => {
  it("draws the default check when checked and a dash when indeterminate", () => {
    const box = renderCheckbox(
      { checked: true },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(elementProp(glyphOf(box), "name"))).toBe("check");

    const mixed = renderCheckbox(
      { indeterminate: true },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(elementProp(glyphOf(mixed), "name"))).toBe("minus");
  });

  it("paints the default glyph in the accent's readable foreground", () => {
    const box = renderCheckbox(
      { checked: true, accent: "destructive" },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(elementProp(glyphOf(box), "color"))).toBe(
      testTheme.colors.destructiveForeground,
    );
  });

  it("draws no mark at all while unchecked", () => {
    const box = renderCheckbox(
      { checked: false },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(elementChildren(drawingOf(box))).toStrictEqual([]);
  });

  it("replaces the default glyph with the caller's mark", () => {
    const box = renderCheckbox(
      { checked: true, children: customMark },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    const glyphs = elementChildren(markOf(box));
    expect(glyphs).toHaveLength(1);
    expect(expectSome(elementProp(glyphs[0] ?? customMark, "name"))).toBe(
      "star",
    );
  });

  it("keeps a custom mark out of the press that toggles the box", () => {
    const box = renderCheckbox(
      { checked: true, children: customMark },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(markOf(box), "pointerEvents"))).toBe(
      "none",
    );
  });
});

describe("checkboxState", () => {
  it("reports selection state through value text, not aria-checked", () => {
    expect(selectionValueText(checkboxState({ indeterminate: true }))).toBe(
      "mixed",
    );
    expect(selectionValueText(checkboxState({ checked: true }))).toBe(
      "checked",
    );
    expect(selectionValueText(checkboxState({}))).toBe("unchecked");
  });
});

describe("checkedChange", () => {
  it("runs the new callback name and not the deprecated alias", () => {
    const next = vi.fn();
    const alias = vi.fn();
    checkedChange({ onCheckedChange: next, onChange: alias })?.(true);
    expect(next).toHaveBeenCalledWith(true);
    expect(alias).toHaveBeenCalledTimes(0);
  });

  it("still calls the deprecated alias when it is the only one", () => {
    const alias = vi.fn();
    checkedChange({ onChange: alias })?.(false);
    expect(alias).toHaveBeenCalledWith(false);
  });
});

describe("a checkbox's address and help", () => {
  it("hands its element the caller's ref, id, layout and help", () => {
    const ref = vi.fn();
    const layout = vi.fn();
    const element = renderCheckbox(
      {
        label: "Accept the terms",
        description: "Required to continue.",
        ref,
        "aria-id": "accept-terms",
        onLayout: layout,
      },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-id"))).toBe("accept-terms");
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Required to continue.",
    );
  });

  it("publishes nothing rather than a blank description", () => {
    const element = renderCheckbox(
      { description: "   " },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(hostProp(element, "aria-description")).toStrictEqual(Option.none());
  });

  it("forwards a tooltip trigger's pointer pair and description", () => {
    const entered = vi.fn();
    const left = vi.fn();
    const element = renderCheckbox(
      {
        label: "Show grid",
        onMouseEnter: entered,
        onMouseLeave: left,
        "aria-description": "  Draws a grid over the canvas  ",
      },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostHandler(element, "onMouseEnter"))).toBe(
      entered,
    );
    expect(Option.getOrUndefined(hostHandler(element, "onMouseLeave"))).toBe(
      left,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Draws a grid over the canvas",
    );
  });

  it("keeps its own help over a tooltip's description", () => {
    const element = renderCheckbox(
      {
        description: "Required to continue.",
        "aria-description": "A tooltip description",
      },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Required to continue.",
    );
  });

  it("is what `labelledBy` writes when the label paints help", () => {
    const element = renderCheckbox(
      labelledBy("Accept the terms", "Required to continue."),
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-label"))).toBe(
      "Accept the terms",
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Required to continue.",
    );
  });
});
