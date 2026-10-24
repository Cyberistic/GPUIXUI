/**
 * The numeric groups a paint reads.
 *
 * The bug these guard: the parts read `theme.spacing.xs`,
 * `theme.borderWidth.thin` and the density's `rowHeight` straight off the
 * group. A theme a store hands back can lack the group — JSON writes `null` for
 * a group it never carried, a hand-edited literal drops the key — so the first
 * layout that asked for a gap or an edge threw
 * `TypeError: Cannot read properties of undefined (reading 'xs')` and took the
 * surface down. A paint seam runs mid-render and cannot throw, so every part
 * reads the primitives' published reader (`spaceValue`, `borderWidthOf`,
 * `radiusValue`, `rowHeightOf`), which answers the library's number for the
 * group the theme lost.
 *
 * Examples are excluded: a demo composes like an application and owns the theme
 * it paints; the library's parts are what a consumer cannot fix.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** A numeric group a part must not index directly. */
const groups = ["spacing", "radius", "borderWidth", "density"] as const;

/** Every published reader that answers a group the theme lost. */
const readers = [
  "spaceValue",
  "borderWidthOf",
  "radiusValue",
  "rowHeightOf",
] as const;

const pattern = new RegExp(`theme\\.(${groups.join("|")})\\b`, "g");

/** The raw group reads in one source, as `group` names. */
const rawReads = (text: string): ReadonlyArray<string> =>
  Array.from(text.matchAll(pattern), (match) => match[0]);

/** Every library source, with its path below `src/`. */
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

describe("the numeric groups a paint reads", () => {
  it("reads every group through the reader that answers its absence", () => {
    const raw = sources().flatMap(([path, text]) =>
      rawReads(text).map((read) => `${path}: ${read}`),
    );
    // A raw read names the file it sits in, so the fix is a lookup rather than
    // a search; the readers answer the theme's number when it carries one.
    expect(raw).toEqual([]);
  });

  it("names the readers the package paints through", () => {
    // The guard's premise: the tree really does paint through the published
    // readers, so "no raw reads" cannot pass by a package that reads no metric
    // at all.
    const all = sources()
      .map(([, text]) => text)
      .join("\n");
    const used = readers.filter((reader) => all.includes(`${reader}(theme`));
    expect(used).toEqual(
      expect.arrayContaining(["spaceValue", "borderWidthOf", "rowHeightOf"]),
    );
    // And the scan sees the shapes it is meant to reject, and nothing else:
    // a metered value handed in as an argument is a reader's own call.
    expect(rawReads("gap: theme.spacing.xs,")).toEqual(["theme.spacing"]);
    expect(rawReads("borderBottomWidth: theme.borderWidth.thin,")).toEqual([
      "theme.borderWidth",
    ]);
    expect(rawReads('gap: spaceValue(theme, "xs"),')).toEqual([]);
    expect(rawReads("const spacing = theme.spacing;")).toEqual([
      "theme.spacing",
    ]);
  });

  it("scans the package rather than a list someone remembered", () => {
    // A directory the walk misses would hide every file in it, and the first
    // case would pass on nothing. The count is derived from the tree; the floor
    // only has to be below the smallest real answer.
    expect(sources().length).toBeGreaterThan(40);
    expect(sources().some(([path]) => path === "table/table.tsx")).toBe(true);
    expect(sources().some(([path]) => path === "surfaces/stat-card.tsx")).toBe(
      true,
    );
  });
});
