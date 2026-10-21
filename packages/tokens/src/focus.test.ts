/**
 * Guards the focus-ring contract after plan 053's native probe.
 *
 * 1. The keyboard ring must be an outline in the runtime's `focusVisible` state,
 *    not a shadow. It is applied at rest, so the runtime paints it only after a
 *    Tab — a click must not show it. `@gpuix/native@0.11.0` declares
 *    `outline*` and `focusVisible`; a regression to a `boxShadow` would make the
 *    two input paths look identical again.
 * 2. The unconditional ring must stay available. The probe measured that
 *    `focusVisible` does not paint for a programmatic focus before any keyboard
 *    input, which is exactly how a mouse-opened dialog or menu focuses its
 *    content; that path paints `focusRing`'s shadow while focused.
 * 3. Both take their width from the theme's `borderWidth.strong` and their
 *    colour from the `ring` role, so a brand's border and focus colour follow.
 */

import { describe, expect, it } from "vitest";
import { focusExample } from "./focus-ring.example.js";
import { focusRing, keyboardFocusRing } from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
];

const hex = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

describe("keyboardFocusRing", () => {
  it("is the runtime's focusVisible state, not a shadow", () => {
    expect(Object.keys(keyboardFocusRing(lightTheme))).toEqual([
      "focusVisible",
    ]);
    expect(keyboardFocusRing(lightTheme)).not.toHaveProperty("boxShadow");
  });

  it("is an outline drawn outside the border box without taking layout space", () => {
    const { focusVisible } = keyboardFocusRing(lightTheme);
    expect(Object.keys(focusVisible).toSorted()).toEqual([
      "outlineColor",
      "outlineOffset",
      "outlineWidth",
    ]);
    expect(focusVisible.outlineWidth).toBe(lightTheme.borderWidth.strong);
    expect(focusVisible.outlineWidth).toBeGreaterThan(0);
    expect(focusVisible.outlineOffset).toBe(0);
  });

  it("takes the outline width from the theme, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).toBe(3);
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).not.toBe(
      keyboardFocusRing(lightTheme).focusVisible.outlineWidth,
    );
  });

  it("paints the ring role of every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const { focusVisible } = keyboardFocusRing(theme);
      expect(focusVisible.outlineColor, label).toBe(theme.colors.ring);
      expect(focusVisible.outlineColor, label).toMatch(hex);
    });
  });

  it("differs between light and dark", () => {
    expect(keyboardFocusRing(lightTheme).focusVisible.outlineColor).not.toBe(
      keyboardFocusRing(darkTheme).focusVisible.outlineColor,
    );
  });
});

describe("focusRing", () => {
  it("stays the unconditional shadow for a programmatic focus", () => {
    const { boxShadow } = focusRing(lightTheme);
    expect(Object.keys(focusRing(lightTheme))).toEqual(["boxShadow"]);
    expect(boxShadow.offsetX).toBe(0);
    expect(boxShadow.offsetY).toBe(0);
    expect(boxShadow.blurRadius).toBe(0);
    expect(boxShadow.spreadRadius).toBe(lightTheme.borderWidth.strong);
    expect(boxShadow.color).toBe(lightTheme.colors.ring);
  });

  it("spreads by the theme's border scale, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(focusRing(wide).boxShadow.spreadRadius).toBe(3);
    expect(focusRing(wide).boxShadow.spreadRadius).not.toBe(
      focusRing(lightTheme).boxShadow.spreadRadius,
    );
  });
});

describe("focus example", () => {
  it("applies the keyboard ring at rest and keeps a shadow for programmatic focus", () => {
    const { rest, programmatic } = focusExample(lightTheme);
    expect(rest.focusVisible).toEqual(
      keyboardFocusRing(lightTheme).focusVisible,
    );
    expect(rest).not.toHaveProperty("boxShadow");
    expect(programmatic).toEqual(focusRing(lightTheme));
  });
});
