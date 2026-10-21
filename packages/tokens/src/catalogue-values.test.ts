/**
 * Holds every value `docs/tokens.md` prints to the package that carries it.
 *
 * The bug this guards: the catalogue is the page a consumer treats as the token
 * reference — it prints each role's light and dark hex, every palette ramp, the
 * platform chrome palettes, the type metrics and every scale. `docs.test.ts`
 * holds only its *shape* (a role has a row, the counts agree), so a palette edit
 * could change `lightColors.primary` and leave the page printing the previous
 * value: a reader copies a hex the library no longer ships, and nothing fails.
 * The platform chrome table and the elevation table had no reader at all.
 *
 * Each check compares the printed cell with the exported value, and the row set
 * with the exported keys, so a value that moves and a token that is added or
 * dropped are both named. `node:fs` is deliberate, as in `docs.test.ts`: this
 * checks the repository's own Markdown, and the package keeps zero runtime
 * dependencies.
 */
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
import {
  darkElevation,
  highContrastDarkElevation,
  highContrastLightElevation,
  lightElevation,
  type BoxShadow,
  type Elevation,
} from "./elevation.js";
import { isPlatformName, platformNames, platformStyles } from "./platforms.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
import { statusTones } from "./styles.js";
import { typography, type TextStyle } from "./typography.js";

const doc = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

/** A Markdown table: its header cells and its body rows, each cell trimmed. */
interface DocTable {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

/** The cells of one table line. */
const cells = (line: string): ReadonlyArray<string> =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

/** Every table in the page, split on the blank line between blocks. */
const docTables: ReadonlyArray<DocTable> = doc
  .split(/\n{2,}/)
  .flatMap((block) => {
    const lines = block.split("\n").filter((line) => line.startsWith("|"));
    const header = lines[0];
    if (header === undefined || lines.length < 2) {
      return [];
    }
    // The second line is the `| --- |` rule; the rest are rows.
    return [{ header: cells(header), rows: lines.slice(2).map(cells) }];
  });

/** The one table matching a description, failing by name when it is gone. */
const docTable = (
  description: string,
  matches: (candidate: DocTable) => boolean,
): DocTable => {
  const found = docTables.find(matches);
  expect(found, `docs/tokens.md no longer has ${description}`).toBeDefined();
  return found ?? { header: [], rows: [] };
};

/** The table whose header is exactly `header`, in order. */
const headed = (header: ReadonlyArray<string>): DocTable =>
  docTable(
    `the table "${header.join(" | ")}"`,
    (candidate) =>
      candidate.header.length === header.length &&
      header.every((cell, index) => candidate.header[index] === cell),
  );

/** The text inside a cell's one code span, or the cell itself when it has none. */
const code = (cell: string): string => /`([^`]*)`/.exec(cell)?.[1] ?? cell;

/** A cell with every code span unwrapped — a cell that names more than one role. */
const plain = (cell: string): string => cell.replace(/`/g, "").trim();

/** The integers a cell prints, in order. */
const numbers = (cell: string): ReadonlyArray<number> =>
  (cell.match(/-?\d+/g) ?? []).map(Number);

/** A role table as `role → printed values`, in the page's order. */
const printedColours = (
  header: ReadonlyArray<string>,
  columns: number,
): ReadonlyMap<string, ReadonlyArray<string>> =>
  new Map(
    headed(header).rows.map((row) => [
      code(row[0] ?? ""),
      row.slice(1, 1 + columns).map(code),
    ]),
  );

/** Every printed cell that is not the value the colour set carries. */
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

const isColourRole = (value: string): value is keyof ThemeColors =>
  colorRoles.some((role) => role === value);

