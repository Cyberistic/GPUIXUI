/**
 * Guards the Windows 11 (Fluent 2) platform style.
 *
 * The defect this closes: `win32` was a Windows-10-era approximation. Its
 * controls rounded at 2px, its dialogs at 10, its accent was the older
 * `#0067C0`, and its dark card was a shade off the Fluent layer. A reader who
 * chose Windows saw a look that was near the platform rather than the platform.
 *
 * The four rules are Fluent 2's own: a 4px grid (controls corner at 4, surfaces
 * at 8), the standard 32px control in a 28/32/36 density, the accent
 * (`#0078D4` light, `#4CC2FF` dark) on both the action and the focus rect, and
 * the layered neutrals (`#F3F3F3` page, `#202020` page in dark, `#2C2C2C` layer
 * in dark). `platform-fluent.test.ts` is the one place those four are stated,
 * so a palette edit cannot silently leave the platform.
 */

import { describe, expect, it } from "vitest";
import { platformStyles } from "./platforms.js";
import { densityPresets } from "./scale.js";
import { keyboardFocusRing } from "./styles.js";
import { platformTheme, themes } from "./theme.js";

const style = platformStyles.win32;
const light = platformTheme(themes.light, "win32");
const dark = platformTheme(themes.dark, "win32");

describe("Windows 11 (Fluent 2)", () => {
  it("corners controls at 4px and surfaces at 8px", () => {
    // Fluent's 4px grid: `sm`/`md` are the control steps and `lg`/`xl` the
    // surface steps, so each pair shares a corner on purpose.
    expect(style.radius).toEqual({
      none: 0,
      sm: 4,
      md: 4,
      lg: 8,
      xl: 8,
      full: 9999,
    });
    expect([light.radius.sm, light.radius.md]).toEqual([4, 4]);
    expect([light.radius.lg, light.radius.xl]).toEqual([8, 8]);
  });

  it("keeps the standard control at 32px on the 28/32/36 density", () => {
    expect(style.density).toBe("comfortable");
    expect(densityPresets[style.density].controlHeight).toEqual({
      sm: 28,
      md: 32,
      lg: 36,
    });
    // The resolved theme carries the same heights the style names.
    expect(light.density.controlHeight).toEqual({ sm: 28, md: 32, lg: 36 });
  });

  it("paints the Fluent accent on the action and the focus rect", () => {
    // `primary` is the action fill; `ring` is the focus rect. Both are the
    // accent, and each mode has its own value.
    expect(light.colors.primary).toBe("#0078D4");
    expect(light.colors.ring).toBe("#0078D4");
    expect(dark.colors.primary).toBe("#4CC2FF");
    expect(dark.colors.ring).toBe("#4CC2FF");
    // A filled action's label is measured against the fill, not assumed.
    expect(light.colors.primaryForeground).toBe("#FFFFFF");
    expect(dark.colors.primaryForeground).toBe("#11141A");
  });

  it("layers the Fluent neutral surfaces", () => {
    // Light: the grey page behind a white card. Dark: the `#202020` page under
    // the `#2C2C2C` layer a card sits on. The page and the layer are different
    // fills, so a card is visible without a border.
    expect(light.colors.background).toBe("#F3F3F3");
    expect(light.colors.card).toBe("#FFFFFF");
    expect(dark.colors.background).toBe("#202020");
    expect(dark.colors.card).toBe("#2C2C2C");
    expect(dark.colors.card).not.toBe(dark.colors.background);
  });

  it("draws the focus rect as a 2px outline, not a layout border", () => {
    // The runtime paints `focusVisible` as an outline, which takes no layout
    // space; a border would move the control on Tab.
    const ring = keyboardFocusRing(light).focusVisible;
    expect(ring.outlineWidth).toBe(2);
    expect(ring.outlineOffset).toBe(2);
    expect(ring.outlineColor).toBe(light.colors.ring);
    expect(Object.keys(keyboardFocusRing(light))).toEqual(["focusVisible"]);
  });
});
