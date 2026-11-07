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
  resolveSwitchTheme,
} from "./platforms.example.js";
import { densityPresets, spacing, targetSize } from "./scale.js";
import { textStyle } from "./styles.js";
import { switchFailures } from "./switch.js";
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

const styled = platformNames.filter((name) => name !== "default");

const themedPlatforms = styled.flatMap((platform) =>
  themeModes.map((mode) => ({
    label: `${platform} ${mode}`,
    platform,
    theme: platformTheme(themes[mode], platform),
    base: themes[mode],
  })),
);

const frozenPalettes = {
  darwin: {
    light: {
      background: "#F2F2F7",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      input: "#FFFFFF",
      secondary: "#DEE3EA",
      muted: "#E9E9EF",
      skeleton: "#DCDFE7",
      hover: "#E2E2E8",
      active: "#DEDEE6",
      border: "#D9D9E0",
      borderStrong: "#67686D",
      primary: "#0A6CD6",
      primaryForeground: "#FFFFFF",
      ring: "#0A6CD6",
      accent: "#CADEF7",
      accentForeground: "#08407A",
      selected: "#D3E5FB",
      selectedForeground: "#0B3D6B",
      selection: "#0A6CD63D",
    },
    dark: {
      background: "#1C1C1E",
      card: "#26262A",
      popover: "#2C2C30",
      input: "#1F1F22",
      secondary: "#3A3A3C",
      muted: "#16161A",
      skeleton: "#303036",
      hover: "#35353B",
      active: "#3A3A40",
      border: "#3A3A40",
      borderStrong: "#ACACB1",
      primary: "#3B9DFF",
      primaryForeground: "#11141A",
      ring: "#4CA2FF",
      accent: "#1A3D60",
      accentForeground: "#B2D3F9",
      selected: "#0C3864",
      selectedForeground: "#C7E0FF",
      placeholder: "#8A93A3",
      selection: "#0A84FF4D",
    },
  },
  linux: {
    light: {
      background: "#FAFAFA",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      input: "#FFFFFF",
      muted: "#ECEBE9",
      hover: "#E3E2DF",
      active: "#DCDBD8",
      border: "#D4D2CF",
      borderStrong: "#6A6965",
      primary: "#1A6DD3",
      primaryForeground: "#FFFFFF",
      ring: "#1A6DD3",
      accent: "#D2E4F7",
      accentForeground: "#12457F",
      selected: "#CADDF3",
      selectedForeground: "#0F3E74",
      selection: "#3584E43D",
    },
    dark: {
      background: "#242424",
      card: "#303030",
      popover: "#383838",
      input: "#212121",
      secondary: "#404040",
      muted: "#2A2A2A",
      skeleton: "#3E3E3E",
      hover: "#343434",
      active: "#3D3D3D",
      border: "#464646",
      borderStrong: "#B2B3B4",
      primary: "#78AEED",
      primaryForeground: "#11141A",
      ring: "#78AEED",
      accent: "#1B3E60",
      accentForeground: "#BBD9F7",
      selected: "#1F4363",
      selectedForeground: "#CFE4FA",
      placeholder: "#8A93A3",
      selection: "#78AEED3D",
    },
  },
  win32: {
    light: {
      background: "#F3F3F3",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      input: "#FFFFFF",
      muted: "#EBEBEB",
      hover: "#E0E0E0",
      active: "#D6D6D6",
      border: "#E5E5E5",
      borderStrong: "#696A6B",
      primary: "#0078D4",
      primaryForeground: "#FFFFFF",
      ring: "#0078D4",
      accent: "#CFE6F9",
      accentForeground: "#003E6F",
      selected: "#C8E0F3",
      selectedForeground: "#093A5C",
      destructiveSoftForeground: "#5C1619",
      selection: "#0067C03D",
    },
    dark: {
      background: "#202020",
      card: "#2C2C2C",
      popover: "#2D2D2D",
      input: "#1F1F1F",
      secondary: "#3A3A3A",
      muted: "#262626",
      skeleton: "#323232",
      hover: "#333333",
      active: "#3A3A3A",
      border: "#3D3D3D",
      borderStrong: "#ACACAD",
      primary: "#4CC2FF",
      primaryForeground: "#11141A",
      ring: "#4CC2FF",
      accent: "#1B3A50",
      accentForeground: "#C9E9FF",
      selected: "#143E59",
      selectedForeground: "#CDEBFF",
      placeholder: "#8A93A3",
      selection: "#60CDFF3D",
    },
  },
} as const;