describe("the catalogue's colour roles", () => {
  it("prints the value each theme carries, light and dark", () => {
    const printed = printedColours(["Role", "Light", "Dark", "Use"], 2);

    expect([...printed.keys()]).toEqual([...colorRoles]);
    expect(
      colourDrift(printed, [
        ["light", lightColors],
        ["dark", darkColors],
      ]),
    ).toEqual([]);
  });

  it("prints the value each high-contrast theme carries", () => {
    const printed = printedColours(["Role", "HC light", "HC dark", "Use"], 2);

    expect([...printed.keys()]).toEqual([...colorRoles]);
    expect(
      colourDrift(printed, [
        ["high contrast light", highContrastLightColors],
        ["high contrast dark", highContrastDarkColors],
      ]),
    ).toEqual([]);
  });

  it("prints each palette ramp's steps", () => {
    const printed = new Map(
      headed(["Ramp", "Steps"]).rows.map((row) => [
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
  /** The six chrome columns, in the table's order. */
  const columns = [
    ["darwin", "light"],
    ["darwin", "dark"],
    ["linux", "light"],
    ["linux", "dark"],
    ["win32", "light"],
    ["win32", "dark"],
  ] as const;

  it("prints the roles each platform repaints, and `base` for the ones it inherits", () => {
    const printed = headed([
      "Role",
      "macOS light",
      "macOS dark",
      "Linux light",
      "Linux dark",
      "Windows light",
      "Windows dark",
    ]).rows;

    const drift = printed.flatMap((row) => {
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

  it("prints each platform's family, radius and density", () => {
    const rows = headed([
      "Platform",
      "`sans`",
      "`mono`",
      "`radius.md`",
      "density",
    ]).rows;

    expect(rows.map((row) => code(row[0] ?? ""))).toEqual([...platformNames]);
    const drift = rows.flatMap((row) => {
      const name = code(row[0] ?? "");
      const style = isPlatformName(name) ? platformStyles[name] : undefined;
      if (style === undefined) {
        return [`${name}: not a platform style`];
      }
      const expected = [
        style.sans,
        style.mono,
        style.radius.md,
        style.density,
        densityPresets[style.density].controlHeight.md,
      ];
      const printedValues = [
        code(row[1] ?? ""),
        code(row[2] ?? ""),
        numbers(row[3] ?? "")[0],
        code(row[4] ?? ""),
        numbers(row[4] ?? "")[0],
      ];
      return printedValues.join() === expected.join()
        ? []
        : [`${name}: printed ${printedValues.join(" / ")}`];
    });

    expect(drift).toEqual([]);
  });
});

describe("the catalogue's typography", () => {
  it("prints each role's size, leading and weight", () => {
    const printed = new Map(
      headed(["Role", "Size", "Line height", "Weight", "Use"]).rows.map(
        (row) => [
          code(row[0] ?? ""),
          numbers(`${row[1] ?? ""} ${row[2] ?? ""} ${row[3] ?? ""}`),
        ],
      ),
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
  /** The two `Token | Pixels` tables: the spacing scale and the dotted scales. */
  const scalarTables = docTables.filter(
    (candidate) => candidate.header.join("|") === "Token|Pixels",
  );
  const dotted = (candidate: DocTable): boolean =>
    (candidate.rows[0]?.[0] ?? "").includes(".");

  /** A `Token | Pixels` table as `token → pixels` pairs. */
  const printedScalars = (candidate: DocTable): ReadonlyArray<string> =>
    candidate.rows.map(
      (row) => `${code(row[0] ?? "")} ${numbers(row[1] ?? "")[0]}`,
    );

  it("prints the spacing scale", () => {
    const table = docTable(
      "the spacing table",
      (candidate) => scalarTables.includes(candidate) && !dotted(candidate),
    );

    expect(printedScalars(table)).toEqual(
      Object.entries(spacing).map(([step, value]) => `${step} ${value}`),
    );
  });

  it("prints the radius scale", () => {
    const printed = headed(["Token", "Pixels", "Use"]).rows;

    expect(
      printed.map((row) => `${code(row[0] ?? "")} ${numbers(row[1] ?? "")[0]}`),
    ).toEqual(
      Object.entries(radius).map(([step, value]) => `${step} ${value}`),
    );
  });

  it("prints the border, icon and avatar scales", () => {
    const table = docTable(
      "the border and icon table",
      (candidate) => scalarTables.includes(candidate) && dotted(candidate),
    );
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
    ];

    expect(printedScalars(table)).toEqual(
      scales.map(([token, value]) => `${token} ${value}`),
    );
  });

  it("prints every density preset and marks the default", () => {
    const rows = docTable(
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
      headed([
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
      headed([
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
