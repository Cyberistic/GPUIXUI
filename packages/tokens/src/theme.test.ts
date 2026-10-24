/**
 * Guards the extension contract: overrides merge without mutating the base,
 * typography merges field by field, elevation replaces whole levels, a density
 * override merges each control size rather than replacing the record, a theme
 * can never change its mode through an override, and `createTheme` starts from
 * the contrast variant the caller asked for — every group's `undefined` inherits
 * rather than erasing a role.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandLightTheme, brandTheme } from "./brand-theme.example.js";
import { almostBrandAudit } from "./theme-audit.example.js";
import { resolveBrandTheme, resolveTheme } from "./high-contrast.example.js";
import { densityNames, densityPresets, type BoxShadow } from "./index.js";
import { pageMode, relativeLuminance } from "./luminance.js";
import {
  auditTheme,
  createTheme,
  darkTheme,
  extendTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  invalidNumbers,
  lightTheme,
  platformNames,
  platformTheme,
  seriesColors,
  switchFailures,
  syntaxColors,
  themeContrasts,
  themeModeOf,
  themeModes,
  themes,
  type PlatformName,
  type SwitchColors,
  type Theme,
  type ThemeContrast,
  type ThemeMode,
  type ThemeOverrides,
} from "./index.js";

describe("built-in themes", () => {
  it("maps modes to the shipped themes", () => {
    expect(getTheme("light")).toBe(lightTheme);
    expect(getTheme("dark")).toBe(darkTheme);
    expect(themes.light).toBe(lightTheme);
    expect(themes.dark).toBe(darkTheme);
  });

  it("carries the matching mode", () => {
    expect(lightTheme.mode).toBe("light");
    expect(darkTheme.mode).toBe("dark");
  });
});

/**
 * A mode, a contrast variant and a platform name are stored preferences before
 * they are literals, so a value this release does not ship reaches a resolver
 * through a decoder or a cast. The lookups took them on the type's word: an
 * unshipped mode answered `undefined`, an unrecognised contrast painted the
 * **default** palette — a restored `HIGH` silently losing its contrast — and an
 * unshipped platform threw `Cannot read properties of undefined (reading
 * 'contrast')` from inside `applyStyle`.
 */
describe("a resolver refuses an axis value this release does not ship", () => {
  it("names an unshipped mode instead of answering undefined", () => {
    // The cast is the storage boundary: a settings row is unknown input.
    const stored = JSON.parse('"solar"') as ThemeMode;

    expect(() => getTheme(stored)).toThrow(/`solar` is not a theme mode/);
    expect(() => getTheme(stored)).toThrow(/isThemeMode/);
    // The membership test is the guard's, so no shipped mode is refused.
    themeModes.forEach((mode) => {
      expect(getTheme(mode).mode).toBe(mode);
    });
  });

  it("names an unshipped contrast variant instead of painting the default", () => {
    const stored = JSON.parse('"HIGH"') as ThemeContrast;

    expect(() => getTheme("dark", stored)).toThrow(/`HIGH` is not a contrast/);
    expect(() => getTheme("dark", stored)).toThrow(/isThemeContrast/);
    themeContrasts.forEach((contrast) => {
      expect(getTheme("dark", contrast).contrast).toBe(contrast);
    });
  });

  it("names an unshipped platform instead of reading an absent style", () => {
    const stored = JSON.parse('"beos"') as PlatformName;

    expect(() => platformTheme(lightTheme, stored)).toThrow(
      /`beos` is not a platform style/,
    );
    expect(() => platformTheme(lightTheme, stored)).toThrow(/isPlatformName/);
    platformNames.forEach((platform) => {
      expect(platformTheme(lightTheme, platform).mode).toBe("light");
    });
  });
});

/**
 * Guards the mode a stored theme is read as.
 *
 * A theme is documented as storable, so `theme.mode` is unknown input before it
 * is a union: an upper-cased `Dark`, a release's old name, a theme another app
 * wrote. Every seam that branches on it compared `mode === "dark"`, so a dark
 * palette stored that way was handed the **light** categorical scale and the
 * light syntax palette, and `applyStyle` picked no palette at all from the
 * platform style — it applied the radii and families but not the colours.
 * `themeModeOf` reads a value this release does not ship from the page the
 * theme carries, which is the one question a palette can answer by itself.
 */
