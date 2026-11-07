import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  darkElevation,
  highContrastDarkElevation,
  highContrastLightElevation,
  lightElevation,
  type BoxShadow,
  type Elevation,
} from "./elevation.js";
import {
  isPlatformName,
  platformNames,
  platformStyles,
  type PlatformStyle,
} from "./platforms.js";
import { isRetroName, retroNames, retroStyles, retroTheme } from "./retro.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
  targetSize,
} from "./scale.js";
import {
  darkSeries,
  highContrastDarkSeries,
  highContrastLightSeries,
  lightSeries,
  seriesColors,
  seriesDeficiencyFloor,
  seriesDistinctnessFloor,
  seriesSurfaces,
} from "./series.js";
import { statusTones } from "./styles.js";
import {
  darkSyntax,
  highContrastDarkSyntax,
  highContrastLightSyntax,
  lightSyntax,
  syntaxColors,
  syntaxRoles,
  syntaxSurfaces,
} from "./syntax.js";
import { highContrastThemes, platformTheme, themes } from "./theme.js";
import { typography, type TextStyle } from "./typography.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const readme = read("../README.md");

const flatCatalogue = catalogue.replace(/\s+/g, " ");

interface DocTable {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

const cells = (line: string): ReadonlyArray<string> =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const tablesIn = (markdown: string): ReadonlyArray<DocTable> =>
  markdown.split(/\n{2,}/).flatMap((block) => {
    const lines = block.split("\n").filter((line) => line.startsWith("|"));
    const header = lines[0];
    if (header === undefined || lines.length < 2) {
      return [];
    }

    return [{ header: cells(header), rows: lines.slice(2).map(cells) }];
  });

const docTable = (
  markdown: string,
  description: string,
  matches: (candidate: DocTable) => boolean,
): DocTable => {
  const found = tablesIn(markdown).find(matches);
  expect(found, `${description} is no longer in the document`).toBeDefined();
  return found ?? { header: [], rows: [] };
};

const headed = (markdown: string, header: ReadonlyArray<string>): DocTable =>
  docTable(
    markdown,
    `the table "${header.join(" | ")}"`,
    (candidate) =>
      candidate.header.length === header.length &&
      header.every((cell, index) => candidate.header[index] === cell),
  );

const code = (cell: string): string => /`([^`]*)`/.exec(cell)?.[1] ?? cell;

const plain = (cell: string): string => cell.replace(/`/g, "").trim();

const numbers = (cell: string): ReadonlyArray<number> =>
  (cell.match(/-?\d+/g) ?? []).map(Number);

const isColourRole = (value: string): value is keyof ThemeColors =>
  colorRoles.some((role) => role === value);

const printedColours = (
  markdown: string,
  header: ReadonlyArray<string>,
  columns: number,
): ReadonlyMap<string, ReadonlyArray<string>> =>
  new Map(
    headed(markdown, header).rows.map((row) => [
      code(row[0] ?? ""),
      row.slice(1, 1 + columns).map(code),
    ]),
  );

const colourDrift = (
  printed: ReadonlyMap<string, ReadonlyArray<string>>,
  sets: ReadonlyArray<readonly [string, ThemeColors]>,
): ReadonlyArray<string> =>
  colorRoles.flatMap((role) => {
    const values = printed.get(role) ?? [];
    return sets.flatMap(([label, colours], index) =>
      values[index] === colours[role]
        ? []
        : [
            `${label} ${role}: printed ${values[index] ?? "no value"}, carries ${colours[role]}`,
          ],
    );
  });

const styleDrift = (
  rows: ReadonlyArray<ReadonlyArray<string>>,
  styleOf: (name: string) => PlatformStyle | undefined,
): ReadonlyArray<string> =>
  rows.flatMap((row) => {
    const name = code(row[0] ?? "");
    const style = styleOf(name);
    if (style === undefined) {
      return [`${name}: not a style the package ships`];
    }
    const printed = [
      code(row[1] ?? ""),
      code(row[2] ?? ""),
      numbers(row[3] ?? "")[0],
      code(row[4] ?? ""),
    ];
    const carried = [style.sans, style.mono, style.radius.md, style.density];
    const height = numbers(row[4] ?? "")[0];
    const heightDrift =
      height === undefined ||
      height === densityPresets[style.density].controlHeight.md
        ? []
        : [
            `${name}: printed a ${height}px control, density is ${style.density}`,
          ];

    return printed.join() === carried.join()
      ? heightDrift
      : [`${name}: printed ${printed.join(" / ")}`];
  });

