/**
 * Guards the platform styles.
 *
 * The defect this closes: `platformTheme` changed only the type families and
 * the name, so the docs platform toggle re-typed the previews and nothing else
 * — a reader toggling macOS to Windows could not see a repaint, and the
 * mission's "pre-styled to look native on each platform" was only true of one
 * axis. The table is now families + radii + density + chrome roles, one theme
 * per platform, and every one of those themes is held to the contrast contract.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidColorRoles } from "./color.js";
import {
  contrastFailures,
  contrastFloors,
  contrastPairs,
  contrastRatio,
} from "./contrast.js";
import { decorativeFailures } from "./decorative.js";
import {
  currentPlatform,
  platformNames,
  platformStyles,
  platformTypes,
  systemMonoFamily,
  systemUiFont,
} from "./platforms.js";
import {
  platformAccent,
  resolveDensePlatformTheme,
  resolveHouseTheme,
} from "./platforms.example.js";
import { densityPresets } from "./scale.js";
import { textStyle } from "./styles.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themeContrasts,
  themeModes,
  themes,
} from "./theme.js";

const platforms = platformNames;

/** The three real platforms: `default` is the library's own identity. */
const styled = platformNames.filter((name) => name !== "default");

const themedPlatforms = styled.flatMap((platform) =>
  themeModes.map((mode) => ({
    label: `${platform} ${mode}`,
    platform,
    theme: platformTheme(themes[mode], platform),
    base: themes[mode],
  })),
);

describe("platformStyles", () => {
  it("describes every platform the library knows, and nothing else", () => {
    expect(Object.keys(platformStyles).toSorted()).toEqual(
      platforms.toSorted(),
    );
    expect(Object.keys(platformTypes).toSorted()).toEqual(platforms.toSorted());
  });

  it("projects the families through platformTypes", () => {
    platforms.forEach((platform) => {
      expect(platformTypes[platform].label).toBe(
        platformStyles[platform].label,
      );
      expect(platformTypes[platform].mono).toBe(platformStyles[platform].mono);
      expect(platformTypes[platform].sans).toBe(systemUiFont);
    });
  });

  it("names a single family, never a comma stack", () => {
    platforms.forEach((platform) => {
      expect(platformStyles[platform].mono, platform).not.toContain(",");
    });
  });

  it("gives each real platform its own monospace family", () => {
    const monos = styled.map((platform) => platformStyles[platform].mono);
    expect(new Set(monos).size).toBe(monos.length);
    expect(platformStyles.default.mono).toBe(platformStyles.darwin.mono);
  });

  it("uses a density preset every theme can resolve", () => {
    platforms.forEach((platform) => {
      expect(densityPresets[platformStyles[platform].density]).toBeDefined();
    });
  });

  it("declares the contrast variant its palette is designed for", () => {
    platforms.forEach((platform) => {
      expect(themeContrasts, platform).toContain(
        platformStyles[platform].contrast,
      );
    });
    // Every shipped palette is designed against the default floors; a base that
    // needs more keeps its own colours, which the next suite proves.
    expect(
      platforms.map((platform) => platformStyles[platform].contrast),
    ).toEqual(platforms.map(() => "default"));
  });

  it("names no role as undefined", () => {
    // A partial palette may omit a role, but an explicit `undefined` would
    // overwrite the base value with nothing.
    const empty = platforms.flatMap((platform) =>
      themeModes.flatMap((mode) =>
        Object.entries(platformStyles[platform].colors[mode])
          .filter(([, value]) => value === undefined)
          .map(([role]) => `${platform} ${mode} ${role}`),
      ),
    );
    expect(empty).toEqual([]);
  });

  it("keeps the default variant as the library's own identity", () => {
    const identity = platformTheme(lightTheme, "default");
    expect(identity.colors).toEqual(lightTheme.colors);
    expect(identity.radius).toEqual(lightTheme.radius);
    expect(identity.density).toEqual(lightTheme.density);
  });

  it("keeps `full` round on every platform so pills stay pills", () => {
    platforms.forEach((platform) => {
      expect(platformStyles[platform].radius.full, platform).toBeGreaterThan(
        99,
      );
    });
  });
});

