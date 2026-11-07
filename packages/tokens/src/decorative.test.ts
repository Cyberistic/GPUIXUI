import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  alpha,
  alphaOf,
  blend,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  actionFeedbackPlacements,
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
  dividerPresses,
  dividerWashes,
  pointerWashTransitions,
} from "./decorative.js";
import {
  decorativeSurfacesAreVisible,
  edgeLessBrand,
  flatActionBrand,
  flatSelectionBrand,
  flatShadowBrand,
  flatSkeletonBrand,
  panelShadowBrand,
  report,
  unavailableActionBrand,
} from "./decorative.example.js";
import {
  statusEdgeAlpha,
  statusTone,
  statusTones,
  filledRoles,
} from "./styles.js";
import { platformNames, platformStyles } from "./platforms.js";
import { retroNames, retroStyles, retroTheme } from "./retro.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
  type Theme,
} from "./theme.js";

const shippedThemes = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

const platformThemes = platformNames
  .filter((name) => name !== "default")
  .flatMap((name) => [
    platformTheme(themes.light, name),
    platformTheme(themes.dark, name),
  ]);

const measured = (
  surface: string,
  role: string,
  over: string,
  level?: string,
): boolean =>
  decorativeSurfaces.some(
    (entry) =>
      entry.surface === surface &&
      entry.role === role &&
      entry.over === over &&
      (level === undefined || entry.level === level),
  );

const raisedLevels = ["sm", "md", "lg"] as const;

const elevationFailures = (theme: Parameters<typeof decorativeFailures>[0]) =>
  decorativeFailures(theme).filter(({ surface }) => surface === "elevation");

