/**
 * The theme seam.
 *
 * The bugs these guard: the seam once mixed its own tone palette — `accent` for
 * `info`, a hand-picked warning shade — so a token change did not reach Alert,
 * Badge or Toast; and it carried its own alpha, focus-ring and elevation
 * helpers, so the package silently diverged from `@gpuixui/tokens`. The seam is
 * now the `danger` → `destructive` name adapter and nothing else.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  alpha,
  darkTheme,
  elevationShadow,
  focusRing,
  lightTheme,
  statusTone,
  type Theme,
} from "@gpuixui/tokens";
import * as Tokens from "@gpuixui/tokens";
import { tone, toneSurface } from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

describe("tone", () => {
  it("reads the status roles the token palette designs for each tone", () => {
    Arr.forEach(themes, ([, theme]) => {
      expect(tone(theme, "info")).toEqual({
        bg: theme.colors.infoSoft,
        border: statusTone(theme, "info").border,
        fg: theme.colors.infoSoftForeground,
      });
      expect(tone(theme, "success").bg).toBe(theme.colors.successSoft);
      expect(tone(theme, "warning").bg).toBe(theme.colors.warningSoft);
    });
  });

  it("maps the component name danger to the token role destructive", () => {
    Arr.forEach(themes, ([, theme]) => {
      const danger = tone(theme, "danger");
      expect(danger.bg).toBe(theme.colors.destructiveSoft);
      expect(danger.fg).toBe(theme.colors.destructiveSoftForeground);
      expect(danger).toEqual({
        bg: statusTone(theme, "destructive").background,
        border: statusTone(theme, "destructive").border,
        fg: statusTone(theme, "destructive").foreground,
      });
    });
  });

  it("changes every tone between light and dark", () => {
    Arr.forEach(["info", "success", "warning", "danger"] as const, (value) => {
      expect(tone(lightTheme, value)).not.toEqual(tone(darkTheme, value));
    });
  });

  it("keeps text and fill distinct for every tone", () => {
    Arr.forEach(themes, ([, theme]) => {
      Arr.forEach(
        ["info", "success", "warning", "danger"] as const,
        (value) => {
          const style = tone(theme, value);
          expect(style.fg).not.toBe(style.bg);
        },
      );
    });
  });
});

describe("toneSurface", () => {
  it("paints the mapped fill, text and tinted border at the thin width", () => {
    Arr.forEach(themes, ([, theme]) => {
      const style = toneSurface(theme, "danger");
      expect(style).toEqual({
        backgroundColor: theme.colors.destructiveSoft,
        color: theme.colors.destructiveSoftForeground,
        borderWidth: theme.borderWidth.thin,
        borderColor: alpha(theme.colors.destructive, 0.3),
      });
    });
  });
});

describe("the seam re-exports the token helpers", () => {
  it("is the token package's own function, not a local copy", () => {
    expect(focusRing).toBe(Tokens.focusRing);
    expect(elevationShadow).toBe(Tokens.elevationShadow);
    expect(alpha).toBe(Tokens.alpha);
    expect(statusTone).toBe(Tokens.statusTone);
  });
});