describe("a theme mode this release does not ship", () => {
  const stored = (mode: unknown, base: Theme): Theme =>
    ({ ...base, mode }) as Theme;

  it("reads a shipped mode as it is and another from the page", () => {
    themeModes.forEach((mode) =>
      expect(themeModeOf(getTheme(mode)), mode).toBe(mode),
    );
    expect(themeModeOf(stored("Dark", darkTheme))).toBe("dark");
    expect(themeModeOf(stored("LIGHT", lightTheme))).toBe("light");
    // A theme a store lost the field on has only its page to answer with.
    expect(themeModeOf(stored(undefined, darkTheme))).toBe("dark");
    expect(themeModeOf(stored(null, lightTheme))).toBe("light");
  });

  it("keeps the default mode when no colour grammar reads the page", () => {
    const unreadable = stored("solar", {
      ...darkTheme,
      colors: { ...darkTheme.colors, background: "oklch(0.2 0 0)" },
    });

    expect(themeModeOf(unreadable)).toBe("light");
  });

  it("applies a platform style's palette in the mode its page implies", () => {
    platformNames.forEach((platform) => {
      expect(
        platformTheme(stored("Dark", darkTheme), platform).colors,
        platform,
      ).toEqual(platformTheme(darkTheme, platform).colors);
      expect(
        platformTheme(stored("LIGHT", lightTheme), platform).colors,
        platform,
      ).toEqual(platformTheme(lightTheme, platform).colors);
    });
  });

  it("is taught where the seam and its fallback are", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const pages = [
      read("../../../docs/tokens.md"),
      read("../../../docs/design-system.md"),
      read("../README.md"),
    ];

    pages.forEach((page) => {
      expect(page).toContain("themeModeOf");
      expect(page).toContain("the page it carries");
    });
  });

  it("prints the direction the page rule answers, not the opposite one", () => {
    // A page nearer white is a *light* theme's page: its dark ink is designed
    // to read on it. Every surface taught the fallback said the opposite — a
    // page nearer white was "a dark theme's page" — so a reader learned the
    // inverted rule from the seam, both pages, the README and the inventory.
    const lightPage = lightTheme.colors.background;
    const darkPage = darkTheme.colors.background;
    expect(pageMode(lightPage)).toBe("light");
    expect(pageMode(darkPage)).toBe("dark");
    expect(relativeLuminance(lightPage) ?? 0).toBeGreaterThan(
      relativeLuminance(darkPage) ?? 1,
    );

    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const surfaces: Readonly<Record<string, string>> = {
      "docs/tokens.md": read("../../../docs/tokens.md"),
      "docs/design-system.md": read("../../../docs/design-system.md"),
      "packages/tokens/README.md": read("../README.md"),
      "packages/tokens/src/theme.ts": read("./theme.ts"),
      "packages/tokens/src/luminance.ts": read("./luminance.ts"),
      "COMPONENTS.md": read("../../../COMPONENTS.md"),
    };
    Object.entries(surfaces).forEach(([name, text]) => {
      expect(text, name).toContain(
        "a fill closer to white is a light theme's page",
      );
      expect(text, name).not.toContain(
        "a fill closer to white is a dark theme's page",
      );
    });
  });
});

