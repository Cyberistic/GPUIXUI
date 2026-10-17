/**
 * Guards the defect fixed in plan 063: a "platform style" used to change only
 * the font families, so a Windows preview still had macOS radii and an iris
 * accent, and the mission's macOS/Linux/Windows variants did not exist. The
 * suite now holds every shipped variant to the same contrast floors as the
 * identity and proves that the Default variant is the identity, untouched.
 *
 * Plan 051's original contract is still covered: the family table names one
 * installed family per platform and never a comma stack.
 *
 * Plan 076 adds the regression: a variant changes the canvas but inherited the
 * identity's soft status tints, so nine pairs sat below the 1.05:1 floor — Linux
 * dark's `destructiveSoft` measured 1.005:1 on its card. The contract now holds
 * the soft surfaces and dividers, so the generic loop below checks them on each
 * variant's own canvas; no variant-specific assertion is needed.
 *
 * Plan 078 adds the same defect one role over: the loading skeleton inherited the
 * identity's grey while the card changed, so Linux dark's `skeleton` measured
 * 1.004:1 on its own card. The surface pairs now include it, and each real
 * variant carries its own dark neutral, so the generic loop guards it too.
 *
 * Plan 079 adds secondary text on the state washes: macOS dark's
 * `mutedForeground` measured 4.41:1 on `hover` and 3.55:1 on `active`. The four
 * washes are pairs now and the variant's values moved, so the generic loop
 * guards them on every platform's own canvas.
 */

import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import {
  currentPlatform,
  platformNames,
  platformStyles,
  platformTypes,
  systemMonoFamily,
  systemUiFont,
  type PlatformStyle,
} from "./platforms.js";
import {
  resolveDensePlatformTheme,
  resolvePlatformTheme,
} from "./platforms.example.js";
import {
  contosoPlatformStyle,
  resolveAuthoredPlatformStyle,
  resolveEditedPlatformTheme,
} from "./platform-styles.example.js";
import { densityPresets } from "./scale.js";
import { textStyle } from "./styles.js";
import {
  applyPlatformStyle,
  darkTheme,
  extendTheme,
  getPlatformTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  themeModes,
  themes,
} from "./theme.js";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  themeContrastFailures,
  type ContrastPairClass,
} from "./contrast.js";
import { typography } from "./typography.js";

const variants = ["darwin", "linux", "win32"] as const;
const modes = themeModes;

describe("platformTypes", () => {
  it("indexes every platform once, in toggle order", () => {
    expect(platformNames).toEqual(["darwin", "linux", "win32", "default"]);
    expect(new Set(platformNames).size).toBe(platformNames.length);
    expect(Object.keys(platformStyles).toSorted()).toEqual(
      [...platformNames].toSorted(),
    );
  });

  it("describes every platform the library knows, and nothing else", () => {
    expect(Object.keys(platformTypes).toSorted()).toEqual(
      [...platformNames].toSorted(),
    );
  });

  it("names each platform with a label and one family per role", () => {
    platformNames.forEach((platform) => {
      const type = platformTypes[platform];
      expect(type.label, platform).not.toBe("");
      expect(type.sans, platform).not.toBe("");
      expect(type.mono, platform).not.toBe("");
    });
  });

  it("uses the system UI sentinel for sans", () => {
    platformNames.forEach((platform) => {
      expect(platformTypes[platform].sans, platform).toBe(systemUiFont);
    });
  });

  it("names a single family, never a comma stack", () => {
    platformNames.forEach((platform) => {
      expect(platformTypes[platform].mono, platform).not.toContain(",");
    });
  });

  it("gives each real platform its own monospace family", () => {
    const monos = variants.map((platform) => platformTypes[platform].mono);
    expect(new Set(monos).size).toBe(monos.length);
    expect(platformTypes.default.mono).toBe(platformTypes.darwin.mono);
  });
});

describe("currentPlatform", () => {
  it("is one of the known platforms", () => {
    expect(platformNames).toContain(currentPlatform);
  });

  it("resolves the monospace family the process should use", () => {
    expect(systemMonoFamily).toBe(platformTypes[currentPlatform].mono);
  });
});

