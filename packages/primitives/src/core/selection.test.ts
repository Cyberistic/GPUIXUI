import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  SELECTION_STATES,
  selectionBoxStyle,
  selectionMarkColor,
  selectionRowStyle,
  switchThumbOffset,
  switchThumbStyle,
  switchTrackStyle,
  type SelectionSpec,
} from "./selection.js";
import { testTheme } from "./testing/theme.fixture.js";

/**
 * Guards the three-state selection paint.
 *
 * The bug this is aimed at: a checkbox whose mark is invisible in one state, or
 * a switch whose thumb and track are painted the same colour in the checked
 * state so the state cannot be read. Both are one wrong role away, and neither
 * the compiler nor a DOM-free test can see them unless the roles are asserted
 * directly.
 */

const spec = (over: Partial<SelectionSpec> = {}): SelectionSpec => ({
  state: "unchecked",
  size: "md",
  accent: "primary",
  ...over,
});

describe("selectionBoxStyle", () => {
  it("leaves an unchecked box unfilled, on the input border role", () => {
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderColor).toBe(testTheme.colors.input);
  });

  it("rings a focused control, but never a disabled one", () => {
    // Plan 332: focus outlives `disabled`, so a disabled control kept its ring
    // when the prop changed; the fields had always dropped theirs.
    expect(
      selectionBoxStyle(spec({ focused: true }), testTheme).boxShadow,
    ).toBeDefined();
    expect(
      selectionBoxStyle(spec({ focused: true, disabled: true }), testTheme)
        .boxShadow,
    ).toBeUndefined();
    expect(
      switchTrackStyle(spec({ focused: true }), testTheme).boxShadow,
    ).toBeDefined();
    expect(
      switchTrackStyle(spec({ focused: true, disabled: true }), testTheme)
        .boxShadow,
    ).toBeUndefined();
  });

  it("fills a checked box with the accent and makes the mark legible", () => {
    const style = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.primary);
    expect(style.borderColor).toBe(testTheme.colors.primary);
    expect(style.color).toBe(testTheme.colors.primaryForeground);
    expect(style.color).not.toBe(style.backgroundColor);
  });

  it("treats indeterminate as filled, not as a third fill", () => {
    const checked = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    const mixed = selectionBoxStyle(
      spec({ state: "indeterminate" }),
      testTheme,
    );
    expect(mixed.backgroundColor).toBe(checked.backgroundColor);
    expect(mixed.borderColor).toBe(checked.borderColor);
  });

  it("paints a filled box in the accent and leaves an empty one unpainted", () => {
    const empty = selectionBoxStyle(spec(), testTheme);
    const filledStates = Arr.filter(
      SELECTION_STATES,
      (state) => state !== "unchecked",
    );
    const filledPaint = Arr.map(
      filledStates,
      (state) => selectionBoxStyle(spec({ state }), testTheme).backgroundColor,
    );
    expect(empty.backgroundColor).toBeUndefined();
    expect(
      Arr.every(filledPaint, (bg) => bg === testTheme.colors.primary),
    ).toBe(true);
  });

  it("switches the border to the destructive role when invalid", () => {
    expect(
      selectionBoxStyle(spec({ invalid: true }), testTheme).borderColor,
    ).toBe(testTheme.colors.destructive);
  });

  it("paints the focus ring on a focused box, and only then", () => {
    const focused = selectionBoxStyle(spec({ focused: true }), testTheme);
    expect(focused.boxShadow?.color).toBe(testTheme.colors.ring);
    expect(focused.boxShadow?.spreadRadius).toBe(testTheme.borderWidth.strong);
    expect(selectionBoxStyle(spec(), testTheme).boxShadow).toBeUndefined();
  });

  it("gives a filled box pointer feedback that is not its resting fill", () => {
    const style = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    expect(style.hover?.backgroundColor).not.toBe(style.backgroundColor);
    expect(style.hover?.backgroundColor).toBeDefined();
  });

  it("removes pointer feedback while disabled", () => {
    const style = selectionBoxStyle(spec({ disabled: true }), testTheme);
    expect(style.opacity).toBeLessThan(1);
    expect(style.cursor).toBe("not-allowed");
    expect(style.hover?.borderColor).toBe(testTheme.colors.input);
  });

  it("honours a destructive accent over the brand", () => {
    const style = selectionBoxStyle(
      spec({ state: "checked", accent: "destructive" }),
      testTheme,
    );
    expect(style.backgroundColor).toBe(testTheme.colors.destructive);
  });

  it("sizes the box from the theme's icon scale, so it aligns with the label", () => {
    expect(selectionBoxStyle(spec({ size: "lg" }), testTheme).width).toBe(
      testTheme.iconSize.lg,
    );
  });
});