describe("high-contrast themes", () => {
  it("maps modes to the high-contrast themes", () => {
    expect(getTheme("light", "high")).toBe(highContrastLightTheme);
    expect(getTheme("dark", "high")).toBe(highContrastDarkTheme);
    expect(getTheme("light", "default")).toBe(lightTheme);
    expect(highContrastThemes.light).toBe(highContrastLightTheme);
    expect(highContrastThemes.dark).toBe(highContrastDarkTheme);
  });

  it("keeps the light/dark mode of its canvas", () => {
    expect(highContrastLightTheme.mode).toBe("light");
    expect(highContrastDarkTheme.mode).toBe("dark");
  });

  it("is named so a preview can label it", () => {
    expect(highContrastLightTheme.name).toBe("High contrast light");
    expect(highContrastDarkTheme.name).toBe("High contrast dark");
  });

  it("composes through the normal extension mechanism", () => {
    const custom = extendTheme(highContrastLightTheme, {
      colors: { primary: "#123456" },
      density: "compact",
    });
    expect(custom.mode).toBe("light");
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(
      highContrastLightTheme.colors.background,
    );
    expect(custom.density.name).toBe("compact");
  });

  it("is selected by the accessibility preference", () => {
    expect(resolveTheme("dark", true)).toBe(highContrastDarkTheme);
    expect(resolveTheme("dark", false)).toBe(darkTheme);
    expect(resolveTheme("light", true)).toBe(highContrastLightTheme);
  });

  it("carries a brand's overrides onto the palette the preference selects", () => {
    const high = resolveBrandTheme("dark", true, { primary: "#9FBEFF" });
    expect(high.contrast).toBe("high");
    expect(high.colors.primary).toBe("#9FBEFF");
    expect(high.colors.background).toBe(
      highContrastDarkTheme.colors.background,
    );
    const ordinary = resolveBrandTheme("dark", false, { primary: "#9FBEFF" });
    expect(ordinary.contrast).toBe("default");
    expect(ordinary.colors.background).toBe(darkTheme.colors.background);
  });
});