describe("the default typography", () => {
  it("takes its families from the platform table", () => {
    expect(typography.sans).toBe(systemUiFont);
    expect(typography.mono).toBe(systemMonoFamily);
  });
});

describe("platformStyles", () => {
  it("ships one style per known platform", () => {
    expect(Object.keys(platformStyles).toSorted()).toEqual(
      [...platformNames].toSorted(),
    );
  });

  it("leaves the Default variant empty, so it is the identity", () => {
    const style = platformStyles.default;
    expect(style.structure).toEqual({});
    expect(style.colors.light).toEqual({});
    expect(style.colors.dark).toEqual({});
    expect(style.elevation.light).toEqual({});
    expect(style.elevation.dark).toEqual({});
  });

  it("gives every real variant shape and a colour set for both modes", () => {
    variants.forEach((platform) => {
      const style = platformStyles[platform];
      expect(style.structure.radius, platform).not.toBeUndefined();
      expect(style.structure.density, platform).not.toBeUndefined();
      expect(style.types.label, platform).not.toBe("");
      expect(style.types.sans, platform).toBe(systemUiFont);
      modes.forEach((mode) => {
        expect(
          Object.keys(style.colors[mode]),
          `${platform} ${mode}`,
        ).not.toHaveLength(0);
        expect(
          Object.keys(style.elevation[mode]),
          `${platform} ${mode}`,
        ).not.toHaveLength(0);
      });
    });
  });

  it("derives the family table from the one style per platform", () => {
    platformNames.forEach((platform) => {
      expect(platformTypes[platform], platform).toBe(
        platformStyles[platform].types,
      );
    });
  });
});

describe("applyPlatformStyle", () => {
  it("applies a copied style, and a copy can be edited first", () => {
    const copied: PlatformStyle = {
      ...platformStyles.win32,
      types: { ...platformStyles.win32.types, label: "Contoso" },
      colors: {
        light: {
          ...platformStyles.win32.colors.light,
          primary: "#7C5CFF",
        },
        dark: platformStyles.win32.colors.dark,
      },
    };
    const themed = applyPlatformStyle(lightTheme, copied);
    expect(themed.name).toBe("Light · Contoso");
    expect(themed.colors.primary).toBe("#7C5CFF");
    expect(themed.typography.mono).toBe("Consolas");
    expect(themed.radius.md).toBe(platformStyles.win32.structure.radius?.md);
  });

  it("keeps a high-contrast base's colours from the base's declaration", () => {
    const themed = applyPlatformStyle(
      highContrastLightTheme,
      platformStyles.linux,
    );
    expect(themed.colors).toEqual(highContrastLightTheme.colors);
    expect(themed.contrast).toBe("high");
    expect(themeContrastFailures(themed)).toEqual([]);
    expect(themed.radius.lg).toBe(platformStyles.linux.structure.radius?.lg);
    expect(themed.typography.mono).toBe("DejaVu Sans Mono");
  });

  it("lets a copied style inherit the identity's unnamed roles", () => {
    const copied: PlatformStyle = {
      ...platformStyles.default,
      types: { ...platformStyles.default.types, label: "Contoso" },
    };
    const themed = applyPlatformStyle(darkTheme, copied);
    expect(themed.name).toBe("Dark · Contoso");
    expect(themed.colors).toEqual(darkTheme.colors);
    expect(themed.radius).toEqual(darkTheme.radius);
  });
});

