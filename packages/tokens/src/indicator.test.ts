import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
  extendTheme,
  highContrastFloors,
  highContrastLightTheme,
  highContrastThemes,
  indicatorFailures,
  indicatorRoles,
  indicatorSurfaces,
  lightTheme,
  palette,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  statusTone,
  statusTones,
  themes,
  type Theme,
} from "./index.js";

const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const shipped: ReadonlyArray<Theme> = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
];

const placements = (theme: Theme) =>
  indicatorRoles.flatMap((role) =>
    indicatorSurfaces.map((surface) => ({
      role,
      surface,
      ratio: contrastRatio(theme.colors[role], theme.colors[surface]),
      floor: contrastFloorsFor(theme).boundary,
    })),
  );

describe("every shipped theme shows its marks", () => {
  it("passes the contract in all 16 themes", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(16);
    expect(
      shipped
        .filter((theme) => indicatorFailures(theme).length > 0)
        .map((theme) => theme.name),
    ).toEqual([]);
  });

  it("has a tightest placement, so the sweep measures something", () => {
    const tightest = shipped
      .flatMap((theme) =>
        placements(theme).map((placement) => ({
          theme: theme.name,
          ...placement,
        })),
      )
      .reduce((low, placement) =>
        (placement.ratio ?? 0) / placement.floor < (low.ratio ?? 0) / low.floor
          ? placement
          : low,
      );

    expect(tightest.role).toBe("primary");
    expect(tightest.surface).toBe("warningSoft");
    expect(tightest.theme).toBe("Dark · macOS");
    expect(tightest.ratio).toBeCloseTo(3.009, 3);
  });
});

describe("a mark on the row a reader chose", () => {
  it("measures the two washes a list row wears", () => {
    expect(indicatorSurfaces).toEqual(
      expect.arrayContaining(["accent", "selected"]),
    );
  });

  it("holds the painters the strips exist for", () => {
    const list = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const avatar = readFileSync(
      new URL("../../components/src/avatar.tsx", import.meta.url),
      "utf8",
    );

    expect(list).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(list).toContain(
      'active: { backgroundColor: pressWash(theme, "accent") }',
    );
    expect(list).toContain("backgroundColor: theme.colors.selected");

    expect(avatar).toContain("theme.colors.success");
    expect(avatar).toContain("theme.colors.destructive");
    expect(avatar).toContain("theme.colors.mutedForeground");
    expect(avatar).toContain('statusTone(theme, "warning").foreground');
    expect(
      (["success", "destructive", "mutedForeground"] as const).filter(
        (role) => !indicatorRoles.includes(role),
      ),
    ).toEqual([]);
  });

  it("reports the presence dot Luna light lost on its selected row", () => {
    const before = extendTheme(retroTheme(themes.light, "luna"), {
      colors: { success: palette.green[600] },
    });
    const marked = indicatorFailures(before)
      .filter(
        ({ role, surface }) => role === "success" && surface === "selected",
      )
      .map(({ ratio }) =>
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2),
      );

    expect(marked).toEqual(["2.82"]);
    expect(indicatorFailures(retroTheme(themes.light, "luna"))).toEqual([]);
  });

  it("reports a mark painted in the row's own wash", () => {
    const brand = extendTheme(lightTheme, {
      colors: { selected: lightTheme.colors.success },
    });
    const marked = indicatorFailures(brand)
      .filter(
        ({ role, surface }) => role === "success" && surface === "selected",
      )
      .map(({ ratio }) =>
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2),
      );

    expect(marked).toEqual(["1.00"]);
  });

  it("keeps a mark visible on the rows' washes in all 16 styles", () => {
    const rows = shipped.flatMap((theme) =>
      indicatorFailures(theme)
        .filter(({ surface }) => surface === "accent" || surface === "selected")
        .map(
          ({ role, surface, ratio }) =>
            `${theme.name} ${role}/${surface} ${ratio}`,
        ),
    );

    expect(rows).toEqual([]);

    const closest = shipped
      .flatMap((theme) =>
        placements(theme).map((placement) => ({
          theme: theme.name,
          ...placement,
        })),
      )
      .reduce((low, placement) =>
        (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
      );

    expect(
      catalogue.replace(/\s+/g, " "),
      `${closest.theme} ${closest.role}/${closest.surface}`,
    ).toContain(
      `macOS dark's \`primary\` mark on the warning tint a filled action stands in, at ${closest.ratio?.toFixed(3)}:1`,
    );
  });
});

describe("a mark on the wash a row tints", () => {
  it("measures the two washes a row repaints", () => {
    expect(indicatorSurfaces).toEqual(
      expect.arrayContaining(["hover", "active"]),
    );
  });

  it("holds the two painters the strips exist for", () => {
    const menu = readFileSync(
      new URL("../../components/src/menu/item.tsx", import.meta.url),
      "utf8",
    );
    const combobox = readFileSync(
      new URL("../../components/src/combobox.tsx", import.meta.url),
      "utf8",
    );

    expect(menu).toContain("color={theme.colors.primary}");
    expect(menu).toContain("hover: disabled ? undefined");
    expect(menu).toContain("backgroundColor: theme.colors.hover");

    expect(menu).toContain('pressWash(theme, "hover")');
    expect(combobox).toContain("color={theme.colors.primary}");
    expect(combobox).toContain(
      "backgroundColor: state.highlighted ? theme.colors.hover : undefined",
    );
  });

  it("reports the brand tick the washes hid", () => {
    const look = retroTheme(themes.dark, "aero");
    const brand = extendTheme(look, {
      colors: {
        primary: "#0F5E8C",
        primaryForeground: "#FFFFFF",
      },
    });
    const marked = indicatorFailures(brand)
      .filter(({ role }) => role === "primary")
      .map(({ surface, ratio }) => [
        surface,
        ratio === undefined ? undefined : ratio.toFixed(2),
      ]);

    expect(marked).toEqual(
      expect.arrayContaining([
        ["hover", "1.70"],
        ["active", "1.46"],
      ]),
    );
  });
});