describe("extendTheme", () => {
  it("returns a new theme equal to the base when nothing is overridden", () => {
    const copy = extendTheme(darkTheme, {});
    expect(copy).not.toBe(darkTheme);
    expect(copy).toEqual(darkTheme);
  });

  it("applies a colour override and leaves the other roles alone", () => {
    const custom = createTheme({
      mode: "light",
      colors: { primary: "#123456" },
    });
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(lightTheme.colors.background);
    expect(lightTheme.colors.primary).not.toBe("#123456");
  });

  it("accepts a weight between or above the shipped steps", () => {
    // The runtime clamps any numeric weight into 1–1000, so a variable face's
    // 450 and a display role's 800 are decisions it paints. The type is a
    // number for that reason; `invalidNumbers` is what holds it finite.
    const variable = extendTheme(lightTheme, {
      typography: { body: { fontWeight: 450 }, display: { fontWeight: 800 } },
    });
    expect(variable.typography.body.fontWeight).toBe(450);
    expect(variable.typography.display.fontWeight).toBe(800);
    expect(invalidNumbers(variable)).toEqual([]);
  });

  it("merges a text role field by field", () => {
    const custom = extendTheme(lightTheme, {
      typography: { body: { fontSize: 15 } },
    });
    expect(custom.typography.body.fontSize).toBe(15);
    expect(custom.typography.body.lineHeight).toBe(
      lightTheme.typography.body.lineHeight,
    );
    expect(custom.typography.body.fontWeight).toBe(
      lightTheme.typography.body.fontWeight,
    );
  });

  it("replaces a whole elevation level", () => {
    const shadow: BoxShadow = {
      offsetX: 0,
      offsetY: 2,
      blurRadius: 4,
      spreadRadius: 0,
      color: "#000000",
    };
    const custom = extendTheme(lightTheme, { elevation: { md: [shadow] } });
    expect(custom.elevation.md).toEqual([shadow]);
    expect(custom.elevation.sm).toBe(lightTheme.elevation.sm);
  });

  it("replaces the switch a platform style declares, whole", () => {
    // The switch is a value of the theme, not a fixed control: a consumer that
    // starts from a platform style and owns its toggle names all three slots,
    // because a half-declared one paints the slots it lost with nothing.
    const apple = platformTheme(darkTheme, "darwin");
    expect(apple.switch).toBeDefined();
    const house: SwitchColors = {
      on: "#4ADE80",
      off: "#3B3B40",
      knob: "#FFFFFF",
    };
    const custom = extendTheme(apple, { switch: house });
    expect(custom.switch).toEqual(house);
    expect(apple.switch).not.toEqual(house);
    // Both the base and the brand are held to the report the override exists to
    // satisfy, so a documented brand cannot ship a toggle nobody can find.
    expect(switchFailures(custom).placements).toEqual([]);
  });

  it("keeps the switch a theme already carries when the override names none", () => {
    const apple = platformTheme(darkTheme, "darwin");
    const custom = extendTheme(apple, { colors: { primary: "#123456" } });
    expect(custom.switch).toBe(apple.switch);
  });

  it("declares a switch on a theme that carries none", () => {
    // A theme without a switch paints the accent toggle; an override can give it
    // the platform paint without starting from a platform style.
    expect(lightTheme.switch).toBeUndefined();
    const custom = extendTheme(lightTheme, {
      switch: { on: "#16A34A", off: "#DCDCE1", knob: "#FFFFFF" },
    });
    expect(custom.switch?.on).toBe("#16A34A");
    expect(switchFailures(custom).placements).toEqual([]);
  });

  it("applies a density preset", () => {
    const custom = extendTheme(lightTheme, { density: "compact" });
    expect(custom.density).toEqual(densityPresets.compact);
  });

  /**
   * A preset name is a stored preference as often as a literal, so a name this
   * release does not ship reaches the merge through a decoder or a cast. The
   * lookup used to answer `undefined`, `extendTheme` returned a theme with **no**
   * density group, and the first control beside it read `Cannot read properties
   * of undefined (reading 'controlHeight')` — the failure the presence rule
   * exists to prevent, with a gate message telling the caller to rebuild a theme
   * they had just built with `extendTheme`.
   */
  it("refuses a density preset this release does not ship", () => {
    // The cast is the storage boundary: a settings row is unknown input.
    const stored = JSON.parse('{"density":"cosy"}') as ThemeOverrides;

    expect(() => extendTheme(lightTheme, stored)).toThrow(
      /`cosy` is not a density preset: compact, comfortable, spacious/,
    );
    // The membership test is the guard's, so it cannot reject a shipped preset.
    densityNames.forEach((name) => {
      expect(extendTheme(lightTheme, { density: name }).density).toEqual(
        densityPresets[name],
      );
    });
  });

  it("keeps the base density name for a partial override", () => {
    const custom = extendTheme(lightTheme, { density: { rowHeight: 30 } });
    expect(custom.density.rowHeight).toBe(30);
    expect(custom.density.name).toBe("comfortable");
    expect(custom.density.controlHeight.md).toBe(
      densityPresets.comfortable.controlHeight.md,
    );
  });

  /**
   * A size is a step in a record, and the documented override names one size
   * (`invalidNumbers`' own example raises `controlHeight.sm`). The merge used
   * to overlay the record whole, so a brand that changed one size erased the
   * two it did not name — and the audit gate refuses a theme missing a step,
   * which turned the documented snippet into a thrown audit.
   */
  describe("a partial density override", () => {
    it("merges the control sizes it does not name", () => {
      const custom = extendTheme(lightTheme, {
        density: { controlHeight: { sm: 20 } },
      });
      expect(custom.density.controlHeight).toEqual({ sm: 20, md: 32, lg: 36 });
      expect(custom.density.controlPaddingX).toEqual(
        densityPresets.comfortable.controlPaddingX,
      );
      expect(custom.density.name).toBe("comfortable");
    });

    it("merges the padding sizes it does not name", () => {
      const custom = extendTheme(lightTheme, {
        density: { controlPaddingX: { md: 20 } },
      });
      expect(custom.density.controlPaddingX).toEqual({ sm: 8, md: 20, lg: 12 });
      expect(custom.density.controlHeight).toEqual(
        densityPresets.comfortable.controlHeight,
      );
    });

    it("reports the size a brand shrank, not the sizes it inherited", () => {
      const custom = extendTheme(lightTheme, {
        density: { controlHeight: { sm: 20 } },
      });
      expect(invalidNumbers(custom)).toEqual([
        {
          group: "density",
          path: "controlHeight.sm",
          value: 20,
          rule: "pressable",
        },
      ]);
    });

    it("raises one size without restating the others", () => {
      const custom = extendTheme(lightTheme, {
        density: { controlHeight: { md: 34 } },
      });
      expect(custom.density.controlHeight).toEqual({ sm: 28, md: 34, lg: 36 });
      expect(auditTheme(custom).passed).toBe(true);
    });

    it("inherits a size an override forwards as undefined", () => {
      const custom = extendTheme(lightTheme, {
        density: { controlHeight: { sm: undefined } },
      });
      expect(custom.density.controlHeight).toEqual(
        densityPresets.comfortable.controlHeight,
      );
    });
  });

  it("does not mutate the base theme", () => {
    const before = JSON.stringify(lightTheme);
    extendTheme(lightTheme, {
      name: "Changed",
      colors: { primary: "#000000" },
      radius: { md: 2 },
      density: "spacious",
      typography: { body: { fontSize: 99 } },
    });
    expect(JSON.stringify(lightTheme)).toBe(before);
  });

  it("never changes the mode of the base theme", () => {
    expect(extendTheme(darkTheme, { name: "Still dark" }).mode).toBe("dark");
    expect(extendTheme(lightTheme, { name: "Still light" }).mode).toBe("light");
  });
});

