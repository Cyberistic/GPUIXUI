import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { brandText } from "./brand-text.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { highlightSurfaces } from "./highlight.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { statusTone, statusTones } from "./styles.js";
import { highContrastThemes, platformTheme, themes } from "./theme.js";

const packageSource = new URL("./", import.meta.url);
const repository = new URL("../../../", import.meta.url);

const packageDirs: ReadonlyArray<string> = [
  ...readdirSync(new URL("packages/", repository)).map(
    (name) => `packages/${name}`,
  ),
  ...readdirSync(new URL("apps/", repository)).map((name) => `apps/${name}`),
];

const components = readFileSync(
  new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
  "utf8",
);

const pages: ReadonlyArray<{ readonly name: string; readonly text: string }> = [
  {
    name: "docs/tokens.md",
    text: readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ),
  },
  {
    name: "docs/design-system.md",
    text: readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ),
  },
];

const section =
  components
    .split(/^## /m)
    .find((part) => part.startsWith("Design system\n")) ?? "";

interface Row {
  readonly capability: string;
  readonly status: string;
  readonly notes: string;

  readonly cells: number;
}

const rows: ReadonlyArray<Row> = section
  .split("\n")
  .filter((line) => line.startsWith("|") && !line.includes("---"))
  .slice(1)
  .map((line): Row => {
    const cells = line.split("|");
    return {
      capability: (cells[1] ?? "").trim(),
      status: (cells[2] ?? "").trim(),
      notes: (cells[4] ?? "").trim(),
      cells: cells.length,
    };
  });

const vocabulary = /^(todo|wip|done\b.*|blocked\b.*|unsupported\b.*)$/;

const isTestFile = (value: string): boolean =>
  value.endsWith(".test.ts") || value.endsWith(".test.tsx");

const walkTests = (dir: URL, prefix: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "dist"
    ) {
      return [];
    }
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      return walkTests(new URL(`${entry.name}/`, dir), path);
    }
    return isTestFile(entry.name) ? [path] : [];
  });

const workspaceTests: ReadonlyArray<string> = packageDirs.flatMap((dir) => {
  const root = new URL(`${dir}/`, repository);
  return existsSync(root) ? walkTests(root, dir) : [];
});

const cited = (notes: string): ReadonlyArray<string> =>
  notes.match(/[\w@/.-]+\.test\.tsx?/g) ?? [];

const resolves = (path: string): boolean =>
  workspaceTests.some((file) => file === path || file.endsWith(`/${path}`)) ||
  [
    `./${path}`,
    path,
    ...packageDirs.flatMap((dir) => [`${dir}/${path}`, `${dir}/src/${path}`]),
  ].some(
    (candidate) =>
      existsSync(new URL(candidate, packageSource)) ||
      existsSync(new URL(candidate, repository)),
  );

describe("design-system inventory", () => {
  it("reads the table it guards", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps four columns on every row", () => {
    const malformed = rows
      .filter((row) => row.cells !== 6)
      .map((row) => row.capability);

    expect(malformed).toEqual([]);
  });

  it("uses the declared status vocabulary", () => {
    const unknown = rows
      .filter((row) => !vocabulary.test(row.status))
      .map((row) => `${row.capability}: ${row.status}`);

    expect(unknown).toEqual([]);
  });

  it("names an existing test file for every done row", () => {
    const unproven = rows
      .filter((row) => row.status.startsWith("done"))
      .filter((row) => {
        const files = cited(row.notes);
        return files.length === 0 || !files.every(resolves);
      })
      .map((row) => row.capability);

    expect(unproven).toEqual([]);
  });

  it("cannot name a landed target size as remaining", () => {
    const targetSizes = rows.find((row) => row.capability === "Target sizes");
    const recipe = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const star = recipe.slice(
      recipe.indexOf("export const ratingStarClass"),
      recipe.indexOf("export const ratingGroupClass"),
    );

    const remaining = targetSizes?.notes.split("Remaining:").at(1) ?? "";

    const starClasses = (star.match(/"[^"]*"/g) ?? []).join(" ");

    expect(remaining).not.toContain("Rating");
    expect(starClasses).toContain("min-target");
  });
});