describe("getPlatformTheme", () => {
  it("returns the identity unchanged for the Default variant", () => {
    expect(getPlatformTheme("default", "light")).toBe(lightTheme);
    expect(getPlatformTheme("default", "dark")).toBe(darkTheme);
    expect(getPlatformTheme("default", "light", "high")).toBe(
      highContrastLightTheme,
    );
    expect(getPlatformTheme("default", "dark", "high")).toBe(
      highContrastDarkTheme,
    );
  });

  it("returns a new theme with the requested mode", () => {
    modes.forEach((mode) => {
      variants.forEach((platform) => {
        const themed = getPlatformTheme(platform, mode);
        expect(themed, `${platform} ${mode}`).not.toBe(themes[mode]);
        expect(themed.mode, `${platform} ${mode}`).toBe(mode);
      });
    });
  });

  it("labels the variant so a preview can name it", () => {
    expect(getPlatformTheme("win32", "dark").name).toBe("Dark · Windows");
    expect(getPlatformTheme("darwin", "light").name).toBe("Light · macOS");
    expect(getPlatformTheme("linux", "dark", "high").name).toBe(
      "High contrast dark · Linux",
    );
  });

  it("is a real style, not a name change: the accent and shape move", () => {
    modes.forEach((mode) => {
      variants.forEach((platform) => {
        const themed = getPlatformTheme(platform, mode);
        const base = themes[mode];
        expect(themed.colors.primary, `${platform} ${mode}`).not.toBe(
          base.colors.primary,
        );
        expect(
          themed.radius.md !== base.radius.md ||
            themed.radius.lg !== base.radius.lg,
          `${platform} ${mode}`,
        ).toBe(true);
      });
    });
  });

  it("gives the three real platforms distinct accents in each mode", () => {
    modes.forEach((mode) => {
      const accents = variants.map(
        (platform) => getPlatformTheme(platform, mode).colors.primary,
      );
      expect(new Set(accents).size, mode).toBe(variants.length);
    });
  });

  it("takes its colours from the requested mode only", () => {
    const themed = getPlatformTheme("win32", "dark");
    expect(themed.colors.background).toBe(
      platformStyles.win32.colors.dark.background,
    );
    expect(themed.colors.background).not.toBe(
      platformStyles.win32.colors.light.background,
    );
    expect(themed.colors.background).not.toBe(darkTheme.colors.background);
  });

  it("applies the platform's density and families", () => {
    const macos = getPlatformTheme("darwin", "light");
    expect(macos.density.name).toBe("compact");
    expect(macos.typography.mono).toBe("Menlo");
    expect(macos.typography.sans).toBe(systemUiFont);
    expect(macos.typography.body).toEqual(lightTheme.typography.body);
    expect(getPlatformTheme("linux", "dark").density).toEqual(
      densityPresets.comfortable,
    );
  });

  it("keeps every theme group and every colour role", () => {
    variants.forEach((platform) => {
      modes.forEach((mode) => {
        const themed = getPlatformTheme(platform, mode);
        expect(Object.keys(themed).toSorted(), `${platform} ${mode}`).toEqual(
          Object.keys(lightTheme).toSorted(),
        );
        expect(
          Object.keys(themed.colors).toSorted(),
          `${platform} ${mode}`,
        ).toEqual(colorRoles.toSorted());
        colorRoles.forEach((role) => {
          expect(
            themed.colors[role],
            `${platform} ${mode} ${role}`,
          ).toBeDefined();
        });
      });
    });
  });

  it("never mutates the built-in theme it derives from", () => {
    const before = JSON.stringify(lightTheme);
    variants.forEach((platform) => {
      modes.forEach((mode) => getPlatformTheme(platform, mode));
    });
    expect(JSON.stringify(lightTheme)).toBe(before);
  });

  it("resolves a mono role to the platform family", () => {
    const themed = getPlatformTheme("linux", "light");
    expect(textStyle(themed, "code").fontFamily).toBe("DejaVu Sans Mono");
    expect(textStyle(themed, "body").fontFamily).toBe(systemUiFont);
  });

  it("composes through extendTheme like any other theme", () => {
    const edited = extendTheme(getPlatformTheme("linux", "light"), {
      colors: { primary: "#123456" },
      radius: { md: 2 },
    });
    expect(edited.colors.primary).toBe("#123456");
    expect(edited.radius.md).toBe(2);
    expect(edited.typography.mono).toBe("DejaVu Sans Mono");
    expect(edited.density.name).toBe("comfortable");
  });
});