describe("the catalogue's colour roles", () => {
  it("prints the value each theme carries, light and dark", () => {
    const printed = printedColours(
      catalogue,
      ["Role", "Light", "Dark", "Use"],
      2,
    );

    expect([...printed.keys()]).toEqual([...colorRoles]);
    expect(
      colourDrift(printed, [
        ["light", lightColors],
        ["dark", darkColors],
      ]),
    ).toEqual([]);
  });

  it("prints the value each high-contrast theme carries", () => {
    const printed = printedColours(
      catalogue,
      ["Role", "HC light", "HC dark", "Use"],
      2,
    );

    expect([...printed.keys()]).toEqual([...colorRoles]);
    expect(
      colourDrift(printed, [
        ["high contrast light", highContrastLightColors],
        ["high contrast dark", highContrastDarkColors],
      ]),
    ).toEqual([]);
  });

  it("prints the value each variant's data series carries", () => {
    const rows = headed(catalogue, [
      "Series",
      "Light",
      "Dark",
      "HC light",
      "HC dark",
    ]).rows;
    const tables = [
      lightSeries,
      darkSeries,
      highContrastLightSeries,
      highContrastDarkSeries,
    ];
    const drift = tables.flatMap((colors, column) =>
      colors.flatMap((color, index) => {
        const printed = code(rows[index]?.[column + 1] ?? "");
        return printed === color
          ? []
          : [
              `series ${index + 1} column ${column + 1}: printed ${printed || "no value"}, carries ${color}`,
            ];
      }),
    );

    expect(rows.map((row) => code(row[0] ?? ""))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(drift).toEqual([]);
  });

  it("prints the series distances the contract applies", () => {
    expect(catalogue).toContain(`\`${seriesDistinctnessFloor}\``);
    expect(catalogue).toContain(`\`${seriesDeficiencyFloor}\``);
    expect(catalogue).toContain("`colorVisionDeficiencies`");
    expect(catalogue).toContain("`simulateColorVision`");
  });

  it("prints the tightest plot placement it measures", () => {
    const shipped = [
      ["light", themes.light, lightSeries],
      ["dark", themes.dark, darkSeries],
      [
        "high contrast light",
        highContrastThemes.light,
        highContrastLightSeries,
      ],
      ["high contrast dark", highContrastThemes.dark, highContrastDarkSeries],
    ] as const;
    const shippedPlacements = shipped.flatMap(([, theme, table]) =>
      table.flatMap((color, index) =>
        seriesSurfaces.map((surface) => ({
          table,
          index,
          surface,
          ratio: contrastRatio(color, theme.colors[surface]) ?? 0,
        })),
      ),
    );
    const shippedTightest = shippedPlacements.reduce((lowest, placement) =>
      placement.ratio < lowest.ratio ? placement : lowest,
    );
    const styled = [
      ...platformNames.flatMap((name) =>
        Object.values(themes).map((theme) => platformTheme(theme, name)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const styledPlacements = styled.flatMap((theme) =>
      seriesColors(theme).flatMap((color, index) =>
        seriesSurfaces.map((surface) => ({
          theme,
          index,
          surface,
          ratio: contrastRatio(color, theme.colors[surface]) ?? 0,
        })),
      ),
    );
    const styledTightest = styledPlacements.reduce((lowest, placement) =>
      placement.ratio < lowest.ratio ? placement : lowest,
    );

    expect(seriesSurfaces).toContain("muted");
    expect(shippedTightest.index).toBe(0);
    expect(shippedTightest.surface).toBe("muted");
    expect(shippedTightest.ratio).toBeCloseTo(3.492, 3);
    expect(flatCatalogue).toContain(
      `light series 1 at ${shippedTightest.ratio.toFixed(2)}:1`,
    );
    expect(styledTightest.theme.name).toBe("Light · Windows 7 (Aero)");
    expect(styledTightest.surface).toBe("muted");
    expect(flatCatalogue).toContain(
      `Aero's light series 1 on its muted strip at ${styledTightest.ratio.toFixed(2)}:1`,
    );
  });

  it("prints each palette ramp's steps", () => {
    const printed = new Map(
      headed(catalogue, ["Ramp", "Steps"]).rows.map((row) => [
        code(row[0] ?? ""),
        [...(row[1] ?? "").matchAll(/(\d+)\s+`(#[0-9A-Fa-f]{6})`/g)].map(
          (match) => `${match[1]} ${match[2]}`,
        ),
      ]),
    );

    expect([...printed.keys()]).toEqual(Object.keys(palette));
    const drift = Object.entries(palette).flatMap(([ramp, steps]) => {
      const expected = Object.entries(steps).map(
        ([step, hex]) => `${step} ${hex}`,
      );
      const actual = printed.get(ramp) ?? [];
      return actual.join(", ") === expected.join(", ")
        ? []
        : [`${ramp}: printed ${actual.join(", ") || "no steps"}`];
    });

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's platform chrome", () => {
  const columns = [
    ["darwin", "light"],
    ["darwin", "dark"],
    ["linux", "light"],
    ["linux", "dark"],
    ["win32", "light"],
    ["win32", "dark"],
  ] as const;

  it("prints the roles each platform repaints, and `base` for the ones it inherits", () => {
    const rows = headed(catalogue, [
      "Role",
      "macOS light",
      "macOS dark",
      "Linux light",
      "Linux dark",
      "Windows light",
      "Windows dark",
    ]).rows;

    const drift = rows.flatMap((row) => {
      const role = code(row[0] ?? "");
      if (!isColourRole(role)) {
        return [`${role}: not a colour role`];
      }
      return columns.flatMap(([platform, mode], index) => {
        const cell = row[index + 1] ?? "";
        const carried = platformStyles[platform].colors[mode][role];
        const value = cell === "base" ? undefined : code(cell);
        return value === carried
          ? []
          : [
              `${platform} ${mode} ${role}: printed ${cell}, carries ${carried ?? "base"}`,
            ];
      });
    });

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's typography", () => {
  it("prints each role's size, leading and weight", () => {
    const printed = new Map(
      headed(catalogue, [
        "Role",
        "Size",
        "Line height",
        "Weight",
        "Use",
      ]).rows.map((row) => [
        code(row[0] ?? ""),
        numbers(`${row[1] ?? ""} ${row[2] ?? ""} ${row[3] ?? ""}`),
      ]),
    );
    const roles = Object.entries(typography).flatMap(([role, style]) =>
      typeof style === "object" ? [[role, style] as const] : [],
    );

    expect([...printed.keys()]).toEqual(roles.map(([role]) => role));
    const drift = roles.flatMap(
      ([role, style]: readonly [string, TextStyle]) => {
        const actual = printed.get(role) ?? [];
        const expected = [style.fontSize, style.lineHeight, style.fontWeight];
        return actual.join() === expected.join()
          ? []
          : [`${role}: printed ${actual.join("/") || "no row"}`];
      },
    );

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's scales", () => {
  const scalarTable = (dotted: boolean, description: string): DocTable =>
    docTable(
      catalogue,
      description,
      (candidate) =>
        candidate.header.join("|") === "Token|Pixels" &&
        (candidate.rows[0]?.[0] ?? "").includes(".") === dotted,
    );

  const printedScalars = (candidate: DocTable): ReadonlyArray<string> =>
    candidate.rows.map(
      (row) => `${code(row[0] ?? "")} ${numbers(row[1] ?? "")[0]}`,
    );

  it("prints the spacing scale", () => {
    const table = scalarTable(false, "the spacing table");

    expect(printedScalars(table)).toEqual(
      Object.entries(spacing).map(([step, value]) => `${step} ${value}`),
    );
  });

  it("prints the radius scale", () => {
    const printed = headed(catalogue, ["Token", "Pixels", "Use"]).rows;

    expect(
      printed.map((row) => `${code(row[0] ?? "")} ${numbers(row[1] ?? "")[0]}`),
    ).toEqual(
      Object.entries(radius).map(([step, value]) => `${step} ${value}`),
    );
  });

  it("prints the border, icon, avatar and target scales", () => {
    const table = scalarTable(true, "the border and icon table");
    const scales = [
      ...Object.entries(borderWidth).map(
        ([step, value]) => [`borderWidth.${step}`, value] as const,
      ),
      ...Object.entries(iconSize).map(
        ([step, value]) => [`iconSize.${step}`, value] as const,
      ),
      ...Object.entries(avatarSize).map(
        ([step, value]) => [`avatarSize.${step}`, value] as const,
      ),
      ...Object.entries(targetSize).map(
        ([step, value]) => [`targetSize.${step}`, value] as const,
      ),
    ];

    expect(printedScalars(table)).toEqual(
      scales.map(([token, value]) => `${token} ${value}`),
    );
  });

  it("prints every density preset and marks the default", () => {
    const rows = docTable(
      catalogue,
      "the density table",
      (candidate) => candidate.header[0] === "Preset",
    ).rows;
    const printed = new Map(
      rows.map((row) => [
        code(row[0] ?? ""),
        [numbers(row[1] ?? ""), numbers(row[2] ?? ""), numbers(row[3] ?? "")],
      ]),
    );

    expect([...printed.keys()]).toEqual(Object.keys(densityPresets));
    const drift = Object.values(densityPresets).flatMap((preset) => {
      const [heights = [], paddings = [], rowHeight = []] =
        printed.get(preset.name) ?? [];
      const expected = [
        Object.values(preset.controlHeight),
        Object.values(preset.controlPaddingX),
        [preset.rowHeight],
      ];
      return [heights, paddings, rowHeight].join() === expected.join()
        ? []
        : [
            `${preset.name}: printed ${[heights, paddings, rowHeight].join(" / ")}`,
          ];
    });
    const marked = rows
      .filter((row) => (row[0] ?? "").includes("(default)"))
      .map((row) => code(row[0] ?? ""));

    expect(drift).toEqual([]);
    expect(marked).toEqual([defaultDensity.name]);
  });

  it("prints each elevation level's one shadow", () => {
    const describe = (shadows: ReadonlyArray<BoxShadow>): string =>
      shadows.length === 0
        ? "[]"
        : shadows
            .map((shadow) =>
              [
                shadow.offsetX,
                shadow.offsetY,
                shadow.blurRadius,
                shadow.spreadRadius,
                shadow.color,
              ].join(" "),
            )
            .join(", ");
    const printed = new Map(
      headed(catalogue, [
        "Level",
        "Light",
        "Dark",
        "High-contrast light",
        "High-contrast dark",
        "Use",
      ]).rows.map((row) => [code(row[0] ?? ""), row.slice(1, 5).map(code)]),
    );
    const scales: ReadonlyArray<readonly [string, Elevation]> = [
      ["light", lightElevation],
      ["dark", darkElevation],
      ["high contrast light", highContrastLightElevation],
      ["high contrast dark", highContrastDarkElevation],
    ];

    expect([...printed.keys()]).toEqual(Object.keys(lightElevation));
    const drift = scales.flatMap(([label, scale], index) => {
      const carried = new Map(
        Object.entries(scale).map(([level, shadows]) => [
          level,
          describe(shadows),
        ]),
      );
      return [...printed.keys()].flatMap((level) => {
        const value = printed.get(level)?.[index];
        const expected = carried.get(level);
        return value === expected
          ? []
          : [
              `${label} ${level}: printed ${value ?? "no cell"}, carries ${expected ?? "nothing"}`,
            ];
      });
    });

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's status tones", () => {
  it("names each tone's solid, soft and readable roles", () => {
    const printed = new Map(
      headed(catalogue, [
        "Tone",
        "Solid",
        "Soft surface",
        "Text on the soft surface",
      ]).rows.map((row) => [code(row[0] ?? ""), row.slice(1, 4).map(plain)]),
    );

    expect([...printed.keys()]).toEqual([...statusTones]);
    const drift = statusTones.flatMap((tone) => {
      const expected = `${tone} / ${tone}Foreground / ${tone}Soft / ${tone}SoftForeground`;
      const actual = (printed.get(tone) ?? []).join(" / ");
      return actual === expected
        ? []
        : [`${tone}: printed ${actual || "no row"}`];
    });

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's syntax palette", () => {
  it("prints the value each table carries, for every token type", () => {
    const rows = headed(catalogue, ["Token", "Light", "Dark"]).rows;

    expect(rows.map((row) => code(row[0] ?? ""))).toEqual([...syntaxRoles]);
    const drift = rows.flatMap((row, index) => {
      const role = syntaxRoles[index];
      if (role === undefined) {
        return [];
      }
      const light = code(row[1] ?? "");
      const dark = code(row[2] ?? "");
      return [
        ...(light === lightSyntax[role]
          ? []
          : [`light ${role}: printed ${light}, carries ${lightSyntax[role]}`]),
        ...(dark === darkSyntax[role]
          ? []
          : [`dark ${role}: printed ${dark}, carries ${darkSyntax[role]}`]),
      ];
    });

    expect(drift).toEqual([]);
  });

  it("names the four tables, the floors and the quiet role's AAA values", () => {
    [
      "lightSyntax",
      "darkSyntax",
      "highContrastLightSyntax",
      "highContrastDarkSyntax",
      "syntaxRoles",
      "syntaxRoleFloors",
      "syntaxSurfaces",
      "syntaxColors",
      "syntaxFailures",
    ].forEach((name) => expect(catalogue).toContain(`\`${name}\``));

    expect(catalogue).toContain(highContrastLightSyntax.comment);
    expect(catalogue).toContain(highContrastDarkSyntax.comment);
    expect(syntaxRoles.length).toBe(24);
    expect(flatCatalogue).toContain("**twenty-four** token types");
  });

  it("prints the tightest token it measures", () => {
    const shipped = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.map((name) => platformTheme(themes.light, name)),
      ...platformNames.map((name) => platformTheme(themes.dark, name)),
      ...[themes.light, themes.dark].flatMap((base) =>
        retroNames.map((name) => retroTheme(base, name)),
      ),
    ];
    const cells = shipped.flatMap((theme) =>
      syntaxRoles
        .filter((role) => role !== "comment")
        .flatMap((role) =>
          syntaxSurfaces.map((surface) => ({
            theme: theme.name,
            role,
            surface,
            ratio: contrastRatio(
              syntaxColors(theme)[role],
              theme.colors[surface],
            ),
          })),
        ),
    );
    const tightest = cells.reduce((worst, cell) =>
      (cell.ratio ?? 1) < (worst.ratio ?? 1) ? cell : worst,
    );

    expect(flatCatalogue).toContain(
      `the tightest shipped cell is a \`${tightest.role}\` at **${(tightest.ratio ?? 0).toFixed(2)}:1**`,
    );
    expect(flatCatalogue).toContain("Windows XP (Luna) look's light page");
    expect(tightest.role).toBe("string");
    expect(tightest.surface).toBe("background");
    expect(tightest.theme).toBe("Light · Windows XP (Luna)");
  });
});

describe("the README's style tables", () => {
  const styleOf = (name: string): PlatformStyle | undefined =>
    isPlatformName(name) ? platformStyles[name] : undefined;
  const lookOf = (name: string): PlatformStyle | undefined =>
    isRetroName(name) ? retroStyles[name] : undefined;

  it("prints each platform's family, radius and density", () => {
    const rows = docTable(
      readme,
      "the README platform table",
      (candidate) => candidate.header[0] === "Platform",
    ).rows;

    expect(rows.map((row) => code(row[0] ?? ""))).toEqual([...platformNames]);
    expect(styleDrift(rows, styleOf)).toEqual([]);
  });

  it("prints each authored look's family, radius and density", () => {
    const rows = docTable(
      readme,
      "the README look table",
      (candidate) => candidate.header[0] === "Look",
    ).rows;

    expect(rows.map((row) => code(row[0] ?? ""))).toEqual([...retroNames]);
    expect(styleDrift(rows, lookOf)).toEqual([]);
  });

  it("quotes the value the table carries in an inline comment", () => {
    const quoted = (value: string | undefined): string =>
      value ?? "the style carries no value";
    const lines = [
      `platformStyles.darwin.colors.dark.primary; // "${quoted(platformStyles.darwin.colors.dark.primary)}"`,
      `retroStyles.aero.colors.dark.primary; // "${quoted(retroStyles.aero.colors.dark.primary)}"`,
    ];

    expect(lines.filter((line) => !readme.includes(line))).toEqual([]);
  });
});