describe("the style count the rows print", () => {
  const styles = [
    ...Object.values(themes),
    ...Object.values(highContrastThemes),
    ...platformNames.flatMap((name) => [
      platformTheme(themes.light, name),
      platformTheme(themes.dark, name),
    ]),
    ...retroNames.flatMap((look) => [
      retroTheme(themes.light, look),
      retroTheme(themes.dark, look),
    ]),
  ];
  const all = styles.length;

  const tintPlacements = styles.flatMap((theme) => {
    const floor = contrastFloorsFor(theme).secondary;
    const shared = brandText(theme);
    return statusTones.map((tone) => ({
      floor,
      ratio: contrastRatio(shared, statusTone(theme, tone).background),
    }));
  });
  const buried = tintPlacements.filter(
    ({ floor, ratio }) => ratio === undefined || ratio < floor,
  ).length;

  const claims: ReadonlyArray<readonly [string, string]> = [
    ["Syntax palette", `in each of the ${all} styles`],
    [
      "Scale order",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    ["Token numbers", `holds all ${all} shipped, platform and authored themes`],
    ["Contrast contract", `holds all ${all} themes`],
    ["Brand text", `the rest of the ${all} shipped styles`],
    [
      "Brand text",
      `**${buried} of the ${tintPlacements.length}** tint placements across the ${all} styles`,
    ],
    ["Brand text", `clears all ${tintPlacements.length} placements`],
    [
      "Brand text",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    ["Brand text", `over the ${all} × ${statusTones.length} placements`],
    [
      "Find highlights",
      `the ${all * highlightSurfaces.length}-placement sweep`,
    ],
    [
      "Native text hosts",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    [
      "Colour grammar",
      `from all ${all} shipped, high-contrast, platform and authored themes`,
    ],
  ];

  it("derives the set the sweeps walk", () => {
    expect(all).toBe(
      Object.values(themes).length +
        Object.values(highContrastThemes).length +
        platformNames.length * 2 +
        retroNames.length * 2,
    );
    expect(new Set(styles.map((style) => style.name)).size).toBe(all);
    expect(tintPlacements.length).toBe(all * statusTones.length);
  });

  it("prints that count in every row that claims the set", () => {
    const missing = claims
      .filter(([capability, phrase]) => {
        const row = rows.find((entry) => entry.capability === capability);
        return row === undefined || !row.notes.includes(phrase);
      })
      .map(([capability, phrase]) => `${capability}: ${phrase}`);

    expect(missing).toEqual([]);
  });
});

describe("citation resolution", () => {
  it("resolves a filename that sits below a package's src", () => {
    const nested = workspaceTests.find((file) => file.split("/").length > 4);
    expect(nested).toBeDefined();
    expect(resolves(nested?.split("/").at(-1) ?? "")).toBe(true);
  });

  it("reports a file the workspace does not contain", () => {
    expect(resolves("vanished-protocol.test.ts")).toBe(false);
  });
});

describe("the position each surface gives a report in the gate", () => {
  const reports = Object.keys(auditTheme(themes.light)).filter(
    (key) => key !== "passed",
  );
  const ordinals = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth",
    "thirteenth",
    "fourteenth",
  ] as const;
  const cardinals = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
  ] as const;

  const ordinal = (report: string): string =>
    ordinals[reports.indexOf(report)] ?? "unlisted";

  const claims: ReadonlyArray<{
    readonly capability: string;
    readonly report: string;
    readonly phrase: (word: string) => string;
  }> = [
    {
      capability: "Token numbers",
      report: "invalidNumbers",
      phrase: (word) => `as its ${word} report`,
    },
    {
      capability: "Text selection wash",
      report: "selection",
      phrase: (word) => `includes the report as its ${word}`,
    },
    {
      capability: "Indicator marks",
      report: "indicators",
      phrase: (word) => `as its ${word} contract`,
    },
    {
      capability: "Contrast contract",
      report: "disabledFade",
      phrase: (word) => `the gate's ${word} report (\`audit.disabledFade\`)`,
    },
    {
      capability: "Keyboard focus dim",
      report: "keyboardDim",
      phrase: (word) => `the gate's ${word} report`,
    },
  ];

  it("reads an order that covers every report and every word", () => {
    expect(reports).toHaveLength(ordinals.length);
    expect(cardinals[reports.length]).toBeDefined();
    expect(claims.filter(({ report }) => !reports.includes(report))).toEqual(
      [],
    );
  });

  it("prints the position the gate returns each report at", () => {
    const stale = claims.flatMap(({ capability, report, phrase }) => {
      const row = rows.find((entry) => entry.capability === capability);
      const wanted = phrase(ordinal(report));
      return row !== undefined && row.notes.includes(wanted)
        ? []
        : [`${capability}: ${wanted}`];
    });

    expect(stale).toEqual([]);
  });

  it("counts the reports the gate returns, beside `audit.syntax`", () => {
    const row = rows.find((entry) => entry.capability === "Syntax palette");
    const count = cardinals[reports.length] ?? `${reports.length}`;

    expect(row?.notes).toContain(`\`audit.syntax\` (${count} reports)`);
  });

  it("agrees on the keyboard dim's place on the pages that teach it", () => {
    const wanted = `the gate's ${ordinal("keyboardDim")} report (\`audit.keyboardDim\`)`;
    const silent = pages
      .filter(({ text }) => !text.replace(/\s+/g, " ").includes(wanted))
      .map(({ name }) => `${name}: ${wanted}`);

    expect(silent).toEqual([]);
  });
});

describe("the Syntax palette row", () => {
  const source = readFileSync(new URL("./syntax.ts", import.meta.url), "utf8");
  const notes = rows.find(
    (entry) => entry.capability === "Syntax palette",
  )?.notes;

  it("teaches the palette rule the paint follows", () => {
    const code = source.replace(/\s+/g, " ");

    expect(code).toContain("syntaxPalette(theme.syntax, table)");
    expect(code).toContain("namesColour(value)");
    expect(notes).toContain("token by token");
    expect(notes).not.toContain("replaces the table whole");
    expect(notes).not.toContain(
      "would otherwise paint its own colour for that token",
    );
  });
});

describe("the case count a row prints for its suite", () => {
  const claims = rows.flatMap((row) =>
    [...row.notes.matchAll(/`([\w./-]+\.test\.tsx?)` \((\d+) cases?\)/g)].map(
      (match) => ({
        row: row.capability,
        file: match[1] ?? "",
        printed: Number(match[2]),
      }),
    ),
  );

  it("finds the counts the table prints", () => {
    expect(claims.length).toBeGreaterThan(5);
  });

  it("is the count the file runs", () => {
    const stale = claims.flatMap(({ row, file, printed }) => {
      const path = new URL(`./${file}`, import.meta.url);
      if (!existsSync(path)) {
        return [`${row}: ${file} is not a file in this package`];
      }
      const cases = readFileSync(path, "utf8").match(/\bit\(/g)?.length ?? 0;
      return cases === printed
        ? []
        : [`${row}: ${file} prints ${printed}, runs ${cases}`];
    });

    expect(stale).toEqual([]);
  });
});
