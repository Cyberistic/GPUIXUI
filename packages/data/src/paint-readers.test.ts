import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const groups = [
  "spacing",
  "radius",
  "borderWidth",
  "iconSize",
  "density",
  "colors",
] as const;

const readers = [
  "spaceValue",
  "borderWidthOf",
  "radiusValue",
  "iconStepValue",
  "rowHeightOf",
  "themeColors",
] as const;

const pattern = new RegExp(`theme\\.(${groups.join("|")})\\b`, "g");

const rawReads = (text: string): ReadonlyArray<string> =>
  Array.from(text.matchAll(pattern), (match) => match[0]);

const sources = (root = "./"): ReadonlyArray<readonly [string, string]> => {
  const walk = (
    url: URL,
    prefix = "",
  ): ReadonlyArray<readonly [string, string]> =>
    readdirSync(url, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return walk(new URL(`${entry.name}/`, url), `${prefix}${entry.name}/`);
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }
      if (entry.name.includes(".test.")) return [];
      return [
        [
          `${prefix}${entry.name}`,
          readFileSync(new URL(entry.name, url), "utf8"),
        ],
      ];
    });
  return walk(new URL(root, import.meta.url));
};

describe("the groups a paint reads", () => {
  it("reads every group through the reader that answers its absence", () => {
    const raw = sources().flatMap(([path, text]) =>
      rawReads(text).map((read) => `${path}: ${read}`),
    );

    expect(raw).toEqual([]);
  });

  it("names the readers the package paints through", () => {
    const all = sources()
      .map(([, text]) => text)
      .join("\n");
    const used = readers.filter((reader) => all.includes(`${reader}(theme`));
    expect(used).toEqual(
      expect.arrayContaining([
        "spaceValue",
        "borderWidthOf",
        "iconStepValue",
        "rowHeightOf",
        "themeColors",
      ]),
    );

    expect(rawReads("gap: theme.spacing.xs,")).toEqual(["theme.spacing"]);
    expect(rawReads("borderBottomWidth: theme.borderWidth.thin,")).toEqual([
      "theme.borderWidth",
    ]);
    expect(rawReads('gap: spaceValue(theme, "xs"),')).toEqual([]);
    expect(rawReads("const spacing = theme.spacing;")).toEqual([
      "theme.spacing",
    ]);
    expect(rawReads("color: theme.colors.mutedForeground,")).toEqual([
      "theme.colors",
    ]);
    expect(rawReads("const colors = themeColors(theme);")).toEqual([]);
  });

  it("scans the package rather than a list someone remembered", () => {
    expect(sources().length).toBeGreaterThan(40);
    expect(sources().some(([path]) => path === "table/table.tsx")).toBe(true);
    expect(sources().some(([path]) => path === "surfaces/stat-card.tsx")).toBe(
      true,
    );
  });
});