describe("createTheme", () => {
  it("builds the matching built-in theme by default", () => {
    const created = createTheme({ mode: "dark" });
    expect(created).not.toBe(darkTheme);
    expect(created).toEqual(darkTheme);
  });

  it("applies the name override", () => {
    expect(createTheme({ mode: "dark", name: "Acme" }).name).toBe("Acme");
    expect(createTheme({ mode: "light" }).name).toBe("Light");
  });

  it("starts from the requested contrast variant", () => {
    const high = createTheme({ mode: "dark", contrast: "high" });
    expect(high).toEqual(highContrastDarkTheme);
    expect(high.contrast).toBe("high");
    expect(high.colors.background).not.toBe(darkTheme.colors.background);
  });

  it("applies overrides over the requested high-contrast base", () => {
    const custom = createTheme({
      mode: "light",
      contrast: "high",
      colors: { primary: "#123456" },
    });
    expect(custom.contrast).toBe("high");
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(
      highContrastLightTheme.colors.background,
    );
  });

  it("defaults to the default-contrast palette", () => {
    expect(createTheme({ mode: "light" }).contrast).toBe("default");
  });
});

/**
 * Guards the merge defect this suite found: an override carrying an explicit
 * `undefined` — an optional value a caller forwarded unchanged, which the
 * compiler allows because the groups are optional properties — overwrote a
 * complete role with nothing. The theme still type-checked, so a brand that
 * forwarded a missing colour shipped a palette with a role the renderer could
 * not paint. Omitted and `undefined` now both inherit.
 */
describe("an override that names a value as absent", () => {
  it("keeps the base colour rather than erasing the role", () => {
    const custom = extendTheme(darkTheme, { colors: { primary: undefined } });
    expect(custom.colors.primary).toBe(darkTheme.colors.primary);
    expect(custom.colors.primary).toBeDefined();
  });

  it("inherits in every group a theme carries", () => {
    const custom = extendTheme(darkTheme, {
      colors: { background: undefined },
      spacing: { md: undefined },
      radius: { md: undefined },
      borderWidth: { thin: undefined },
      iconSize: { md: undefined },
      typography: { body: { fontSize: undefined } },
      density: { rowHeight: undefined },
    });
    expect(custom.colors.background).toBe(darkTheme.colors.background);
    expect(custom.spacing.md).toBe(darkTheme.spacing.md);
    expect(custom.radius.md).toBe(darkTheme.radius.md);
    expect(custom.borderWidth.thin).toBe(darkTheme.borderWidth.thin);
    expect(custom.iconSize.md).toBe(darkTheme.iconSize.md);
    expect(custom.typography.body.fontSize).toBe(
      darkTheme.typography.body.fontSize,
    );
    expect(custom.density.rowHeight).toBe(darkTheme.density.rowHeight);
  });

  it("keeps a defined override beside an absent one", () => {
    const custom = extendTheme(darkTheme, {
      colors: { primary: "#123456", background: undefined },
      radius: { md: 2, lg: undefined },
    });
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(darkTheme.colors.background);
    expect(custom.radius.md).toBe(2);
    expect(custom.radius.lg).toBe(darkTheme.radius.lg);
  });

  it("inherits the switch a theme carries rather than erasing it", () => {
    // `applyStyle` clears a look's switch on purpose, but an extension that
    // forwards an optional paint as `undefined` must not drop the base's.
    const apple = platformTheme(darkTheme, "darwin");
    const custom = extendTheme(apple, { switch: undefined });
    expect(custom.switch).toBe(apple.switch);
  });
});

/**
 * JSON has no `undefined`: a theme restored from a store carries `null` for a
 * group it never carried and for a role it never filled, and the same is true of
 * the partial a consumer assembles to rebuild one. `undefined` already inherits,
 * so `null` — the shape the store actually hands back — must inherit too rather
 * than reaching a merge as a value: `extendTheme(lightTheme, { colors: null })`
 * threw `TypeError: Cannot convert undefined or null to object` out of `overlay`.
 */
