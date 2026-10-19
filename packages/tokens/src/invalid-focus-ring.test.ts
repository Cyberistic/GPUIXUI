/**
 * Bug guarded: `invalidRingPairs` publishes the `destructive` ring an error
 * field shows — it is the field's only focus indicator, because GPUix draws one
 * shadow and has no `outline*` — but the package shipped no resolver for it.
 * Every other measured state had one (`focusRing`, `insetFocusRing`,
 * `filledControl`, `disabledControl`, `softAction`), so a consumer following
 * the catalogue's Focus section had to spread `focusRing` and replace its
 * colour, and `primitives` `controlFocusStyle` does exactly that. A third-party
 * control or a docs reader who calls only `focusRing` on a failed field paints
 * the valid ring while every check returns `[]`.
 */

import { describe, expect, it } from "vitest";
import { invalidRingPairs } from "./contrast.js";
import { invalidFocusExample } from "./invalid-focus-ring.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { focusRing, invalidFocusRing } from "./styles.js";
import { createTheme, getTheme, lightTheme } from "./theme.js";

describe("invalidFocusRing", () => {
  it("paints the error ring at the focus geometry in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const { boxShadow } = invalidFocusRing(theme);
      expect(boxShadow.color, theme.name).toBe(theme.colors.destructive);
      expect(boxShadow.spreadRadius, theme.name).toBe(theme.borderWidth.strong);
      expect(boxShadow.offsetX, theme.name).toBe(0);
      expect(boxShadow.offsetY, theme.name).toBe(0);
      expect(boxShadow.blurRadius, theme.name).toBe(0);
    });
  });

  it("is not the valid ring in any shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(theme.colors.destructive, theme.name).not.toBe(theme.colors.ring);
      expect(invalidFocusRing(theme).boxShadow, theme.name).not.toEqual(
        focusRing(theme).boxShadow,
      );
    });
  });

  it("reads a copied theme's destructive role rather than a constant", () => {
    const brand = createTheme({
      mode: "dark",
      colors: { destructive: "#FF00AA" },
    });

    expect(invalidFocusRing(brand).boxShadow.color).toBe("#FF00AA");
    expect(invalidFocusRing(lightTheme).boxShadow.color).toBe(
      lightTheme.colors.destructive,
    );
  });

  it("keeps the published invalid pairs on the destructive role", () => {
    expect(invalidRingPairs.length).toBeGreaterThan(0);
    invalidRingPairs.forEach(([foreground, background, pairClass]) => {
      expect(foreground).toBe("destructive");
      expect(background).not.toBe("destructive");
      expect(pairClass).toBe("boundary");
    });
  });

  it("paints a failed field's edge and ring in the example", () => {
    const example = invalidFocusExample(getTheme("light"));

    expect(example.rest.borderColor).toBe(lightTheme.colors.destructive);
    expect(example.rest.borderWidth).toBe(lightTheme.borderWidth.thin);
    expect(example.focused).toEqual(invalidFocusRing(lightTheme));
  });
});