describe("platformTheme", () => {
  it("repaints, re-shapes and re-types for a styled platform", () => {
    const themed = platformTheme(lightTheme, "win32");
    expect(themed.mode).toBe(lightTheme.mode);
    expect(themed.name).toContain(platformStyles.win32.label);
    expect(themed.typography.mono).toBe("Consolas");
    expect(themed.typography.sans).toBe(systemUiFont);
    expect(themed.colors.background).not.toBe(lightTheme.colors.background);
    expect(themed.colors.primary).not.toBe(lightTheme.colors.primary);
    expect(themed.radius.md).not.toBe(lightTheme.radius.md);
    expect(themed.density.name).toBe(platformStyles.win32.density);
    // Untouched groups stay the base theme's.
    expect(themed.spacing).toEqual(lightTheme.spacing);
    expect(themed.elevation).toEqual(lightTheme.elevation);
    expect(themed.borderWidth).toEqual(lightTheme.borderWidth);
    expect(themed.iconSize).toEqual(lightTheme.iconSize);
    expect(themed.typography.body).toEqual(lightTheme.typography.body);
  });

  it("keeps every role a component reads", () => {
    // A platform style is a partial: it may change a value, never drop a role.
    themedPlatforms.forEach(({ label, theme, base }) => {
      expect(Object.keys(theme.colors).toSorted(), label).toEqual(
        Object.keys(base.colors).toSorted(),
      );
      expect(Object.keys(theme.radius).toSorted(), label).toEqual(
        Object.keys(base.radius).toSorted(),
      );
    });
  });

  it("picks the chrome for the base theme's mode", () => {
    const light = platformTheme(lightTheme, "linux");
    const dark = platformTheme(darkTheme, "linux");
    expect(light.colors.background).toBe(
      platformStyles.linux.colors.light.background,
    );
    expect(dark.colors.background).toBe(
      platformStyles.linux.colors.dark.background,
    );
  });

  it("paints every styled platform differently from the others", () => {
    const backgrounds = styled.map(
      (platform) => platformTheme(lightTheme, platform).colors.background,
    );
    expect(new Set(backgrounds).size).toBe(styled.length);
    const primaries = styled.map(
      (platform) => platformTheme(lightTheme, platform).colors.primary,
    );
    expect(new Set(primaries).size).toBe(styled.length);
    const radii = styled.map(
      (platform) => platformTheme(lightTheme, platform).radius.md,
    );
    expect(new Set(radii).size).toBeGreaterThan(1);
  });

  it("leaves the base theme untouched", () => {
    const before = JSON.stringify(lightTheme);
    platformTheme(lightTheme, "linux");
    expect(JSON.stringify(lightTheme)).toBe(before);
    expect(lightTheme.typography.mono).toBe(systemMonoFamily);
  });

  it("keeps a high-contrast theme's colours and takes the rest", () => {
    const themed = platformTheme(highContrastDarkTheme, "linux");
    expect(themed.mode).toBe("dark");
    expect(themed.contrast).toBe("high");
    // Accessibility outranks the platform look: no platform colour applies.
    expect(themed.colors).toEqual(highContrastDarkTheme.colors);
    expect(themed.typography.mono).toBe("DejaVu Sans Mono");
    expect(themed.radius).toEqual(platformStyles.linux.radius);
    expect(themed.density.name).toBe(platformStyles.linux.density);
    expect(platformTheme(highContrastLightTheme, "win32").colors).toEqual(
      highContrastLightTheme.colors,
    );
  });

  it("resolves a mono role to the platform family", () => {
    const themed = platformTheme(lightTheme, "linux");
    expect(textStyle(themed, "code").fontFamily).toBe("DejaVu Sans Mono");
    expect(textStyle(themed, "body").fontFamily).toBe(systemUiFont);
  });

  it("stays a theme a consumer can extend", () => {
    const themed = platformTheme(lightTheme, "win32");
    expect(themed).not.toBe(lightTheme);
    expect(themed.contrast).toBe("default");
  });
});

describe("platform contrast", () => {
  themedPlatforms.forEach(({ label, theme }) => {
    contrastPairs.forEach(({ foreground, background, floor }) => {
      it(`${label}: ${foreground} on ${background} meets ${contrastFloors[floor]}:1`, () => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(contrastFloors[floor]);
      });
    });
  });
});

