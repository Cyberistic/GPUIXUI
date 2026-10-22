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
import {
  ThemeProvider,
  messageLink,
  pressWash,
  tone,
  toneSurface,
  useTheme,
} from "./theme.js";

/** The package's `src/` directory: this file lives one level below it. */
const sourceRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, sourceRoot)), "utf8");

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

/** The sixteen styles the token package ships: base, high contrast, platform, look. */
const everyStyle: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", Tokens.highContrastLightTheme],
  ["high-contrast dark", Tokens.highContrastDarkTheme],
  ...Arr.flatMap(Tokens.platformNames, (name) => [
    [`${name} light`, Tokens.platformTheme(lightTheme, name)] as const,
    [`${name} dark`, Tokens.platformTheme(darkTheme, name)] as const,
  ]),
  ...Arr.flatMap(Tokens.retroNames, (look) => [
    [`${look} light`, Tokens.retroTheme(lightTheme, look)] as const,
    [`${look} dark`, Tokens.retroTheme(darkTheme, look)] as const,
  ]),
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

describe("messageLink", () => {
  const tones = ["info", "success", "warning", "danger"] as const;

  /** The role each component tone paints as its soft surface. */
  const softRoles = {
    info: "infoSoft",
    success: "successSoft",
    warning: "warningSoft",
    danger: "destructiveSoft",
  } as const;

  it("derives against the tone's own soft role", () => {
    Arr.forEach(everyStyle, ([name, theme]) => {
      Arr.forEach(tones, (value) => {
        expect(messageLink(theme, value), `${name} ${value}`).toBe(
          Tokens.brandTextOn(theme, softRoles[value]),
        );
      });
    });
  });

  it("repairs the tint the shared page colour cannot read", () => {
    // Measured: macOS dark's brand is 3.43:1 on its own `warningSoft`, so a
    // link painted the page's colour would be the one label in the message
    // nobody can read.
    const macOSDark = Tokens.platformTheme(darkTheme, "darwin");
    const shared = Tokens.brandText(macOSDark);
    const tint = macOSDark.colors.warningSoft;
    const floor = Tokens.contrastFloorsFor(macOSDark).secondary;

    expect(Tokens.contrastRatio(shared, tint)).toBeLessThan(floor);

    const derived = messageLink(macOSDark, "warning");
    expect(derived).not.toBe(shared);
    expect(Tokens.contrastRatio(derived, tint)).toBeGreaterThanOrEqual(floor);
  });

  it("holds every tone on its own tint in every shipped style", () => {
    const problems = Arr.flatMap(everyStyle, ([name, theme]) =>
      Arr.flatMap(tones, (value) => {
        const ratio = Tokens.contrastRatio(
          messageLink(theme, value),
          tone(theme, value).bg,
        );
        const floor = Tokens.contrastFloorsFor(theme).secondary;
        return ratio === undefined || ratio < floor
          ? [`${name} ${value}: ${ratio ?? "unmeasurable"}`]
          : [];
      }),
    );

    expect(problems).toEqual([]);
  });
});

describe("pressWash", () => {
  const replacements = ["accent", "hover"] as const;

  it("derives each press against the wash it replaces", () => {
    Arr.forEach(everyStyle, ([name, theme]) => {
      Arr.forEach(replacements, (replaced) => {
        const pressed = pressWash(theme, replaced);
        expect(pressed, `${name} ${replaced}`).toBe(
          Tokens.pointerWash(theme, "active", replaced),
        );
        expect(
          Tokens.contrastRatio(pressed, theme.colors[replaced]) ?? 0,
          `${name} ${replaced}`,
        ).toBeGreaterThanOrEqual(Tokens.decorativeFloor);
      });
    });
  });

  it("paints the authored role where the palette already answers the pointer", () => {
    // Zero is a step: the derivation only moves a palette that cannot answer.
    Arr.forEach(themes, ([name, theme]) => {
      Arr.forEach(replacements, (replaced) => {
        expect(pressWash(theme, replaced), `${name} ${replaced}`).toBe(
          theme.colors.active,
        );
      });
    });
  });

  it("repairs the shipped styles whose press was the wash it replaced", () => {
    // Measured over the sixteen styles: six painted the press in the wash the
    // row already wore (Light · macOS's `active` sat 1.026:1 from the `accent`
    // a hovered list row wears), and Light · macOS's press in its `hover` made
    // seven. Each is repaired by the derivation and not by the role.
    const repaired = [
      ["Light · macOS", Tokens.platformTheme(lightTheme, "darwin"), "accent"],
      ["Dark · macOS", Tokens.platformTheme(darkTheme, "darwin"), "accent"],
      ["Dark · Linux", Tokens.platformTheme(darkTheme, "linux"), "accent"],
      ["Dark · Windows", Tokens.platformTheme(darkTheme, "win32"), "accent"],
      [
        "Windows XP (Luna) light",
        Tokens.retroTheme(lightTheme, "luna"),
        "accent",
      ],
      [
        "Windows 7 (Aero) light",
        Tokens.retroTheme(lightTheme, "aero"),
        "accent",
      ],
      [
        "Light · macOS hover",
        Tokens.platformTheme(lightTheme, "darwin"),
        "hover",
      ],
    ] as const;

    Arr.forEach(repaired, ([name, theme, replaced]) => {
      const strip = theme.colors[replaced];
      expect(
        Tokens.contrastRatio(theme.colors.active, strip) ?? 0,
        name,
      ).toBeLessThan(Tokens.decorativeFloor);
      expect(
        Tokens.contrastRatio(pressWash(theme, replaced), strip) ?? 0,
        name,
      ).toBeGreaterThanOrEqual(Tokens.decorativeFloor);
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
      readdirSync(fileURLToPath(sourceRoot), {
        recursive: true,
        encoding: "utf8",
      }),
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
