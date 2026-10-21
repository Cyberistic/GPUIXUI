/**
 * `Checkbox` — the element tree the runtime receives.
 *
 * The bug this suite guards is invisible to the runtime's own tests: GPUix has
 * no `aria-checked` (plan 020 §1.4), so state must stay legible through
 * `aria-valuetext` and the unsupported attribute must stay absent rather than
 * being written for the DOM's benefit. The mark is its own part
 * (`CheckboxIndicator`), and the second half guards the two ways a split can go
 * wrong: a caller's glyph replacing the default one, and a custom glyph taking
 * the press that toggles the box.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  checkboxState,
  renderCheckbox,
  selectionValueText,
} from "./Checkbox.js";
import { checkedChange, type FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const customMark = <Icon name="star" color="red" size={12} />;

/**
 * The mark a box draws: the root wraps the indicator in the part's context, so
 * the path is root → provider → indicator.
 */
const markOf = (element: ReactElement): ReactElement => {
  const provider =
    elementChildren(element)[0] ?? expect.fail("the box drew no mark");
  return (
    elementChildren(provider)[0] ?? expect.fail("the mark part drew nothing")
  );
};

/** The one element inside the mark — the default glyph or the caller's. */
const glyphOf = (element: ReactElement): ReactElement =>
  elementChildren(markOf(element))[0] ?? expect.fail("the mark drew no glyph");

describe("Checkbox", () => {
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
    // The bug: the ring was merged only while focused, so a mouse press looked
    // like a Tab. The runtime paints `focusVisible` after keyboard input only.
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
    expectSome(hostHandler(element, "onClick"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
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
    // Proves the part receives the root's *resolved* spec, not a stale one: a
    // destructive box marks in the destructive foreground, not the brand's.
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
    expect(elementChildren(box)).toStrictEqual([]);
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
    // The regression: GPUI hit-tests to the deepest element and does not bubble
    // an unhandled press, so a glyph that took the click made the box dead.
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