describe("editing a platform style", () => {
  it("keeps the platform look and overrides only what it names", () => {
    const house = resolveHouseTheme("light");
    expect(house.name).toBe("House");
    expect(house.colors.primary).toBe("#6A45F0");
    expect(house.colors.card).toBe(
      platformTheme(lightTheme, "win32").colors.card,
    );
    expect(house.radius.md).toBe(6);
    expect(house.radius.sm).toBe(platformStyles.win32.radius.sm);
  });

  it("keeps the edited theme readable in both modes", () => {
    // A brand fill arrives with its own on-colour; the platform's base
    // foreground was designed for a fill the house theme no longer paints.
    expect(invalidColorRoles(resolveHouseTheme("dark"))).toEqual([]);
    expect(contrastFailures(resolveHouseTheme("light"))).toEqual([]);
    expect(contrastFailures(resolveHouseTheme("dark"))).toEqual([]);
  });

  it("finishes the accent family instead of leaving the platform's blue", () => {
    // `accent`, `selected` and `selection` are surfaces derived from the accent,
    // so a brand that owns `primary` and stops there paints its violet action in
    // a blue popover and a blue-tinted selection.
    const light = resolveHouseTheme("light");
    const dark = resolveHouseTheme("dark");
    const platform = platformTheme(lightTheme, "win32");

    expect(light.colors.accent).not.toBe(platform.colors.accent);
    expect(dark.colors.accent).not.toBe(
      platformTheme(darkTheme, "win32").colors.accent,
    );
    expect(light.colors.selection).toBe("#6A45F03D");
    expect(dark.colors.selection).toBe("#8A6EFF3D");
    // The accent surface is a surface its text is measured on.
    expect(
      contrastFailures(light).some(({ background }) => background === "accent"),
    ).toBe(false);
    expect(decorativeFailures(light)).toEqual([]);
    expect(decorativeFailures(dark)).toEqual([]);
  });

  it("layers density over the platform's own preset", () => {
    const dense = resolveDensePlatformTheme("dark", "linux");
    expect(dense.density.name).toBe("compact");
    expect(dense.colors.background).toBe(
      platformStyles.linux.colors.dark.background,
    );
  });

  it("reads the accent each platform paints", () => {
    expect(platformAccent("darwin", "light")).toBe(
      platformStyles.darwin.colors.light.primary,
    );
    expect(platformAccent("default", "dark")).toBe(darkTheme.colors.primary);
  });
});

describe("currentPlatform", () => {
  it("is one of the known platforms", () => {
    expect(platforms).toContain(currentPlatform);
  });

  it("resolves the monospace family the process should use", () => {
    expect(systemMonoFamily).toBe(platformTypes[currentPlatform].mono);
  });
});

/**
 * Guards the prose the platform table's evidence lives in.
 *
 * The bug this holds: the docs, the package README and the design-system
 * inventory said the platform palette, radii and density were "pure values, not
 * yet painted in a window", and that the native gallery measured families only.
 * `theme-platform` then painted all three axes — 28 / 36 / 32px densities and a
 * platform `lg` radius — with the base radius as its negative control, so the
 * limitation was stale. A surface that returns to it, or stops naming the probe,
 * the measured control heights or that negative control, fails here.
 *
 * `node:fs` is deliberate, as in `fonts.test.ts` and `inventory.test.ts`: this
 * checks the repository's own Markdown, and the package keeps zero runtime
 * dependencies.
 */
describe("platform documentation", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  /** The inventory records the capability in one table row. */
  const inventoryRow = (): Record<string, string> => {
    const row = read("../../../COMPONENTS.md")
      .split("\n")
      .find((line) => line.startsWith("| Platform styles |"));
    return row === undefined ? {} : { "COMPONENTS.md": row };
  };

  const surfaces = (): Record<string, string> => ({
    "docs/tokens.md": read("../../../docs/tokens.md"),
    "docs/design-system.md": read("../../../docs/design-system.md"),
    "README.md": read("../README.md"),
    ...inventoryRow(),
  });

  /** The claim the probe replaced. */
  const retracted = [
    "not measured in this runtime",
    "not yet painted in a window",
    "measures families only",
    "pure values",
  ];

  it("records the capability in the inventory", () => {
    expect(Object.keys(inventoryRow())).toEqual(["COMPONENTS.md"]);
  });

  it("no longer calls the platform palette, radii or density unmeasured", () => {
    const offenders = Object.entries(surfaces()).flatMap(([name, text]) =>
      retracted
        .filter((claim) => text.includes(claim))
        .map((claim) => `${name}: "${claim}"`),
    );

    expect(offenders).toEqual([]);
  });

  it("names the native probe in every surface", () => {
    const silent = Object.entries(surfaces())
      .filter(([, text]) => !text.includes("theme-platform"))
      .map(([name]) => name);

    expect(silent).toEqual([]);
  });

  it("cites the measured control heights and their negative control", () => {
    const vague = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !["28", "36", "32"].every((height) => text.includes(height)) ||
          !text.includes("expected 10, got 8"),
      )
      .map(([name]) => name);

    expect(vague).toEqual([]);
  });
});
