import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { keyboardRing, controlRing } from "./focus.js";
import { testTheme } from "./testing/theme.fixture.js";

describe("the control ring has one home", () => {
  const source = readFileSync(new URL("./focus.ts", import.meta.url), "utf8");

  it("asks the tokens package for the rule instead of restating it", () => {
    expect(source).toContain("controlFocusRing(theme");
    expect(source).not.toContain("outlineColor: theme.colors.destructive");
    expect(source).not.toContain("disabled === true ?");
    expect(source).not.toContain("keyboardFocusRing");
  });
});

describe("keyboardRing", () => {
  it("is the tokens' focusVisible outline, never a shadow", () => {
    const ring = keyboardRing(testTheme);
    expect(ring.focusVisible).toEqual(
      keyboardFocusRing(testTheme).focusVisible,
    );
    expect(ring.boxShadow).toBeUndefined();
  });

  it("takes its width from the theme's strong border", () => {
    const widened = {
      ...testTheme,
      borderWidth: { thin: testTheme.borderWidth.thin, strong: 5 },
    };
    expect(keyboardRing(widened).focusVisible?.outlineWidth).toBe(5);
    expect(keyboardRing(testTheme).focusVisible?.outlineWidth).toBe(
      testTheme.borderWidth.strong,
    );
  });

  it("recolours the outline for an invalid control without moving it", () => {
    const invalid = keyboardRing(testTheme, true);
    expect(invalid.focusVisible).toEqual({
      ...keyboardFocusRing(testTheme).focusVisible,
      outlineColor: testTheme.colors.destructive,
    });
    expect(invalid.focusVisible?.outlineOffset).toBe(
      testTheme.borderWidth.strong,
    );
  });
});

describe("controlRing", () => {
  it("is the keyboard ring while the control can act", () => {
    expect(controlRing(testTheme, {})).toStrictEqual(keyboardRing(testTheme));
    expect(controlRing(testTheme, { invalid: true })).toStrictEqual(
      keyboardRing(testTheme, true),
    );
  });

  it("declares nothing for a disabled control", () => {
    expect(controlRing(testTheme, { disabled: true })).toStrictEqual({});
    expect(
      controlRing(testTheme, { disabled: true, invalid: true }),
    ).toStrictEqual({});
  });
});