describe("a partial a store handed back", () => {
  it("keeps every group a store wrote as null", () => {
    const base = extendTheme(darkTheme, {});
    const groups = [
      "name",
      "colors",
      "typography",
      "spacing",
      "radius",
      "density",
      "elevation",
      "borderWidth",
      "iconSize",
      "series",
      "syntax",
      "switch",
      "switchMetrics",
    ] as const satisfies readonly (keyof Theme)[];

    const extended = groups.map((group) => ({
      group,
      theme: extendTheme(base, { [group]: null }),
    }));

    expect(
      extended
        .filter(({ group, theme }) => theme[group] !== base[group])
        .map(({ group }) => group),
    ).toEqual([]);
  });

  it("keeps the base role when a store wrote the role as null", () => {
    const custom = extendTheme(darkTheme, {
      colors: { primary: null, background: null },
      spacing: { md: null },
      radius: { md: null },
      borderWidth: { thin: null },
      iconSize: { md: null },
      typography: { sans: null, body: { fontSize: null } },
      density: { rowHeight: null },
      elevation: { sm: null },
    });

    expect(custom.colors.primary).toBe(darkTheme.colors.primary);
    expect(custom.colors.background).toBe(darkTheme.colors.background);
    expect(custom.spacing.md).toBe(darkTheme.spacing.md);
    expect(custom.radius.md).toBe(darkTheme.radius.md);
    expect(custom.borderWidth.thin).toBe(darkTheme.borderWidth.thin);
    expect(custom.iconSize.md).toBe(darkTheme.iconSize.md);
    expect(custom.typography.sans).toBe(darkTheme.typography.sans);
    expect(custom.typography.body.fontSize).toBe(
      darkTheme.typography.body.fontSize,
    );
    expect(custom.density.rowHeight).toBe(darkTheme.density.rowHeight);
    expect(custom.elevation.sm).toBe(darkTheme.elevation.sm);
  });

  it("keeps a defined value beside a nulled one, and retints only a real shadow", () => {
    const custom = extendTheme(darkTheme, {
      colors: { primary: "#123456", shadow: null, background: null },
      radius: { md: 2, lg: null },
    });
    const retinted = extendTheme(darkTheme, { colors: { shadow: "#0B1220" } });

    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(darkTheme.colors.background);
    expect(custom.radius.md).toBe(2);
    expect(custom.radius.lg).toBe(darkTheme.radius.lg);
    // A nulled shadow is absent, so no level is restated in a tint nobody named.
    expect(custom.elevation).toBe(darkTheme.elevation);
    expect(retinted.elevation).not.toBe(darkTheme.elevation);
  });

  it("reads a base a store truncated past a whole group", () => {
    // The cast is the storage boundary: a store hands back the type's shape with
    // groups missing, which is the class `incomplete.test.ts` reports. The merge
    // read each lost group straight off the base, so the type scale threw
    // `Cannot read properties of null (reading 'sans')` and the density box
    // `(reading 'name')` from the one seam a restored brand reaches.
    const stored = (groups: Partial<Record<keyof Theme, unknown>>): Theme =>
      ({ ...darkTheme, ...groups }) as Theme;

    const typeLost = extendTheme(stored({ typography: null }), {
      typography: { body: { fontSize: 15 } },
    });
    expect(typeLost.typography.body.fontSize).toBe(15);
    expect(typeLost.typography.body.lineHeight).toBe(
      darkTheme.typography.body.lineHeight,
    );
    expect(typeLost.typography.sans).toBe(darkTheme.typography.sans);

    const densityLost = extendTheme(stored({ density: null }), {
      density: { rowHeight: 30 },
    });
    expect(densityLost.density.rowHeight).toBe(30);
    expect(densityLost.density.controlHeight).toEqual(
      darkTheme.density.controlHeight,
    );

    const regionLost = extendTheme(
      stored({
        colors: null,
        spacing: null,
        radius: null,
        borderWidth: null,
        iconSize: null,
      }),
      { radius: { md: 6 } },
    );
    expect(regionLost.radius.md).toBe(6);
    // A flat group stays as the base wrote it: the roles an override does not
    // name stay absent for the gate, which is what `paletteToTokens` relies on.
    expect(regionLost.spacing).toBeNull();
    expect(regionLost.colors).toBeNull();

    // A style over the same base completes the two complete types, and invents
    // no flat role: its palette is partial by design, so the gate still names
    // what the restored brand lost.
    const styled = platformTheme(
      stored({ typography: null, density: null, colors: null, radius: null }),
      "darwin",
    );
    const complete = platformTheme(darkTheme, "darwin");
    expect(styled.typography.sans).toBe(complete.typography.sans);
    expect(styled.radius).toEqual(complete.radius);
    expect(styled.density).toEqual(complete.density);
    expect(styled.colors.primary).toBe(complete.colors.primary);
    expect(styled.colors.foreground).toBeUndefined();
    expect(auditTheme(styled).passed).toBe(false);
  });

  it("teaches the shape a store hands back on every surface", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const surfaces: Readonly<Record<string, string>> = {
      "docs/tokens.md": read("../../../docs/tokens.md"),
      "docs/design-system.md": read("../../../docs/design-system.md"),
      "packages/tokens/README.md": read("../README.md"),
      "packages/tokens/src/theme.ts": read("./theme.ts"),
      "COMPONENTS.md": read("../../../COMPONENTS.md"),
    };

    Object.entries(surfaces).forEach(([name, text]) => {
      expect(text, name).toContain("ThemeOverridesSource");
      expect(text, name).toContain("JSON has no `undefined`");
    });
    // A base a store truncated past the two complete types is read as the
    // library's own for the merge; a flat group stays absent for the gate.
    Object.entries(surfaces).forEach(([name, text]) => {
      expect(text, name).toContain("base a store truncated");
      expect(text, name).toContain("reading 'sans'");
      expect(text, name).toContain("flat group");
    });
    expect(surfaces["packages/tokens/src/theme.ts"]).toContain(
      "base.typography ?? identity.typography",
    );
    expect(surfaces["packages/tokens/src/theme.ts"]).toContain(
      "base.density ?? identity.density",
    );
    // The catalogue names the two failures the rule retires, so a reader can
    // tell an absence they fixed from a cast they worked around.
    expect(surfaces["COMPONENTS.md"]).toContain(
      "Cannot convert undefined or null to object",
    );
  });
});