describe("the platform palettes after the shadcn-authoring change", () => {
  it("paints the same roles with the same values", () => {
    for (const platform of ["darwin", "linux", "win32"] as const) {
      for (const mode of ["light", "dark"] as const) {
        expect(platformStyles[platform].colors[mode]).toEqual(
          frozenPalettes[platform][mode],
        );
      }
    }
  });
});

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

    expect(
      platforms.map((platform) => platformStyles[platform].contrast),
    ).toEqual(platforms.map(() => "default"));
  });

  it("names no role as undefined", () => {
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

  it("says which platform names are operating systems", () => {
    expect(styled).toEqual(["darwin", "linux", "win32"]);
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const pages: Readonly<Record<string, string>> = {
      "docs/tokens.md": read("../../../docs/tokens.md"),
      "docs/design-system.md": read("../../../docs/design-system.md"),
    };
    Object.entries(pages).forEach(([name, text]) => {
      expect(text, name).not.toContain("four operating systems");
      expect(text, name).not.toContain(
        "four platform names are the operating systems",
      );
    });
    expect(
      pages["docs/tokens.md"],
      "the catalogue names the three systems and the identity",
    ).toContain(
      "offers the three operating systems and the library's `default`",
    );
    expect(
      pages["docs/design-system.md"],
      "the design system says three of the four names are systems",
    ).toContain("Three of the four platform names");
  });

  it("keeps `full` round on every platform so pills stay pills", () => {
    platforms.forEach((platform) => {
      expect(platformStyles[platform].radius.full, platform).toBeGreaterThan(
        99,
      );
    });
  });
});

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
    expect(darwin.colors.dark.primary).toBe("#3B9DFF");
    expect(
      contrastRatio(darwin.colors.dark.primaryForeground, "#0A84FF"),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);

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
      light: {
        on: "#34C759",
        off: "#E9E9EA",
        knob: "#FFFFFF",
        edge: "#C7C7CC",
      },
      dark: {
        on: "#30D158",
        off: "#39393D",
        knob: "#FFFFFF",
        edge: "#5A5A5E",
      },
    });
    expect(darwin.switchMetrics).toEqual({
      width: 38,
      height: 22,
      knob: 20,
      inset: 1,
      border: 0,
    });

    expect(
      contrastRatio(
        darwin.switch?.light?.edge ?? "",
        darwin.colors.light.muted ?? "",
      ),
    ).toBeGreaterThanOrEqual(1.05);

    expect(platformTheme(lightTheme, "darwin").switch).toEqual(
      darwin.switch?.light,
    );
    expect(platformTheme(darkTheme, "darwin").switch).toEqual(
      darwin.switch?.dark,
    );
    expect(platformTheme(lightTheme, "darwin").switchMetrics).toEqual(
      darwin.switchMetrics,
    );
    expect(platformTheme(highContrastLightTheme, "darwin").switch).toBe(
      undefined,
    );
  });

  it("gives Windows and Linux their own switch box and paint", () => {
    expect(platformStyles.win32.switch?.light).toEqual({
      on: "#0078D4",
      off: "transparent",
      knob: "#FFFFFF",
      knobOff: "#616161",
      edge: "#8A8A8A",
    });
    expect(platformStyles.win32.switchMetrics).toEqual({
      width: 40,
      height: 20,
      knob: 12,
      inset: 4,
      border: 1,
    });
    expect(platformStyles.linux.switch?.light).toEqual({
      on: "#3584E4",
      off: "#DEDDDA",
      knob: "#FFFFFF",
    });
    expect(platformStyles.linux.switchMetrics).toEqual({
      width: 44,
      height: 24,
      knob: 18,
      inset: 3,
      border: 0,
    });
    expect(platformStyles.default.switch).toBeUndefined();
  });

  it.each(["darwin", "linux", "win32"] as const)(
    "paints a %s switch that can be found in both modes",
    (platform) => {
      for (const base of [lightTheme, darkTheme])
        expect(
          switchFailures(platformTheme(base, platform)).placements,
        ).toEqual([]);
    },
  );

  it("clears the switch when an authored look is applied over the platform", () => {
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

    expect(themed.spacing).toEqual(lightTheme.spacing);
    expect(themed.elevation).toEqual(lightTheme.elevation);
    expect(themed.borderWidth).toEqual(lightTheme.borderWidth);
    expect(themed.iconSize).toEqual(lightTheme.iconSize);
    expect(themed.typography.body).toEqual(lightTheme.typography.body);
  });

  it("keeps every role a component reads", () => {
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
    expect(invalidColorRoles(resolveHouseTheme("dark"))).toEqual([]);
    expect(contrastFailures(resolveHouseTheme("light"))).toEqual([]);
    expect(contrastFailures(resolveHouseTheme("dark"))).toEqual([]);

    expect(indicatorFailures(resolveHouseTheme("light"))).toEqual([]);
    expect(indicatorFailures(resolveHouseTheme("dark"))).toEqual([]);
  });

  it("finishes the accent family instead of leaving the platform's blue", () => {
    const light = resolveHouseTheme("light");
    const dark = resolveHouseTheme("dark");
    const platform = platformTheme(lightTheme, "win32");

    expect(light.colors.accent).not.toBe(platform.colors.accent);
    expect(dark.colors.accent).not.toBe(
      platformTheme(darkTheme, "win32").colors.accent,
    );
    expect(light.colors.selection).toBe("#6A45F03D");
    expect(dark.colors.selection).toBe("#8A6EFF3D");

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

  it("owns the platform's toggle instead of leaving Apple's green", () => {
    const house = resolveSwitchTheme("dark");
    const apple = platformTheme(darkTheme, "darwin");
    expect(house.switch).toEqual({
      on: "#4ADE80",
      off: "#3B3B40",
      knob: "#FFFFFF",
    });
    expect(house.switch).not.toEqual(apple.switch);

    expect(house.colors.primary).toBe(apple.colors.primary);
    expect(switchFailures(resolveSwitchTheme("light")).placements).toEqual([]);
    expect(switchFailures(house).placements).toEqual([]);
  });
});

