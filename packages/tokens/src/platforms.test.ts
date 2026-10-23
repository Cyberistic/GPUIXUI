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
import { indicatorFailures } from "./indicator.js";
import {
  currentPlatform,
  platformNames,
  platformStyles,
  platformTypes,
  systemMonoFamily,
  systemUiFont,
} from "./platforms.js";
import { retroStyles } from "./retro.js";
import {
  platformAccent,
  resolveDensePlatformTheme,
  resolveHouseTheme,
} from "./platforms.example.js";
import { densityPresets, spacing, targetSize } from "./scale.js";
import { textStyle } from "./styles.js";
import {
  applyStyle,
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

  it("holds Linux to Adwaita's corners, accent and surfaces", () => {
    // GNOME's control corner is 6px and its window corner 12px
    // (`$button_radius` and `$window_radius` in libadwaita 1.5); the 12px
    // spacing grid and the 44px touch target are the library's own scale.
    const { radius, density, colors } = platformStyles.linux;
    expect(radius).toMatchObject({ sm: 4, md: 6, lg: 12, xl: 16 });
    expect(density).toBe("spacious");
    expect(densityPresets[density].controlHeight).toEqual({
      sm: 32,
      md: 36,
      lg: 40,
    });
    expect(spacing.lg).toBe(12);
    expect(targetSize.comfortable).toBe(44);
    // Adwaita Blue 3 is the selection wash; Blue 4 is the action fill that
    // carries white text and a full pointer step. Both are the GNOME palette.
    expect(colors.light.selection).toBe("#3584E43D");
    expect(colors.light.primary).toBe("#1A6DD3");
    expect(colors.light.background).toBe("#FAFAFA");
    expect(colors.dark.background).toBe("#242424");
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

/**
 * The Apple style's own numbers, from the Human Interface Guidelines.
 *
 * These are the rules a reader can check against Apple's pages rather than the
 * library's opinion: the corner scale, the control density, the system blue and
 * the switch's own paint. Each is pinned, so a repaint that drifts from the HIG
 * fails here instead of shipping as a look that only resembles macOS.
 */
describe("the Apple platform style", () => {
  const darwin = platformStyles.darwin;

  it("uses Apple's corner scale, a 10px control and window corner", () => {
    expect(darwin.radius).toEqual({
      none: 0,
      sm: 6,
      md: 10,
      lg: 14,
      xl: 18,
      full: 9999,
    });
  });

  it("sits on the 28px compact control, 24/28/32 with 6/8/10 padding", () => {
    const density = densityPresets[darwin.density];

    expect(darwin.density).toBe("compact");
    expect(density.controlHeight).toEqual({ sm: 24, md: 28, lg: 32 });
    expect(density.controlPaddingX).toEqual({ sm: 6, md: 8, lg: 10 });
  });

  it("paints the system blue, deepening light only where a label must read", () => {
    // `#0A84FF` is Apple's dark system blue, and carries its own dark label.
    expect(darwin.colors.dark.primary).toBe("#0A84FF");
    // `#007AFF` with a white label measures 4.02:1 — under the 4.5:1 the
    // library's own contract puts under text on a coloured fill. The light fill
    // is the measured step; the deviation is this test's premise, not a drift.
    expect(contrastRatio("#FFFFFF", "#007AFF")).toBeLessThan(
      contrastFloors.secondary,
    );
    expect(darwin.colors.light.primary).toBe("#0A6CD6");
    expect(
      contrastRatio("#FFFFFF", darwin.colors.light.primary),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("switches green on and grey off, which the accent cannot derive", () => {
    expect(darwin.switch).toEqual({
      light: { on: "#34C759", off: "#E9E9EA", knob: "#FFFFFF" },
      dark: { on: "#30D158", off: "#39393D", knob: "#FFFFFF" },
    });
    // The resolved theme carries the mode's half, and a high-contrast base —
    // which keeps its own palette — keeps the library's switch too.
    expect(platformTheme(lightTheme, "darwin").switch).toEqual(
      darwin.switch?.light,
    );
    expect(platformTheme(darkTheme, "darwin").switch).toEqual(
      darwin.switch?.dark,
    );
    expect(platformTheme(highContrastLightTheme, "darwin").switch).toBe(
      undefined,
    );
    // Windows and Linux paint the accent switch: the HIG's green is Apple's.
    styled
      .filter((platform) => platform !== "darwin")
      .forEach((platform) => {
        expect(platformStyles[platform].switch, platform).toBeUndefined();
      });
  });

  it("clears the switch when an authored look is applied over the platform", () => {
    // Luna recolours the chrome; leaving Apple's green toggle in its window
    // would paint a control the look does not ship.
    const luna = applyStyle(
      platformTheme(lightTheme, "darwin"),
      retroStyles.luna,
    );
    expect(luna.switch).toBeUndefined();
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
    expect(resolveHouseTheme("dark").colors.primary).toBe("#B49CFF");
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
    // The fill is also a mark a progress bar and a spinner dot paint, so the
    // dark edition takes the light violet rather than one that carries white.
    expect(indicatorFailures(resolveHouseTheme("light"))).toEqual([]);
    expect(indicatorFailures(resolveHouseTheme("dark"))).toEqual([]);
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