describe("high contrast platform variants", () => {
  it("keeps the high-contrast colour set, whatever the platform accent", () => {
    variants.forEach((platform) => {
      expect(getPlatformTheme(platform, "light", "high").colors).toEqual(
        highContrastLightTheme.colors,
      );
      expect(getPlatformTheme(platform, "dark", "high").colors).toEqual(
        highContrastDarkTheme.colors,
      );
    });
  });

  it("still applies the platform's shape and families", () => {
    const themed = getPlatformTheme("win32", "dark", "high");
    expect(themed.typography.mono).toBe("Consolas");
    expect(themed.radius.lg).toBe(platformStyles.win32.structure.radius?.lg);
    expect(themed.density.name).toBe("comfortable");
  });
});

describe("platform style examples", () => {
  it("resolves a platform theme through the example helper", () => {
    expect(resolvePlatformTheme("dark", "win32")).toEqual(
      getPlatformTheme("win32", "dark"),
    );
    expect(resolveDensePlatformTheme("light", "linux").density.name).toBe(
      "compact",
    );
  });

  it("starts from a shipped variant and ships an edited look", () => {
    const edited = resolveEditedPlatformTheme("dark");
    expect(edited.name).toBe("Contoso");
    expect(edited.colors.primary).toBe("#005A9E");
    expect(edited.colors.background).toBe(
      platformStyles.win32.colors.dark.background,
    );
    expect(edited.typography.mono).toBe("Consolas");
    expect(edited.radius.md).toBe(3);
  });

  it("applies a style authored from scratch and inherits what it omits", () => {
    const light = resolveAuthoredPlatformStyle("light");
    expect(light.name).toBe("Light · Contoso");
    expect(light.colors.primary).toBe(
      contosoPlatformStyle.colors.light.primary,
    );
    expect(light.colors.background).toBe(lightTheme.colors.background);
    expect(light.radius.md).toBe(contosoPlatformStyle.structure.radius.md);
    expect(light.density.name).toBe("spacious");
    expect(light.typography.mono).toBe("Cascadia Mono");
    expect(light.elevation.md).toEqual(contosoPlatformStyle.elevation.light.md);
    expect(light.elevation.sm).toEqual(lightTheme.elevation.sm);

    const dark = resolveAuthoredPlatformStyle("dark");
    expect(dark.colors.primary).toBe(contosoPlatformStyle.colors.dark.primary);
    expect(dark.colors.background).toBe(darkTheme.colors.background);
  });
});

type Floors = Readonly<Record<ContrastPairClass, number>>;

interface PlatformColourSet {
  readonly label: string;
  readonly colors: ReturnType<typeof getPlatformTheme>["colors"];
  readonly floors: Floors;
}

const platformColourSets: ReadonlyArray<PlatformColourSet> = variants.flatMap(
  (platform): ReadonlyArray<PlatformColourSet> =>
    modes.map((mode) => ({
      label: `${platform} ${mode}`,
      colors: getPlatformTheme(platform, mode).colors,
      floors: contrastFloors.default,
    })),
);

describe("platform variant contrast", () => {
  platformColourSets.forEach(({ label, colors, floors }) => {
    contrastPairs.forEach(([foreground, background, pairClass]) => {
      it(`${label}: ${foreground} on ${background} meets ${floors[pairClass]}:1`, () => {
        expect(
          contrastRatio(colors[foreground], colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floors[pairClass]);
      });
    });
  });

  it("clears the documented contract on every variant", () => {
    variants.forEach((platform) => {
      modes.forEach((mode) => {
        expect(
          themeContrastFailures(getPlatformTheme(platform, mode)),
          `${platform} ${mode}`,
        ).toEqual([]);
      });
    });
  });
});

describe("platform variant selection", () => {
  platformColourSets.forEach(({ label, colors, floors }) => {
    it(`${label}: selection is a translucent wash`, () => {
      expect(colors.selection).toMatch(/^#[0-9A-F]{8}$/);
    });

    (["background", "card"] as const).forEach((surface) => {
      it(`${label}: body text stays readable on ${surface} under the selection wash`, () => {
        expect(
          contrastRatio(
            colors.foreground,
            compositeOver(colors.selection, colors[surface]),
          ),
          `${label} ${surface}`,
        ).toBeGreaterThanOrEqual(floors.body);
      });
    });
  });
});