describe("a status mark paints the readable role, not the solid fill", () => {
  it("measures the solid warning role below the mark floor", () => {
    expect(
      contrastRatio(lightTheme.colors.warning, lightTheme.colors.background),
    ).toBeCloseTo(1.78, 2);
    expect(lightTheme.colors.warning).not.toBe(
      statusTone(lightTheme, "warning").foreground,
    );
  });

  it("measures the tone's readable role above it, on every strip", () => {
    const missing = statusTones.flatMap((tone) =>
      indicatorSurfaces.flatMap((surface) => {
        const ratio = contrastRatio(
          statusTone(lightTheme, tone).foreground,
          lightTheme.colors[surface],
        );
        return ratio !== undefined &&
          ratio >= contrastFloors.boundary &&
          indicatorRoles.includes(`${tone}SoftForeground`)
          ? []
          : [`${tone}/${surface}`];
      }),
    );

    expect(missing).toEqual([]);
  });

  it("names a mark role for every status tone", () => {
    const missing = statusTones.filter(
      (tone) => !indicatorRoles.includes(`${tone}SoftForeground`),
    );

    expect(missing).toEqual([]);
  });
});

describe("a mark on a message's own tint", () => {
  const tints = statusTones.map((tone) => `${tone}Soft` as const);

  it("measures the four soft tints a message fills", () => {
    expect(indicatorSurfaces).toEqual(expect.arrayContaining(tints));
  });

  it("holds the painters that put a filled action inside an alert", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    const tones = recipes.slice(
      recipes.indexOf("export const ALERT_TONES"),
      recipes.indexOf("export const ALERT_ICON"),
    );
    tints.forEach((tint) => expect(tones).toContain(`bg-${tint}`));
    expect(alert).toContain("ALERT_TONES[value]");

    expect(button).toContain('variant = "secondary"');
    expect(button).toContain('"primary"');
  });

  it("reports the system blue macOS dark lost on every tint", () => {
    const systemBlue = extendTheme(platformTheme(themes.dark, "darwin"), {
      colors: { primary: "#0A84FF" },
    });

    expect(
      indicatorFailures(systemBlue)
        .filter(({ role }) => role === "primary")
        .map(({ surface, ratio }) => [
          surface,
          Number(ratio?.toFixed(2)),
          contrastFloorsFor(systemBlue).boundary,
        ]),
    ).toEqual([
      ["infoSoft", 2.88, 3],
      ["successSoft", 2.56, 3],
      ["warningSoft", 2.32, 3],
      ["destructiveSoft", 2.76, 3],
    ]);
  });

  it("keeps a filled action findable on every tint in every shipped theme", () => {
    expect(
      shipped.flatMap((theme) =>
        tints.flatMap((surface) => {
          const ratio = contrastRatio(
            theme.colors.primary,
            theme.colors[surface],
          );
          const floor = contrastFloorsFor(theme).boundary;
          return ratio === undefined || ratio < floor
            ? [`${theme.name} primary on ${surface}: ${ratio} (needs ${floor})`]
            : [];
        }),
      ),
    ).toEqual([]);
  });
});

describe("a mark it cannot measure is reported, not skipped", () => {
  it("reports a translucent fill on every strip", () => {
    const translucent = extendTheme(lightTheme, {
      colors: { primary: "#00000080" },
    });
    const primary = indicatorFailures(translucent).filter(
      (failure) => failure.role === "primary",
    );

    expect(primary.map(({ surface, ratio }) => [surface, ratio])).toEqual(
      indicatorSurfaces.map((surface) => [surface, undefined]),
    );
  });
});

describe("a caller's floor set is honoured", () => {
  it("reports the pair the default floors pass at 4.5:1", () => {
    expect(indicatorFailures(lightTheme)).toEqual([]);
    expect(
      indicatorFailures(lightTheme, highContrastFloors).map(
        ({ role, surface, floor }) => `${role}/${surface} ${floor}`,
      ),
    ).toContain("success/muted 4.5");
  });
});

describe("the catalogue documents the contract", () => {
  it("documents every public name and the counts it prints", () => {
    ["indicatorRoles", "indicatorSurfaces", "indicatorFailures"].forEach(
      (name) => expect(catalogue).toContain(name),
    );
    expect(catalogue).toContain(
      `The ${indicatorRoles.length} mark roles, on the ${indicatorSurfaces.length} strips`,
    );
  });
});

describe("the floors an indicator report uses", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { primary: "#636363" },
  });

  it("holds the marks to the theme's own variant", () => {
    expect(indicatorFailures(brand, contrastFloors)).toEqual([]);
    expect(
      indicatorFailures(brand).map(({ role, surface, floor }) => ({
        role,
        surface,
        floor,
      })),
    ).toEqual([
      { role: "primary", surface: "active", floor: 4.5 },
      { role: "primary", surface: "selected", floor: 4.5 },
      { role: "primary", surface: "infoSoft", floor: 4.5 },
      { role: "primary", surface: "successSoft", floor: 4.5 },
      { role: "primary", surface: "warningSoft", floor: 4.5 },
      { role: "primary", surface: "destructiveSoft", floor: 4.5 },
    ]);
  });

  it("keeps every shipped high-contrast mark at its own floor", () => {
    expect(
      Object.values(highContrastThemes).flatMap((theme) =>
        indicatorFailures(theme),
      ),
    ).toEqual([]);
  });
});