describe("the extension mechanism", () => {
  /**
   * Every group a theme carries except its mode and contrast variant, in the
   * order the catalogue lists them.
   *
   * The list is the test's own inventory: a group added to `Theme` fails
   * `EveryGroupProbed` below until it is named here and given a probe, so the
   * extension promise ("start from a style, edit any value") cannot lose a
   * group to a new optional field.
   */
  const overridableGroups = [
    "name",
    "colors",
    "typography",
    "spacing",
    "radius",
    "density",
    "elevation",
    "borderWidth",
    "iconSize",
    "series",
    "syntax",
    "switch",
    "switchMetrics",
  ] as const satisfies readonly Exclude<keyof Theme, "mode" | "contrast">[];

  type ListedGroup = (typeof overridableGroups)[number];

  /** A group the list does not name, as a build error naming it. */
  type EveryGroupProbed =
    Exclude<
      Exclude<keyof Theme, "mode" | "contrast">,
      ListedGroup
    > extends never
      ? true
      : [
          "a theme group has no probe",
          Exclude<Exclude<keyof Theme, "mode" | "contrast">, ListedGroup>,
        ];

  const everyGroupProbed: EveryGroupProbed = true;
  void everyGroupProbed;

  /** The override each group is reached through, read off the base theme. */
  const overrideProbes = {
    name: () => ({ name: "Probe" }),
    colors: () => ({ colors: { primary: "#123456" } }),
    typography: (base: Theme) => ({
      typography: { body: { fontSize: base.typography.body.fontSize + 1 } },
    }),
    spacing: (base: Theme) => ({ spacing: { md: base.spacing.md + 1 } }),
    radius: (base: Theme) => ({ radius: { md: base.radius.md + 1 } }),
    density: () => ({ density: "spacious" }),
    elevation: (base: Theme) => ({
      elevation: {
        sm: [
          {
            offsetX: 0,
            offsetY: 3,
            blurRadius: 6,
            spreadRadius: 0,
            color: base.colors.shadow,
          },
        ],
      },
    }),
    borderWidth: (base: Theme) => ({
      borderWidth: { thin: base.borderWidth.thin + 1 },
    }),
    iconSize: (base: Theme) => ({ iconSize: { md: base.iconSize.md + 1 } }),
    series: (base: Theme) => {
      const current = seriesColors(base);
      return {
        series: ["#101010", current[1], current[2], current[3], current[4]],
      };
    },
    syntax: (base: Theme) => ({
      syntax: { ...syntaxColors(base), keyword: "#123456" },
    }),
    switch: () => ({
      switch: { on: "#00FF00", off: "#111111", knob: "#FFFFFF" },
    }),
    switchMetrics: () => ({
      switchMetrics: { width: 44, height: 24, knob: 20, inset: 2, border: 1 },
    }),
  } satisfies Record<ListedGroup, (base: Theme) => ThemeOverrides>;

  it("carries every group when nothing is overridden", () => {
    // A group copied by hand in `extendTheme` is one a later group can be
    // forgotten beside: the returned theme names every key, so a group missing
    // from the copy is absent here rather than silently `undefined`.
    const custom = extendTheme(darkTheme, {});

    expect(Object.keys(custom)).toEqual(
      expect.arrayContaining([...overridableGroups, "mode", "contrast"]),
    );
  });

  it("reaches every group, and only the group it names", () => {
    const base = extendTheme(darkTheme, {});
    const extended = overridableGroups.map((group) => ({
      group,
      theme: extendTheme(base, overrideProbes[group](base)),
    }));

    expect(
      extended
        .filter(({ group, theme }) => theme[group] === base[group])
        .map(({ group }) => group),
    ).toEqual([]);

    // A group the override did not name must be the base's, untouched.
    expect(
      extended.flatMap(({ group, theme }) =>
        overridableGroups
          .filter((other) => other !== group && theme[other] !== base[other])
          .map((other) => `${group} reached ${other}`),
      ),
    ).toEqual([]);

    // A mode or a contrast variant is what the numbers mean, so no override
    // may move either; `getTheme` is how a caller asks for the other one.
    expect(
      extended.flatMap(({ group, theme }) =>
        (["mode", "contrast"] as const)
          .filter((fixed) => theme[fixed] !== base[fixed])
          .map((fixed) => `${group} moved ${fixed}`),
      ),
    ).toEqual([]);
  });
});