describe("currentPlatform", () => {
  it("is one of the known platforms", () => {
    expect(platforms).toContain(currentPlatform);
  });

  it("resolves the monospace family the process should use", () => {
    expect(systemMonoFamily).toBe(platformTypes[currentPlatform].mono);
  });

  it("carries its own declaration for the one host field it reads", () => {
    const source = readFileSync(
      new URL("./platforms.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "declare const process: { readonly platform?: string } | undefined;",
    );
    expect(source).toContain('typeof process === "undefined"');
  });
});

describe("platform documentation", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  const inventoryRow = (): Record<string, string> => {
    const row = read("../../../.agents/slop/COMPONENTS.md")
      .split("\n")
      .find((line) => line.startsWith("| Platform styles |"));
    return row === undefined ? {} : { ".agents/slop/COMPONENTS.md": row };
  };

  const surfaces = (): Record<string, string> => ({
    "docs/tokens.md": read("../../../docs/tokens.md"),
    "docs/design-system.md": read("../../../docs/design-system.md"),
    "README.md": read("../README.md"),
    ...inventoryRow(),
  });

  const retracted = [
    "not measured in this runtime",
    "not yet painted in a window",
    "measures families only",
    "pure values",
  ];

  it("records the capability in the inventory", () => {
    expect(Object.keys(inventoryRow())).toEqual([".agents/slop/COMPONENTS.md"]);
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
          !text.includes("expected 14, got 8") ||
          !text.includes("expected 10, got 8"),
      )
      .map(([name]) => name);

    expect(vague).toEqual([]);
  });
});