describe("invalid selection feedback", () => {
  it("keeps the destructive boundary through hover and press on an empty box", () => {
    // Plan 356: the error cue is a border, so reusing the healthy hover/press
    // rule painted the box as valid for the whole gesture.
    const invalid = selectionBoxStyle(spec({ invalid: true }), testTheme);
    expect(invalid.hover?.borderColor).toBe(testTheme.colors.destructive);
    expect(invalid.active?.borderColor).toBe(testTheme.colors.destructive);
    const valid = selectionBoxStyle(spec(), testTheme);
    expect(valid.hover?.borderColor).toBe(testTheme.colors.borderStrong);
    expect(valid.active?.borderColor).toBe(testTheme.colors.ring);
  });

  it("leaves a filled invalid box on its accent feedback", () => {
    // A chosen option is not what failed validation (plans 061, 070).
    const filled = selectionBoxStyle(
      spec({ invalid: true, state: "checked" }),
      testTheme,
    );
    expect(filled.hover?.borderColor).not.toBe(testTheme.colors.destructive);
    expect(filled.active?.borderColor).toBe(testTheme.colors.ring);
  });

  it("keeps the destructive boundary through hover and press on an empty switch", () => {
    const invalid = switchTrackStyle(spec({ invalid: true }), testTheme);
    expect(invalid.hover?.borderColor).toBe(testTheme.colors.destructive);
    expect(invalid.active?.borderColor).toBe(testTheme.colors.destructive);
    const valid = switchTrackStyle(spec(), testTheme);
    expect(valid.hover?.borderColor).toBe(testTheme.colors.borderStrong);
    expect(valid.active?.borderColor).toBe(testTheme.colors.ring);
  });

  it("still declares no press feedback while disabled", () => {
    const disabled = spec({ invalid: true, disabled: true });
    expect(selectionBoxStyle(disabled, testTheme).active).toStrictEqual({});
    expect(selectionBoxStyle(disabled, testTheme).hover?.borderColor).toBe(
      testTheme.colors.destructive,
    );
    expect(switchTrackStyle(disabled, testTheme).active).toStrictEqual({});
  });
});

describe("selectionRowStyle", () => {
  it("gives the row that owns the pointer a hover and press wash", () => {
    // Plan 355: the group row is the control (role, name, tab stop, click and
    // keys), but only the inner box had feedback, so hovering the label column
    // painted nothing.
    const style = selectionRowStyle({ align: "flex-start" }, testTheme);
    expect(style.hover?.backgroundColor).toBe(testTheme.colors.hover);
    expect(style.active?.backgroundColor).toBe(testTheme.colors.active);
    expect(style.backgroundColor).toBeUndefined();
  });

  it("declares no feedback on a disabled row", () => {
    const style = selectionRowStyle(
      { disabled: true, align: "center" },
      testTheme,
    );
    expect(style.hover).toBeUndefined();
    expect(style.active).toBeUndefined();
    expect(style.cursor).toBe("not-allowed");
  });

  it("takes the alignment its content needs", () => {
    expect(
      selectionRowStyle({ align: "flex-start" }, testTheme).alignItems,
    ).toBe("flex-start");
    expect(selectionRowStyle({ align: "center" }, testTheme).alignItems).toBe(
      "center",
    );
  });
});

describe("selectionMarkColor", () => {
  it("uses the accent foreground when filled", () => {
    expect(selectionMarkColor(spec({ state: "checked" }), testTheme)).toBe(
      testTheme.colors.primaryForeground,
    );
  });

  it("warns in the destructive role when invalid and empty", () => {
    expect(selectionMarkColor(spec({ invalid: true }), testTheme)).toBe(
      testTheme.colors.destructive,
    );
  });
});

describe("switch", () => {
  it("fills the track and contrasts the thumb when checked", () => {
    const on = switchTrackStyle(spec({ state: "checked" }), testTheme);
    expect(on.backgroundColor).toBe(testTheme.colors.primary);
    const thumb = switchThumbStyle(spec({ state: "checked" }), testTheme);
    expect(thumb.backgroundColor).toBe(testTheme.colors.primaryForeground);
    expect(thumb.backgroundColor).not.toBe(on.backgroundColor);
  });

  it("rests the thumb on the inset at each end of the pill", () => {
    // The bug guarded (plan 329): the thumb was moved by the track's
    // `justifyContent`, so a toggle teleported and there was no position a
    // motion target could animate.
    expect(switchThumbOffset(spec(), testTheme)).toEqual({ left: 2, top: 1 });
    expect(switchThumbOffset(spec({ state: "checked" }), testTheme)).toEqual({
      left: 12,
      top: 1,
    });
  });

  it("derives the travel from the size, not a literal", () => {
    expect(
      switchThumbOffset(spec({ size: "lg", state: "checked" }), testTheme).left,
    ).toBe(15);
    expect(
      switchThumbOffset(spec({ size: "sm", state: "checked" }), testTheme).left,
    ).toBe(11);
  });

  it("stops centring the thumb with layout, so its position can animate", () => {
    const track = switchTrackStyle(spec(), testTheme);
    expect(track.position).toBe("relative");
    expect(track.justifyContent).toBeUndefined();
    expect(track.padding).toBeUndefined();
  });

  it("keeps the thumb a whole pixel inside the track", () => {
    const track = switchTrackStyle(spec({ size: "lg" }), testTheme);
    const thumb = switchThumbStyle(spec({ size: "lg" }), testTheme);
    expect(Number(thumb.width)).toBeLessThan(Number(track.height));
    expect(Arr.every([thumb.width, thumb.height], Number.isInteger)).toBe(true);
  });

  it("takes the destructive border when invalid, like a checkbox", () => {
    // The bug guarded: `invalid` reached the spec and was dropped, while
    // `docs/switch.mdx` promised the destructive role.
    expect(
      switchTrackStyle(spec({ invalid: true }), testTheme).borderColor,
    ).toBe(testTheme.colors.destructive);
    expect(switchTrackStyle(spec(), testTheme).borderColor).toBe(
      testTheme.colors.input,
    );
  });

  it("paints the focus ring on a focused track, and only then", () => {
    expect(
      switchTrackStyle(spec({ focused: true }), testTheme).boxShadow?.color,
    ).toBe(testTheme.colors.ring);
    expect(switchTrackStyle(spec(), testTheme).boxShadow).toBeUndefined();
  });
});
