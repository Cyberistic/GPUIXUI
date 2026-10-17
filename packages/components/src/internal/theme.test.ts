/**
 * The theme adapter.
 *
 * The bugs these guard: `withAlpha` produced a two-digit alpha for a value like
 * `0.3` (`0.3 * 255 = 76.5` → `"4C"`, but a plain `toString(16)` on a small
 * number yields one digit and a malformed colour); `warning` borrowed the light
 * theme's `amber[400]` for text on a pale tint and failed contrast; and `tone`
 * read a hard-coded role instead of the theme, so it did not change between
 * light and dark.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import { darkTheme, lightTheme, type Theme } from "@gpuixui/tokens";
import { focusRing, interactionFill, tone, withAlpha } from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

/** A colour token: `#RRGGBB`, or `#RRGGBBAA` where the role carries its own alpha. */
const ColorToken = Schema.String.check(
  Schema.isPattern(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
);

describe("withAlpha", () => {
  it("appends a two-digit alpha byte", () => {
    expect(withAlpha("#123456", 0)).toBe("#12345600");
    expect(withAlpha("#123456", 1)).toBe("#123456FF");
    expect(withAlpha("#123456", 0.3)).toBe("#1234564D");
  });

  it("pads a byte that would otherwise be a single digit", () => {
    // 0.02 * 255 = 5.1 -> "05", not "5": a one-digit byte makes an invalid colour.
    expect(withAlpha("#123456", 0.02).slice(-2)).toBe("05");
  });

  it("clamps out-of-range alpha", () => {
    expect(withAlpha("#123456", -1)).toBe("#12345600");
    expect(withAlpha("#123456", 4)).toBe("#123456FF");
  });

  it("returns a colour it cannot parse unchanged rather than transparent", () => {
    expect(withAlpha("oklch(0.5 0 0)", 0.5)).toBe("oklch(0.5 0 0)");
    expect(withAlpha("#abc", 0.5)).toBe("#abc");
  });
});

describe("theme colours", () => {
  it("gives every role a hex colour in both themes", () => {
    Arr.forEach(themes, ([name, theme]) => {
      Arr.forEach(Object.entries(theme.colors), ([role, value]) => {
        expect(
          Schema.is(ColorToken)(value),
          `${name}.${role} is ${value}`,
        ).toBe(true);
      });
    });
  });
});

describe("tone", () => {
  it("uses the theme's solid role for the text, fill and border", () => {
    Arr.forEach(themes, ([, theme]) => {
      expect(tone(theme, "danger").fg).toBe(theme.colors.destructive);
      expect(tone(theme, "danger").bg).toBe(`${theme.colors.destructive}14`);
      expect(tone(theme, "success").fg).toBe(theme.colors.success);
    });
  });

  it("borrows accent for info, which has no role of its own", () => {
    Arr.forEach(themes, ([, theme]) => {
      expect(tone(theme, "info").bg).toBe(`${theme.colors.accent}14`);
    });
  });

  it("uses the warning foreground in light mode for readable contrast", () => {
    expect(tone(lightTheme, "warning").fg).toBe(
      lightTheme.colors.warningForeground,
    );
  });

  it("uses the warning role itself in dark mode", () => {
    expect(tone(darkTheme, "warning").fg).toBe(darkTheme.colors.warning);
  });

  it("changes with the mode", () => {
    expect(tone(lightTheme, "danger").fg).not.toBe(
      tone(darkTheme, "danger").fg,
    );
    expect(tone(lightTheme, "info").bg).not.toBe(tone(darkTheme, "info").bg);
  });
});

describe("focusRing", () => {
  it("draws the ring outside the border box in the theme's ring colour", () => {
    Arr.forEach(themes, ([, theme]) => {
      const ring = focusRing(theme);
      expect(ring.outlineColor).toBe(theme.colors.ring);
      expect(ring.outlineWidth).toBe(theme.borderWidth.strong);
      expect(ring.outlineOffset).toBe(-theme.borderWidth.strong);
    });
  });
});

describe("interactionFill", () => {
  it("uses the theme's hover and active roles", () => {
    Arr.forEach(themes, ([, theme]) => {
      const fill = interactionFill(theme);
      expect(fill.hover).toEqual({ backgroundColor: theme.colors.hover });
      expect(fill.active).toEqual({ backgroundColor: theme.colors.active });
    });
  });
});
