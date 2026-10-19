import { colorRoles, darkTheme, lightTheme, typography } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { search } from "./search";
import { promotedNameRank } from "./generated-search";
import { tokenSearchEntries } from "./token-search";

/**
 * The bug being guarded: the colour, type, scale and platform tables are
 * rendered React from `@gpuixui/tokens`, not authored MDX, so the Fumadocs page
 * index never saw a token name. Measured against the production build
 * (2026-10-18): `destructiveSoft` returned **zero** results, `primaryForeground`
 * never reached `/docs/theming`, and `bodyStrong` found the Text component — the
 * table that documents each value was absent from search. These tests fail if
 * the token documents are dropped from the index, if a group silently disappears
 * from the catalogue, if a token name is not promoted ahead of unrelated prose,
 * or if the promotion becomes broad enough to steal `input` or `label` from
 * their component pages.
 *
 * Expectations are derived from the package, not from `token-search.ts`, so a
 * new role or scale token is searchable without a docs edit.
 */

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const contentRoot = join(appRoot, "content", "docs");

const contentAt = (url: string): string =>
  tokenSearchEntries.find((entry) => entry.index.url === url)?.index.content ??
  "";

const scaleKeys = [
  ["spacing", lightTheme.spacing],
  ["radius", lightTheme.radius],
  ["borderWidth", lightTheme.borderWidth],
  ["iconSize", lightTheme.iconSize],
] as const;

const textRoles = Object.keys(typography).filter(
  (name) => name !== "sans" && name !== "mono",
);

const headingsIn = (page: string): ReadonlyArray<string> =>
  [
    ...readFileSync(join(contentRoot, page), "utf8").matchAll(
      /^#{2,3} (.+)$/gm,
    ),
  ].map((match) =>
    (match[1] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  );

const colourUrl = "/docs/theming#semantic-roles";
const scaleUrl = "/docs/theming#scales-and-control-metrics";
const typeUrl = "/docs/typography";

describe("the token catalogue is indexed", () => {
  it("lists every colour role the package ships", () => {
    const content = contentAt(colourUrl);
    const missing = colorRoles.filter((role) => !content.includes(`${role}:`));
    expect(missing).toEqual([]);
    expect(content).toContain("destructiveSoft:");
  });

  it("lists every scale token from the real theme, group by group", () => {
    const content = contentAt(scaleUrl);
    const missing = scaleKeys.flatMap(([group, values]) =>
      Object.keys(values)
        .filter((name) => !content.includes(`${group}.${name}:`))
        .map((name) => `${group}.${name}`),
    );
    expect(missing).toEqual([]);
  });

  it("lists every density metric and elevation level", () => {
    const content = contentAt(scaleUrl);
    const expected = [
      ...["sm", "md", "lg"].flatMap((size) => [
        `density.controlHeight.${size}`,
        `density.controlPaddingX.${size}`,
      ]),
      "density.rowHeight",
      ...["sm", "md", "lg", "overlay"].map((level) => `elevation.${level}`),
    ];
    const missing = expected.filter((name) => !content.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it("lists every typographic role the package ships", () => {
    const content = contentAt(typeUrl);
    const missing = textRoles.filter((role) => !content.includes(`${role}:`));
    expect(missing).toEqual([]);
  });

  it("keeps the two theme values beside each colour role", () => {
    expect(contentAt(colourUrl)).toContain(
      `destructiveSoft: ${lightTheme.colors.destructiveSoft} (light), ${darkTheme.colors.destructiveSoft} (dark)`,
    );
  });
});

describe("token search", { timeout: 120_000 }, () => {
  it("finds a colour role that appears on no authored page", async () => {
    const results = await search("destructiveSoft", 5);
    expect(results[0]?.url).toBe(colourUrl);
  });

  it("puts the colour table ahead of component prose for a camelCase role", async () => {
    const results = await search("primaryForeground", 5);
    expect(results[0]?.url).toBe(colourUrl);
  });

  it("finds a type role instead of a component that samples it", async () => {
    const results = await search("bodyStrong", 5);
    expect(results[0]?.url).toBe(typeUrl);
  });

  it("finds a scale token in its own table", async () => {
    const results = await search("spacing.md", 5);
    expect(results[0]?.url).toBe(scaleUrl);
  });

  it("finds the role that owns a pasted light-theme value", async () => {
    const results = await search(lightTheme.colors.destructiveSoft, 5);
    expect(results[0]?.url).toBe(colourUrl);
  });

  it("does not steal an ordinary word from its component page", async () => {
    const [input, label] = await Promise.all([
      search("input", 5),
      search("label", 5),
    ]);
    expect(input[0]?.url).toBe("/docs/components/text-input");
    expect(label[0]?.url).toBe("/docs/components/label");
  });

  it("finds a camelCase role written as separate words", async () => {
    const [primary, destructive] = await Promise.all([
      search("primary foreground", 5),
      search("destructive soft", 5),
    ]);
    expect(primary[0]?.url).toBe(colourUrl);
    expect(destructive[0]?.url).toBe(colourUrl);
  });

  it("does not invent a token that no table lists", async () => {
    expect(await search("destructiveSoftProbe")).toEqual([]);
  });
});

describe("the promotion rule", () => {
  it("promotes a distinctive name and leaves a plain word alone", () => {
    const entry = tokenSearchEntries.find(
      (candidate) => candidate.index.url === colourUrl,
    );
    expect(promotedNameRank(entry, "inputForeground")).toBe(0);
    expect(promotedNameRank(entry, "input")).toBeUndefined();
  });
});

describe("token result fragments", () => {
  it("points every token result at a heading the page renders", () => {
    const headings: Readonly<Record<string, ReadonlyArray<string>>> = {
      "/docs/theming": headingsIn("theming.mdx"),
      "/docs/typography": headingsIn("typography.mdx"),
    };
    const dead = tokenSearchEntries.flatMap((entry) => {
      const [path, fragment] = entry.index.url.split("#");
      if (path === undefined || fragment === undefined) return [];
      const rendered = headings[path] ?? [];
      return rendered.includes(fragment) ? [] : [entry.index.url];
    });
    expect(dead).toEqual([]);
  });
});