describe("brand example", () => {
  it("extends the dark theme with a brand palette and compact density", () => {
    expect(brandTheme.mode).toBe("dark");
    expect(brandTheme.name).toBe("Acme");
    expect(brandTheme.colors.primary).toBe("#B49CFF");
    expect(brandTheme.colors.primaryForeground).toBe("#1C1547");
    expect(brandTheme.colors.background).toBe(darkTheme.colors.background);
    expect(brandTheme.radius.md).toBe(8);
    expect(brandTheme.radius.lg).toBe(lightTheme.radius.lg);
    expect(brandTheme.density.name).toBe("compact");
  });

  it("builds the light variant independently", () => {
    expect(brandLightTheme.mode).toBe("light");
    expect(brandLightTheme.name).toBe("Acme Light");
    expect(brandLightTheme.colors.primary).toBe("#6A45F0");
  });
});

describe("theme audit example", () => {
  it("passes every check for the documented brand theme", () => {
    [brandTheme, brandLightTheme].forEach((theme) => {
      expect(auditTheme(theme)).toEqual({
        invalidRoles: [],
        invalidShadows: [],
        invalidNumbers: [],
        scales: [],
        switch: { paint: [], placements: [], metrics: [] },
        contrast: [],
        decorative: [],
        series: { surfaces: [], distinctness: [], deficiencies: [] },
        syntax: [],
        selection: [],
        indicators: [],
        highlight: [],
        disabledFade: [],
        keyboardDim: [],
        passed: true,
      });
    });
  });

  it("names a misspelt fill rather than letting it paint black", () => {
    expect(almostBrandAudit.invalidRoles).toEqual([
      { role: "primary", value: "#7C5CF" },
    ]);
    expect(almostBrandAudit.passed).toBe(false);
  });
});
