/**
 * The keyboard ring every control declares at rest.
 *
 * The bug this guards is the workaround it replaces: the ring used to be merged
 * only while a control held focus, as a spread `boxShadow`, so a mouse press
 * painted the same ring as a Tab. `@gpuix/native@0.11.0` declares `focusVisible`
 * with an outline, so the ring is a resting declaration and the runtime decides
 * when to paint it (measured in plan `053`'s `focus-visible` probe).
 */

import { describe, expect, it } from "vitest";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { keyboardRing, controlRing } from "./focus.js";
import { testTheme } from "./testing/theme.fixture.js";

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
    expect(invalid.focusVisible?.outlineOffset).toBe(0);
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
    // The bug: a control disabled while focused keeps the runtime's focus, so a
    // ring declared anyway stayed painted on a control that refuses every key.
    expect(controlRing(testTheme, { disabled: true })).toStrictEqual({});
    expect(
      controlRing(testTheme, { disabled: true, invalid: true }),
    ).toStrictEqual({});
  });
});
