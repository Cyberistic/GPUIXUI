import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { targetInset, targetSize } from "@gpuixui/tokens";
import {
  SELECTION_STATES,
  selectionBoxStyle,
  selectionMarkColor,
  selectionTargetStyle,
  switchTargetStyle,
  switchThumbInset,
  switchThumbStyle,
  switchThumbTravel,
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

  it("paints no ring of its own: the component declares the keyboard ring", () => {
    // The resting paint is what the recipe oracle compares, so the ring is a
    // component-level declaration (`core/focus.ts`), not part of the box's
    // geometry — and it must never be a shadow again.
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.focusVisible).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
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

  it("moves the thumb across the pill by the travel it can animate", () => {
    // The bug guarded: the thumb was positioned by the track's `justifyContent`,
    // which the runtime cannot animate, so the knob jumped. Both positions are
    // now a `left` inset, and the slide is the difference between them.
    const off = switchThumbStyle(spec(), testTheme);
    const on = switchThumbStyle(spec({ state: "checked" }), testTheme);
    expect(Number(on.left) - Number(off.left)).toBe(
      switchThumbTravel(spec(), testTheme),
    );
    expect(off.left).toBe(switchThumbInset(testTheme));
    expect(on.top).toBe(off.top);
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

  it("paints no ring of its own: the component declares the keyboard ring", () => {
    const style = switchTrackStyle(spec(), testTheme);
    expect(style.focusVisible).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
  });
});

describe("selectionTargetStyle", () => {
  const sizes = ["sm", "md", "lg"] as const;

  it("reserves the pressable floor around every box size", () => {
    // The bug these guard: the icon-sized box was its own press target — 14/16/
    // 20px against WCAG 2.2 SC 2.5.8's 24px floor.
    const sides = Arr.map(sizes, (size) => {
      const style = selectionTargetStyle(spec({ size }), testTheme);
      return { size, width: style.width, height: style.height };
    });
    expect(sides).toStrictEqual(
      Arr.map(sizes, (size) => ({
        size,
        width:
          testTheme.iconSize[size] + targetInset(testTheme.iconSize[size]) * 2,
        height:
          testTheme.iconSize[size] + targetInset(testTheme.iconSize[size]) * 2,
      })),
    );
    expect(
      Arr.every(sides, (side) => Number(side.width) >= targetSize.minimum),
    ).toBe(true);
  });

  it("keeps the drawing's filled square out of the press", () => {
    expect(
      selectionTargetStyle(spec(), testTheme).backgroundColor,
    ).toBeUndefined();
  });

  it("refuses the pointer feedback a disabled control would invite", () => {
    expect(
      selectionTargetStyle(spec({ disabled: true }), testTheme).cursor,
    ).toBe("not-allowed");
    expect(selectionTargetStyle(spec(), testTheme).cursor).toBe("pointer");
  });
});

describe("switchTargetStyle", () => {
  it("grows only the band a track cannot fill", () => {
    // The track keeps the pill's width and is one icon-height tall; the target
    // adds the height to reach the floor and leaves the width to the track.
    const style = switchTargetStyle(spec());
    expect(style.minHeight).toBe(targetSize.minimum);
    expect(style.width).toBeUndefined();
    expect(style.height).toBeUndefined();
  });

  it("refuses the pointer feedback a disabled switch would invite", () => {
    expect(switchTargetStyle(spec({ disabled: true })).cursor).toBe(
      "not-allowed",
    );
    expect(switchTargetStyle(spec()).cursor).toBe("pointer");
  });
});
