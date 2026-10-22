/**
 * The theme seam.
 *
 * The bugs these guard: the seam once mixed its own tone palette — `accent` for
 * `info`, a hand-picked warning shade — so a token change did not reach Alert,
 * Badge or Toast; it carried its own alpha, focus-ring and elevation helpers, so
 * the package silently diverged from `@gpuixui/tokens`; and a provider of its
 * own would be a second context, so a page mixing this package with the token
 * package (or with primitives) would wrap twice and two themes could disagree.
 * The seam is now the `danger` → `destructive` name adapter, the token helpers
 * and their **one** provider. `node:fs` is a test-time repository read, the
 * boundary `docs-counts.test.ts` and `inventory.test.ts` already use.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
import {
  ThemeProvider as TokenThemeProvider,
  useTheme as tokenUseTheme,
} from "@gpuixui/tokens/react";
import { ThemeProvider, tone, toneSurface, useTheme } from "./theme.js";

/** The package's `src/` directory: this file lives one level below it. */
const sourceRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, sourceRoot)), "utf8");

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
    expect(ThemeProvider).toBe(TokenThemeProvider);
    expect(useTheme).toBe(tokenUseTheme);
  });
});

describe("the provider is the token package's one", () => {
  it("declares no second theme context in the package", () => {
    // The bug: a package-local provider is a second context, so a page that
    // mixes it with `@gpuixui/tokens/react` (or primes' own provider) must
    // wrap twice and two themes can disagree. The seam re-exports one, and
    // this scan keeps a second one from growing back.
    const sources = Arr.filter(
      readdirSync(fileURLToPath(sourceRoot), { recursive: true }),
      (entry) =>
        (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
        !entry.endsWith(".test.ts") &&
        !entry.endsWith(".test.tsx"),
    );
    const ownProviders = Arr.filter(
      sources,
      (file) =>
        file !== "internal/theme.ts" &&
        /ThemeContext|MissingThemeProviderError/.test(read(file)),
    );

    expect(ownProviders).toEqual([]);
    expect(read("internal/theme.ts")).not.toContain("createContext");
  });
});