describe("decorative surfaces", () => {
  it("measures a divider on every surface it can rule", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("divider", "border", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures a skeleton on every surface it can stand in", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("skeleton", "skeleton", over),
    );

    expect(missing).toEqual([]);
  });

  it("prints the skeleton's strips in the catalogue, from the placements themselves", () => {
    const strips = decorativeSurfaces
      .filter(({ surface }) => surface === "skeleton")
      .map(({ over }) => `\`${over}\``)
      .join(", ");

    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain(`| skeleton | \`skeleton\` | ${strips} |`);
  });

  it("reads the painters that put a placeholder on a dialog", () => {
    const primitives = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const surface = (name: string): string =>
      new RegExp(`export const ${name} =\\s*"([^"]*)"`).exec(recipes)?.[1] ??
      "";

    expect(primitives).toContain('"shrink-0 bg-skeleton"');
    expect(surface("DIALOG_CONTENT")).toContain("bg-popover");
    expect(surface("POPOVER_CONTENT")).toContain("bg-popover");
    expect(surface("PREVIEW_CARD_CONTENT")).toContain("bg-popover");
  });

  it("measures a veil over the content surfaces a modal covers", () => {
    const missing = [
      "card",
      "popover",
      "muted",
      "secondary",
      "primary",
      "destructive",
      "input",
      "selected",
      "hover",
      ...statusTones.map((tone) => `${tone}Soft`),
    ].filter((over) => !measured("scrim", "overlay", over));

    expect(missing).toEqual([]);
  });

  it("measures every face a filled action can wear under the veil and the shadow", () => {
    const missing = filledRoles.flatMap((role) => [
      ...(measured("scrim", "overlay", role) ? [] : [`scrim/${role}`]),
      ...(measured("elevation", "shadow", role) ? [] : [`elevation/${role}`]),
    ]);

    expect(filledRoles).toEqual([
      "primary",
      "secondary",
      "destructive",
      "accent",
    ]);
    expect(missing).toEqual([]);
  });

  it("reports a veil painted in the primary action's face", () => {
    const broken = extendTheme(lightTheme, {
      colors: { overlay: lightTheme.colors.primary },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrim" && over === "primary",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a shadow tinted with the danger action's face", () => {
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.destructive },
    });

    expect(
      elevationFailures(broken).find(({ over }) => over === "destructive"),
    ).toMatchObject({ over: "destructive", floor: decorativeFloor, ratio: 1 });
  });

  it("reports a veil that cannot recede the sidebar it covers", () => {
    const broken = { colors: { ...lightColors, overlay: lightColors.muted } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrim" && over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a veil painted in the row the reader chose", () => {
    const broken = extendTheme(lightTheme, {
      colors: { overlay: lightTheme.colors.selected },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrim" && over === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("prints the veil's strips in the catalogue, from the placements themselves", () => {
    const strips = decorativeSurfaces
      .filter(({ surface }) => surface === "scrim")
      .map(({ over }) => `\`${over}\``)
      .join(", ");

    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain(`| scrim | \`overlay\` | ${strips} |`);
  });

  it("measures every status edge where the message it bounds is measured", () => {
    const missing = statusTones.flatMap((tone) =>
      [`${tone}Soft`, "background", "card", "popover", "muted"]
        .filter((over) => !measured("statusEdge", tone, over))
        .map((over) => `${tone}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("measures an edge on every strip its tint is measured on", () => {
    const tintStrips = [
      ...new Set(
        decorativeSurfaces
          .filter(({ surface }) => surface === "statusTint")
          .map(({ over }) => over),
      ),
    ];
    const edgeStrips = new Set(
      decorativeSurfaces
        .filter(({ surface }) => surface === "statusEdge")
        .map(({ over }) => over),
    );

    expect(tintStrips.filter((over) => !edgeStrips.has(over))).toEqual([]);
  });

  it("reports a status edge painted in the strip it bounds", () => {
    const flatPopover = {
      colors: { ...lightColors, warning: lightColors.popover },
    };

    expect(
      decorativeFailures(flatPopover).find(
        ({ surface, role, over }) =>
          surface === "statusEdge" && role === "warning" && over === "popover",
      ),
    ).toMatchObject({ floor: decorativeFloor });
  });

  it("clears the floor on the tint and every strip, with Luna light tightest on a wash", () => {
    const lookThemes = retroNames.flatMap((look) => [
      retroTheme(themes.light, look),
      retroTheme(themes.dark, look),
    ]);
    const placements = [
      ...shippedThemes,
      ...platformThemes,
      ...lookThemes,
    ].flatMap((theme) =>
      statusTones.flatMap((tone) =>
        (
          [
            `${tone}Soft`,
            "background",
            "card",
            "popover",
            "muted",
            "hover",
            "active",
            "selected",
            "accent",
          ] satisfies ReadonlyArray<keyof ThemeColors>
        ).map((over) => ({
          theme: theme.name,
          tone,
          over,
          ratio: contrastRatio(
            blend(theme.colors[over], theme.colors[tone], statusEdgeAlpha),
            theme.colors[over],
          ),
        })),
      ),
    );

    expect(
      placements.filter(
        ({ ratio }) => ratio === undefined || ratio < decorativeFloor,
      ),
    ).toEqual([]);

    const tightest = placements
      .filter(({ over }) => !over.endsWith("Soft"))
      .reduce((low, placement) =>
        (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
      );
    expect(tightest.theme).toBe("Light · Windows XP (Luna)");
    expect(tightest.tone).toBe("warning");
    expect(tightest.over).toBe("selected");
    expect(tightest.ratio).toBeCloseTo(1.08, 2);

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`at ${tightest.ratio?.toFixed(2)}:1`);
  });

  it("measures a soft badge's edge on every wash a row tints under it", () => {
    const missing = statusTones.flatMap((tone) =>
      ["hover", "active", "selected", "accent"]
        .filter((over) => !measured("statusEdge", tone, over))
        .map((over) => `${tone}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reads the painters that put a badge on a wash", () => {
    const recipes = readFileSync(
      new URL("../../../packages/tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const list = readFileSync(
      new URL("../../../packages/components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const badges = recipes.slice(
      recipes.indexOf("export const BADGE_VARIANTS"),
      recipes.indexOf("export const ALERT_BASE"),
    );

    const washes = {
      accent: "hover: { backgroundColor: theme.colors.accent }",
      active: 'active: { backgroundColor: pressWash(theme, "accent") }',
      selected: "backgroundColor: theme.colors.selected",
    } as const;
    const edgeLess = statusTones.filter(
      (tone) => !badges.includes(`border border-${tone}/30`),
    );
    const unwashed = Object.entries(washes).flatMap(([role, paint]) =>
      list.includes(paint) ? [] : [role],
    );

    expect({ edgeLess, unwashed }).toEqual({ edgeLess: [], unwashed: [] });
  });

  it("reports a badge edge painted in the wash it sits on", () => {
    const flatActive = {
      colors: { ...lightColors, warning: lightColors.active },
    };

    expect(
      decorativeFailures(flatActive).find(
        ({ surface, role, over }) =>
          surface === "statusEdge" && role === "warning" && over === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("measures the edge the component actually paints", () => {
    statusTones.forEach((tone) => {
      const entry = decorativeSurfaces.find(
        ({ surface, role }) => surface === "statusEdge" && role === tone,
      );

      expect(entry?.alpha, tone).toBe(statusEdgeAlpha);
      expect(statusTone(lightTheme, tone).border).toBe(
        alpha(lightColors[tone], statusEdgeAlpha),
      );
    });
  });

  it("measures every soft status surface on every strip a message sits on", () => {
    const missing = statusTones.flatMap((tone) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("statusTint", `${tone}Soft`, over))
        .map((over) => `${tone}Soft/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a soft status surface that matches the strip it tints", () => {
    const broken = {
      colors: { ...lightColors, successSoft: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the tints the light palettes shipped before this step", () => {
    const beforeBase = {
      colors: { ...lightColors, successSoft: palette.green[100] },
    };
    const beforeLuna = {
      colors: {
        ...retroTheme(lightTheme, "luna").colors,
        infoSoft: palette.blue[100],
      },
    };

    expect(
      decorativeFailures(beforeBase).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      )?.ratio,
    ).toBeCloseTo(1.006, 2);
    expect(
      decorativeFailures(beforeLuna).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "infoSoft" &&
          over === "background",
      )?.ratio,
    ).toBeCloseTo(1, 2);
  });

  it("measures a scrollbar on every surface a scroller can sit on", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("scrollbar", "scrollbar", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures every state wash on every strip it tints", () => {
    const missing = ["hover", "active", "selected", "accent"].flatMap((role) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("stateWash", role, over))
        .map((over) => `${role}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a hover that matches the row it tints", () => {
    const broken = { colors: { ...lightColors, hover: lightColors.muted } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "hover" && over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("measures the wash a chosen row is repainted with", () => {
    expect(measured("stateWash", "accent", "selected")).toBe(true);
  });

  it("reads the painters that repaint a chosen row", () => {
    const list = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );

    expect(list).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(list).toContain("backgroundColor: theme.colors.selected");
  });

  it("reports a chosen row the pointer cannot repaint", () => {
    const failures = decorativeFailures(flatSelectionBrand);

    expect(
      failures.find(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "accent" && over === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the chosen rows that did not answer the pointer before this step", () => {
    const before: ReadonlyArray<readonly [string, Theme, string, number]> = [
      ["Light", lightTheme, "#E0E3FF", 1],
      ["Dark", darkTheme, "#2E2370", 1],
      ["High contrast light", highContrastLightTheme, "#E0E3FF", 1],
      ["High contrast dark", highContrastDarkTheme, "#231B59", 1],
      ["Dark · macOS", platformTheme(darkTheme, "darwin"), "#0D3A66", 1.036],
      ["Light · Linux", platformTheme(lightTheme, "linux"), "#CFE3F9", 1.011],
      ["Dark · Linux", platformTheme(darkTheme, "linux"), "#1B3F60", 1.012],
      ["Light · Windows", platformTheme(lightTheme, "win32"), "#CCE4F7", 1.021],
      ["Dark · Windows", platformTheme(darkTheme, "win32"), "#123C57", 1.024],
      [
        "Light · Windows XP (Luna)",
        retroTheme(lightTheme, "luna"),
        "#BDD4F0",
        1.003,
      ],
      [
        "Light · Windows 7 (Aero)",
        retroTheme(lightTheme, "aero"),
        "#C2E0F8",
        1.022,
      ],
    ];

    const reported = before.map(([name, theme, selected, ratio]) => {
      const failure = decorativeFailures(
        extendTheme(theme, { colors: { selected } }),
      ).find(
        (entry) =>
          entry.surface === "stateWash" &&
          entry.role === "accent" &&
          entry.over === "selected",
      );
      return [name, failure?.ratio?.toFixed(3), ratio.toFixed(3)];
    });

    expect(reported).toEqual(
      before.map(([name, , , ratio]) => [
        name,
        ratio.toFixed(3),
        ratio.toFixed(3),
      ]),
    );

    expect(
      before.filter(([, theme]) =>
        decorativeFailures(theme).some(
          (entry) => entry.surface === "stateWash" && entry.over === "selected",
        ),
      ),
    ).toEqual([]);
  });

  it("clears the floor on every shipped style, with the base dark theme tightest", () => {
    const every = [
      ...shippedThemes,
      ...platformThemes,
      ...retroNames.flatMap((look) => [
        retroTheme(lightTheme, look),
        retroTheme(darkTheme, look),
      ]),
    ];
    const cells = every.map((theme) => ({
      label: theme.name,
      ratio: contrastRatio(theme.colors.accent, theme.colors.selected) ?? 0,
    }));
    const tightest = cells.reduce((best, cell) =>
      cell.ratio < best.ratio ? cell : best,
    );
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

    expect(cells.filter(({ ratio }) => ratio < decorativeFloor)).toEqual([]);
    expect(tightest.label).toBe("Dark");
    expect(tightest.ratio.toFixed(2)).toBe("1.05");
    expect(read("../../../docs/tokens.md")).toContain(
      "the base dark theme's chosen row is the tightest at 1.05:1",
    );
    expect(read("../../../docs/design-system.md")).toContain(
      "the base dark theme's chosen row is the tightest at 1.05:1",
    );
  });

  it("reports a scrollbar thumb that matches the strip it moves along", () => {
    const broken = {
      colors: { ...lightColors, scrollbar: lightColors.background },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrollbar" && over === "background",
      ),
    ).toMatchObject({ role: "scrollbar", ratio: 1, floor: decorativeFloor });
  });

  it("measures the tonal action's fill on every content strip it sits on", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("filledAction", "secondary", over),
    );

    expect(missing).toEqual([]);
  });

  it("leaves a row's wash to the edge both packages paint", () => {
    const recipe = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const variants = readFileSync(
      new URL("../../primitives/src/core/variants.ts", import.meta.url),
      "utf8",
    );
    const components = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    const washes = ["hover", "active", "accent", "selected"] as const;

    expect(recipe).toContain(
      "bg-secondary text-secondary-foreground border border-strong",
    );
    expect(variants).toContain(
      'border: (theme) => colorRole(theme, "borderStrong")',
    );

    expect(components).toMatch(
      /secondary:\s*(?:"[^"]*border border-strong[^"]*"|\{[^}]*border border-strong[^}]*\})/,
    );
    expect(
      decorativeSurfaces.filter(
        ({ surface, over }) =>
          surface === "filledAction" && washes.some((wash) => wash === over),
      ),
    ).toEqual([]);
  });

  it("measures a rail on every strip a bar is drawn on", () => {
    const missing = ["background", "card", "popover"].filter(
      (over) => !measured("track", "muted", over),
    );

    expect(missing).toEqual([]);
  });

  it("does not measure a rail against the quiet strip it is made of", () => {
    expect(measured("track", "muted", "muted")).toBe(false);
  });

  it("reads the painters that draw a bar's rail in the role it measures", () => {
    const source = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");
    const recipe = source("../../primitives/src/recipe/index.ts");
    const declaration = (name: string): string => {
      const start = recipe.indexOf(`export const ${name}`);
      return recipe.slice(start, recipe.indexOf(";", start));
    };

    expect(declaration("sliderRailClass")).toContain("bg-muted");
    expect(declaration("progressTrackClass")).toContain("bg-muted");
    expect(source("../../primitives/src/components/Progress.tsx")).toContain(
      "progressTrackClass",
    );
    expect(source("../../primitives/src/components/Meter.tsx")).toContain(
      "progressTrackClass",
    );
    expect(source("../../primitives/src/components/Slider.tsx")).toContain(
      "sliderRailClass",
    );
  });

  it("reports a rail painted in the fill it sits on", () => {
    const broken = {
      colors: { ...lightColors, muted: lightColors.popover },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "track" && role === "muted" && over === "popover",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the dark rails that matched their own dialog before this step", () => {
    const before = [
      ["dark", darkColors, "#222730", 1],
      ["darwin", platformStyles.darwin.colors.dark, "#2A2A2E", 1.028],
      ["win32", platformStyles.win32.colors.dark, "#2A2A2A", 1.042],
      ["luna", retroStyles.luna.colors.dark, "#1B2F4A", 1.045],
      ["aero", retroStyles.aero.colors.dark, "#1D2F3D", 1.013],
    ] as const;

    before.forEach(([where, colors, muted, ratio]) => {
      expect(contrastRatio(muted, colors.popover), where).toBeCloseTo(ratio, 3);
    });
    expect(
      contrastRatio(
        platformStyles.win32.colors.dark.muted,
        platformStyles.win32.colors.dark.card,
      ),
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("measures a disabled face against every available face it replaces", () => {
    const missing: ReadonlyArray<string> = [
      "primary",
      "secondary",
      "destructive",
      "accent",
      "input",
    ].filter((over) => !measured("disabledFace", "disabled", over));

    expect(missing).toEqual([]);
  });

  it("reports a disabled action painted in the enabled action's face", () => {
    const broken = {
      colors: {
        ...highContrastLightColors,
        disabled: highContrastLightColors.secondary,
      },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "disabledFace" &&
          role === "disabled" &&
          over === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the high-contrast faces that collided before the split", () => {
    const beforeLight = {
      colors: { ...highContrastLightColors, disabled: "#E8E8E8" },
    };
    const beforeDark = {
      colors: { ...highContrastDarkColors, disabled: "#2E2E2E" },
    };

    expect(
      decorativeFailures(beforeLight)
        .filter(({ surface }) => surface === "disabledFace")
        .map(({ over, ratio }) => [over, ratio]),
    ).toMatchObject([
      ["secondary", 1],
      ["accent", 1.0324046406832623],
    ]);
    expect(
      decorativeFailures(beforeDark).find(
        ({ surface, over }) =>
          surface === "disabledFace" && over === "secondary",
      )?.ratio,
    ).toBe(1);
    expect(decorativeFailures(highContrastLightTheme)).toEqual([]);
    expect(decorativeFailures(highContrastDarkTheme)).toEqual([]);
  });

  it("reports a filled action that matches the strip it sits on", () => {
    const broken = {
      colors: { ...lightColors, secondary: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "filledAction" &&
          role === "secondary" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  const surfaceOrigin = (wash: "active" | "accent" | "hover"): boolean => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");
    const list = read("../../components/src/list.tsx");

    const variants = read("../../primitives/src/core/variants.ts");
    const row = read("../../components/src/menu/item.tsx");

    const painted = {
      accent: list.includes("hover: { backgroundColor: theme.colors.accent }"),
      active: list.includes(
        'active: { backgroundColor: pressWash(theme, "accent") }',
      ),
      hover:
        variants.includes('backgroundColor: colorRole(theme, "hover")') &&
        row.includes(
          "const pointerWash = { backgroundColor: theme.colors.hover }",
        ) &&
        row.includes("hover: disabled ? undefined : highlight"),
    } as const;
    return painted[wash];
  };

  it("measures every raised elevation level on the strips the veil already names", () => {
    const placements = decorativeSurfaces.filter(
      ({ surface }) => surface === "elevation",
    );
    const levels = [
      ...new Set(
        placements.flatMap(({ level }) => (level === undefined ? [] : [level])),
      ),
    ];
    const strips = [...new Set(placements.map(({ over }) => over))];
    const veiled = [
      ...new Set(
        decorativeSurfaces
          .filter(({ surface }) => surface === "scrim")
          .map(({ over }) => over),
      ),
    ];

    expect(levels).toEqual([...raisedLevels]);
    expect(strips.length).toBeGreaterThanOrEqual(13);
    expect(veiled.filter((over) => !strips.includes(over))).toEqual([]);
    expect(
      raisedLevels.flatMap((level) =>
        strips
          .filter((over) => !measured("elevation", "shadow", over, level))
          .map((over) => `elevation/${level}/${over}`),
      ),
    ).toEqual([]);
  });

  it("measures every level the tw recipes raise a surface to", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const utilities = readFileSync(
      new URL("../../tw/src/utilities.ts", import.meta.url),
      "utf8",
    );
    const table =
      /const ELEVATION[^=]*= \{([\s\S]*?)\};/.exec(utilities)?.[1] ?? "";
    const levelOf = (utility: string): string | undefined =>
      [...table.matchAll(/(\w+): "(\w+)"/g)].find(
        ([, name]) => name === utility,
      )?.[2];
    const used = [
      ...new Set(
        [...recipes.matchAll(/\bshadow-(\w+)/g)].flatMap(([, utility]) => {
          const level = utility === undefined ? undefined : levelOf(utility);
          return level === undefined ? [] : [level];
        }),
      ),
    ];

    expect(used).toHaveLength(raisedLevels.length);
    expect([...raisedLevels].filter((level) => !used.includes(level))).toEqual(
      [],
    );
  });

  it("measures a message's own action opening over its tint", () => {
    const missing = statusTones.flatMap((tone) => {
      const over = `${tone}Soft`;
      return [
        ...(measured("elevation", "shadow", over) ? [] : [`elevation/${over}`]),
        ...(measured("scrim", "overlay", over) ? [] : [`scrim/${over}`]),
      ];
    });

    expect(missing).toEqual([]);
  });

  it("measures a surface opened from the pointer's own wash", () => {
    const washes = ["active", "accent", "hover"] as const;
    const missing = washes.flatMap((over) => [
      ...["scrim", "elevation"].flatMap((surface) =>
        measured(
          surface as "scrim" | "elevation",
          surface === "scrim" ? "overlay" : "shadow",
          over,
        )
          ? []
          : [`${surface}/${over}`],
      ),
      ...(surfaceOrigin(over) ? [] : [`${over} has no painter`]),
    ]);

    expect(missing).toEqual([]);
  });

  it("reports a veil and a shadow painted in the hovered control's wash", () => {
    const stillPage = extendTheme(lightTheme, {
      colors: { overlay: lightTheme.colors.hover },
    });
    const stillRow = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.hover },
    });

    expect(
      decorativeFailures(stillPage).find(
        ({ surface, over }) => surface === "scrim" && over === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
    expect(
      decorativeFailures(stillRow).find(
        ({ surface, over }) => surface === "elevation" && over === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a shadow painted in the wash the row is wearing", () => {
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.accent },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "elevation" && over === "accent",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
    expect(
      decorativeFailures(lightTheme).some(
        ({ surface }) => surface === "elevation",
      ),
    ).toBe(false);
  });

  it("reads the level's painted colour, not the role it is tinted from", () => {
    const flat = extendTheme(lightTheme, {
      elevation: {
        lg: [
          {
            offsetX: 0,
            offsetY: 16,
            blurRadius: 40,
            spreadRadius: -8,
            color: "#00000000",
          },
        ],
      },
    });

    const lgStrips = decorativeSurfaces
      .filter(({ surface, level }) => surface === "elevation" && level === "lg")
      .map(({ over }) => over);

    expect(
      elevationFailures(flat).map(({ level, over, ratio }) => [
        level,
        over,
        ratio,
      ]),
    ).toEqual(lgStrips.map((over) => ["lg", over, 1]));
    expect(decorativeFailures(lightTheme)).toEqual([]);
  });

  it("measures a level a brand supplied that paints nothing, not only the deepest", () => {
    const invisible = (share: string) => [
      { offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: share },
    ];
    const flat = extendTheme(lightTheme, {
      elevation: { sm: invisible("#00000000"), md: invisible("#00000000") },
    });
    const failures = elevationFailures(flat);

    expect([...new Set(failures.map(({ level }) => level))]).toEqual([
      "sm",
      "md",
    ]);
    expect(failures.every(({ ratio }) => ratio === 1)).toBe(true);

    expect(failures.map(({ level }) => level)).not.toContain("lg");
    expect(failures[0]).toMatchObject({
      surface: "elevation",
      level: "sm",
      role: "shadow",
      floor: decorativeFloor,
    });
  });

  it("reports a shadow tinted with the row it falls on", () => {
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.selected },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "elevation" && over === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("prints every raised level's range over the strips it measures", () => {
    const range = (level: "sm" | "md" | "lg"): string => {
      const painted = highContrastDarkTheme.elevation[level][0]?.color ?? "";
      const ratios = decorativeSurfaces
        .filter(
          ({ surface, level: placed }) =>
            surface === "elevation" && placed === level,
        )
        .map(({ over }) => {
          const strip = highContrastDarkTheme.colors[over];
          return contrastRatio(blend(strip, painted, alphaOf(painted)), strip);
        })
        .filter((ratio): ratio is number => ratio !== undefined);
      const [low, high] = ratios.reduce<readonly [number, number]>(
        ([floor, ceiling], ratio) => [
          Math.min(floor, ratio),
          Math.max(ceiling, ratio),
        ],
        [Number.POSITIVE_INFINITY, 0],
      );
      return `${low.toFixed(2)}–${high.toFixed(2)}:1`;
    };
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    expect(range("sm")).toBe("1.08–1.82:1");
    expect(range("md")).toBe("1.13–2.81:1");
    expect(range("lg")).toBe("1.17–3.75:1");
    const printed = `the card's lift reads ${range("sm")}, the menu's ${range("md")} and the dialog's ${range("lg")}`;

    const prose = (path: string): string => read(path).replace(/\s+/g, " ");

    expect(prose("../../../docs/tokens.md")).toContain(printed);
    expect(prose("../../../docs/design-system.md")).toContain(printed);
  });

  it("prints the tightest placement over every shipped style and level", () => {
    const every = [
      ...shippedThemes,
      ...platformThemes,
      ...retroNames.flatMap((look) => [
        retroTheme(lightTheme, look),
        retroTheme(darkTheme, look),
      ]),
    ];
    const cells = every.flatMap((theme) =>
      raisedLevels.flatMap((level) =>
        decorativeSurfaces
          .filter(
            ({ surface, level: placed }) =>
              surface === "elevation" && placed === level,
          )
          .flatMap(({ over }) => {
            const painted = theme.elevation[level][0]?.color;
            if (painted === undefined) return [];
            const strip = theme.colors[over];
            const ratio = contrastRatio(
              blend(strip, painted, alphaOf(painted)),
              strip,
            );
            return ratio === undefined
              ? []
              : [{ label: theme.name, level, over, ratio }];
          }),
      ),
    );
    const tightest = cells.reduce((best, cell) =>
      cell.ratio < best.ratio ? cell : best,
    );
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    const strips = new Set(
      decorativeSurfaces
        .filter(({ surface }) => surface === "elevation")
        .map(({ over }) => over),
    );

    expect(cells).toHaveLength(
      every.length * raisedLevels.length * strips.size,
    );
    expect(tightest).toMatchObject({
      label: "Dark · Windows 7 (Aero)",
      level: "sm",
      over: "input",
    });
    expect(tightest.ratio.toFixed(2)).toBe("1.06");
    expect(read("../../../docs/tokens.md")).toContain("1.06:1");
    expect(read("../README.md")).toContain("1.06:1");

    const page = read("../../../docs/tokens.md").replace(/\s+/g, " ");
    expect(page).toContain(`the tightest of the ${cells.length} placements`);
    expect(page).not.toContain("the 672 placements");
  });

  it("reports the high-contrast dark panel a shadow could not lift", () => {
    const before = extendTheme(highContrastDarkTheme, {
      colors: { shadow: "#2E2E2EB3" },
    });
    const failures = elevationFailures(before);
    const byLevel = (level: (typeof raisedLevels)[number]) =>
      failures
        .filter((failure) => failure.level === level)
        .map(({ over }) => over);

    expect(failures).toHaveLength(15);
    expect(byLevel("sm")).toEqual([
      "secondary",
      "selected",
      "accent",
      "hover",
      "infoSoft",
      "successSoft",
      "destructiveSoft",
    ]);
    expect(byLevel("md")).toEqual([
      "secondary",
      "selected",
      "hover",
      "destructiveSoft",
    ]);
    expect(byLevel("lg")).toEqual([
      "secondary",
      "selected",
      "hover",
      "destructiveSoft",
    ]);
    expect(
      failures
        .filter(({ over }) => over === "secondary" || over === "hover")
        .every(({ ratio }) => ratio === 1),
    ).toBe(true);
    expect(
      failures
        .filter(({ over }) => over === "destructiveSoft")
        .every(({ ratio, floor }) => ratio !== undefined && ratio < floor),
    ).toBe(true);
    expect(
      decorativeFailures(highContrastDarkTheme).some(
        ({ surface }) => surface === "elevation",
      ),
    ).toBe(false);
  });

  it("reports a shadow painted in the panel it falls on", () => {
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.secondary },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "elevation" && over === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the high-contrast dark page no level could lift", () => {
    const before = extendTheme(highContrastDarkTheme, {
      colors: { shadow: "#000000B3" },
    });

    const failures = elevationFailures(before);
    const background = failures.filter(({ over }) => over === "background");

    expect(background.map(({ level }) => level)).toEqual([...raisedLevels]);
    expect(background.every(({ ratio }) => ratio === 1)).toBe(true);
    expect(
      failures
        .filter(({ over }) => over !== "background")
        .map(({ level, over, ratio }) => [level, over, ratio?.toFixed(2)]),
    ).toEqual([
      ["sm", "card", "1.03"],
      ["sm", "input", "1.03"],
      ["md", "card", "1.05"],
      ["md", "input", "1.05"],
    ]);
    expect(
      decorativeFailures(highContrastDarkTheme).some(
        ({ surface }) => surface === "elevation",
      ),
    ).toBe(false);
  });

  it("reports a shadow painted in the page it falls on", () => {
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.background },
    });

    const failures = elevationFailures(broken);
    const cells = decorativeSurfaces.filter(
      ({ surface }) => surface === "elevation",
    );

    expect(failures).toHaveLength(cells.length - 7);
    expect(
      failures.every(
        ({ ratio, floor }) =>
          ratio === 1 || (ratio !== undefined && ratio < floor),
      ),
    ).toBe(true);
    expect(failures.filter(({ over }) => over === "background")).toHaveLength(
      3,
    );
    expect(
      cells.filter(
        ({ surface, level, over }) =>
          surface === "elevation" &&
          !failures.some(
            (failure) => failure.level === level && failure.over === over,
          ),
      ),
    ).toEqual([
      ...raisedLevels.flatMap((level) => [
        expect.objectContaining({ level, over: "primary" }),
        expect.objectContaining({ level, over: "destructive" }),
      ]),
      expect.objectContaining({ level: "lg", over: "destructiveSoft" }),
    ]);
  });

  it("reports an elevation level the theme does not carry as unmeasurable", () => {
    const reported = decorativeFailures({
      colors: lightColors,
      elevation: {},
    }).filter(({ surface }) => surface === "elevation");

    expect(reported).toHaveLength(
      decorativeSurfaces.filter(({ surface }) => surface === "elevation")
        .length,
    );
    expect(reported.every(({ ratio }) => ratio === undefined)).toBe(true);
  });

  it("passes every authored look", () => {
    retroNames.forEach((look) => {
      [lightTheme, darkTheme].forEach((base) => {
        const theme = retroTheme(base, look);
        expect(decorativeFailures(theme), theme.name).toEqual([]);
      });
    });
  });

  it("passes every shipped theme", () => {
    shippedThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("passes every platform style in both modes", () => {
    platformThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports the platform placeholders that matched their own dialog before this step", () => {
    const before = [
      ["darwin", "#2A303B", 1.049],
      ["linux", "#3A3A3A", 1.031],
      ["win32", "#2A303B", 1.039],
    ] as const;

    before.forEach(([platform, skeleton, ratio]) => {
      const stale = extendTheme(platformTheme(themes.dark, platform), {
        colors: { skeleton },
      });
      const shipped = platformTheme(themes.dark, platform);

      expect(
        contrastRatio(skeleton, stale.colors.popover),
        platform,
      ).toBeCloseTo(ratio, 3);
      expect(platformStyles[platform].colors.dark.skeleton, platform).not.toBe(
        skeleton,
      );
      expect(
        contrastRatio(shipped.colors.skeleton, shipped.colors.popover),
        platform,
      ).toBeGreaterThanOrEqual(decorativeFloor);
      expect(decorativeFailures(shipped), platform).toEqual([]);
    });
  });

  it("prints the tightest rail placement over every shipped style", () => {
    const rails = decorativeSurfaces.filter(
      ({ surface }) => surface === "track",
    );
    const looks = retroNames.flatMap((look) => [
      retroTheme(lightTheme, look),
      retroTheme(darkTheme, look),
    ]);
    const tightest = [...shippedThemes, ...platformThemes, ...looks]
      .flatMap((theme) =>
        rails.map(({ over, role }) => ({
          theme: theme.name,
          over,
          ratio: contrastRatio(theme.colors[role], theme.colors[over]),
        })),
      )
      .reduce((worst, placement) =>
        placement.ratio !== undefined &&
        (worst.ratio === undefined || placement.ratio < worst.ratio)
          ? placement
          : worst,
      );

    expect(tightest.theme).toBe("Dark · Windows 7 (Aero)");
    expect(tightest.over).toBe("popover");
    expect(tightest.ratio).toBeCloseTo(1.052, 3);
    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain(
      "rail is Windows 7 (Aero) dark's on its dialog fill at 1.052:1",
    );
  });

  it("prints the tightest placeholder placement over every shipped style", () => {
    const strips = decorativeSurfaces.filter(
      ({ surface }) => surface === "skeleton",
    );
    const looks = retroNames.flatMap((look) => [
      retroTheme(lightTheme, look),
      retroTheme(darkTheme, look),
    ]);
    const tightest = [...shippedThemes, ...platformThemes, ...looks]
      .flatMap((theme) =>
        strips.map(({ over, role }) => ({
          theme: theme.name,
          over,
          ratio: contrastRatio(theme.colors[role], theme.colors[over]),
        })),
      )
      .reduce((worst, placement) =>
        placement.ratio !== undefined &&
        (worst.ratio === undefined || placement.ratio < worst.ratio)
          ? placement
          : worst,
      );

    expect(tightest.theme).toBe("Dark · Windows XP (Luna)");
    expect(tightest.over).toBe("popover");
    expect(tightest.ratio).toBeCloseTo(1.054, 3);
    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain("placeholder on its dialog fill at 1.054:1");
  });
});

describe("decorativeFailures", () => {
  it("reports a divider that matches the page it rules", () => {
    const broken = {
      colors: { ...lightColors, border: lightColors.background },
    };

    expect(decorativeFailures(broken)).toContainEqual({
      surface: "divider",
      role: "border",
      over: "background",
      ratio: 1,
      floor: decorativeFloor,
    });
  });

  it("reports a skeleton that disappears into the card it stands in", () => {
    const broken = { colors: { ...lightColors, skeleton: lightColors.card } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "skeleton" && over === "card",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a status edge that matches the tint it bounds", () => {
    const broken = { colors: { ...lightColors, info: lightColors.infoSoft } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "statusEdge" && over === "infoSoft",
      ),
    ).toMatchObject({ role: "info", ratio: 1, floor: decorativeFloor });
  });

  it("composites the veil instead of reporting it unmeasurable", () => {
    expect(
      decorativeFailures(lightTheme).some(({ surface }) => surface === "scrim"),
    ).toBe(false);
    const broken = { colors: { ...lightColors, overlay: "#00000000" } };

    expect(
      decorativeFailures(broken).find(({ surface }) => surface === "scrim"),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a surface it cannot measure rather than skipping it", () => {
    const broken = {
      colors: { ...lightColors, background: "#F6F8FA80" },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "divider" && over === "background",
      )?.ratio,
    ).toBeUndefined();
  });

  it("takes a floor, so a stricter brand can run the check it needs", () => {
    expect(decorativeFailures(lightTheme, 1)).toEqual([]);

    expect(decorativeFailures(lightTheme, 21).length).toBe(
      decorativeSurfaces.length +
        actionFeedbackPlacements.length +
        pointerWashTransitions.length +
        dividerWashes.length +
        dividerPresses.length,
    );
  });
});

describe("the documented example", () => {
  it("passes the shipped theme and reports the brand that erased its card edge", () => {
    expect(decorativeSurfacesAreVisible(lightTheme)).toBe(true);
    expect(decorativeSurfacesAreVisible(edgeLessBrand)).toBe(false);
    expect(report(edgeLessBrand)).toContain("divider: border on card is 1.00");
    expect(report(lightTheme)).toEqual([]);
  });

  it("reports the brand whose tonal action is its toolbar", () => {
    expect(decorativeSurfacesAreVisible(flatActionBrand)).toBe(false);
    expect(report(flatActionBrand)).toContain(
      "filledAction: secondary on muted is 1.00",
    );
  });

  it("reports the brand whose shadows are its page", () => {
    expect(decorativeSurfacesAreVisible(flatShadowBrand)).toBe(false);
    expect(report(flatShadowBrand)).toContain(
      "elevation.lg: shadow on background is 1.00",
    );
  });

  it("reports the brand whose unavailable action wears the enabled one's face", () => {
    expect(decorativeSurfacesAreVisible(unavailableActionBrand)).toBe(false);
    expect(report(unavailableActionBrand)).toContain(
      "disabledFace: disabled on secondary is 1.00",
    );
  });

  it("reports the brand whose shadow is its segmented panel", () => {
    expect(decorativeSurfacesAreVisible(panelShadowBrand)).toBe(false);
    expect(report(panelShadowBrand)).toContain(
      "elevation.lg: shadow on secondary is 1.00",
    );
  });

  it("reports the brand whose loading dialog has no placeholder", () => {
    expect(decorativeSurfacesAreVisible(flatSkeletonBrand)).toBe(false);
    expect(report(flatSkeletonBrand)).toContain(
      "skeleton: skeleton on popover is 1.00",
    );
  });
});
