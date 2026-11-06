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
  avatarPixels,
  messageLink,
  pressWash,
  tone,
  toneSurface,
  useTheme,
} from "./theme.js";

const sourceRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, sourceRoot)), "utf8");

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

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
    Arr.forEach(themes, ([name, theme]) => {
      Arr.forEach(replacements, (replaced) => {
        expect(pressWash(theme, replaced), `${name} ${replaced}`).toBe(
          theme.colors.active,
        );
      });
    });
  });

  it("repairs the shipped styles whose press was the wash it replaced", () => {
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

    expect(avatarPixels).toBe(Tokens.avatarPixels);
    expect(ThemeProvider).toBe(TokenThemeProvider);
    expect(useTheme).toBe(tokenUseTheme);
  });
});

describe("the provider is the token package's one", () => {
  it("declares no second theme context in the package", () => {
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

describe("the sweeps the seam's documentation prints", () => {
  const softRoles = Arr.map(
    Tokens.statusTones,
    (value) => `${value}Soft` as const,
  );

  const bodyOnTint = (
    theme: Theme,
    role: (typeof softRoles)[number],
  ): number => {
    const fill = theme.colors[role];
    const wash = theme.colors.selection;
    const composed = Tokens.blend(fill, wash, Tokens.alphaOf(wash));
    return Tokens.contrastRatio(theme.colors.foreground, composed) ?? 0;
  };

  it("prints the brand's tint pair the sweep measures, not the pre-look set", () => {
    const under = Arr.filter(
      Arr.flatMap(everyStyle, ([, theme]) =>
        Arr.map(softRoles, (role) => ({
          ratio:
            Tokens.contrastRatio(Tokens.brandText(theme), theme.colors[role]) ??
            0,
          floor: Tokens.contrastFloorsFor(theme).secondary,
        })),
      ),
      ({ ratio, floor }) => ratio < floor,
    ).length;
    const claim = `${under} of the ${everyStyle.length * softRoles.length}`;

    expect(claim).toBe("28 of the 72");
  });

  it("prints the dark placements the designed wash buries", () => {
    const dark = Arr.filter(
      Arr.flatMap(everyStyle, ([, theme]) =>
        Arr.map(softRoles, (role) => ({
          theme,
          body: bodyOnTint(theme, role),
          floor:
            theme.contrast === "high"
              ? Tokens.highContrastFloors.body
              : Tokens.contrastFloors.body,
        })),
      ),
      ({ theme }) => theme.mode === "dark",
    );
    const buried = Arr.filter(dark, ({ body, floor }) => body < floor).length;
    const claim = `${buried} of the ${dark.length} dark tint placements`;

    expect(claim).toBe("32 of the 36 dark tint placements");
  });

  it("prints the press and mark sweeps over every style the package ships", () => {
    const repaired = Arr.filter(
      Arr.flatMap(everyStyle, ([, theme]) =>
        Arr.map(["accent", "hover"] as const, (replaced) => ({
          replaced,
          under:
            (Tokens.contrastRatio(
              theme.colors.active,
              theme.colors[replaced],
            ) ?? Number.POSITIVE_INFINITY) < Tokens.decorativeFloor,
        })),
      ),
      ({ under }) => under,
    );

    expect(
      Arr.filter(repaired, ({ replaced }) => replaced === "accent"),
    ).toHaveLength(6);
    expect(
      Arr.filter(repaired, ({ replaced }) => replaced === "hover"),
    ).toHaveLength(1);

    expect(
      Arr.every(
        everyStyle,
        ([, theme]) =>
          (Tokens.contrastRatio(theme.colors.accent, theme.colors.hover) ??
            Number.POSITIVE_INFINITY) <
          Tokens.contrastFloorsFor(theme).boundary,
      ),
    ).toBe(true);
  });
});
