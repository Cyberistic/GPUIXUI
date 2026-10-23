/**
 * Holds the icon page to the package it documents.
 *
 * The bug this guards: the description said "Forty-seven monochrome icons"
 * while the registry shipped 48, because the count is prose and the set is data.
 * The size table is the second stale value of the same kind — it prints a pixel
 * number per step, and the scale lives in `@gpuixui/tokens`.
 *
 * The page is read from disk, as `packages/primitives/src/docs.test.ts` and the
 * tokens catalogue guards do: this checks a document, not a runtime.
 * `node:fs` is deliberate — `@gpuixui/icons` has no Effect platform dependency
 * and the read happens once, when the suite loads, so there is no event loop to
 * block and nothing to provide a `FileSystem` layer for.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Tokens from "@gpuixui/tokens";
import { ICON_NAMES } from "./names.js";
import { ICON_SIZES, iconPixels } from "./sizes.js";

const page = readFileSync(new URL("../docs/icon.mdx", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const iconSource = readFileSync(new URL("./Icon.tsx", import.meta.url), "utf8");
const lucideRecord = readFileSync(
  new URL("../../../LICENSES/lucide.md", import.meta.url),
  "utf8",
);

/** A frontmatter field's value, or nothing when the field is absent. */
const frontmatter = (field: string): Option.Option<string> =>
  Option.fromNullishOr(new RegExp(`^${field}: (.+)$`, "m").exec(page)?.[1]);

/** The body of one `##` section, without its heading. */
const section = (heading: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(page.split(/^## /m), (part) =>
        part.startsWith(`${heading}\n`),
      ),
      (part) => part.slice(heading.length + 1),
    ),
    () => expect.fail(`the page has no "${heading}" section`),
  );

/** Every backticked name in a section, in order. */
const namesIn = (body: string): ReadonlyArray<string> =>
  Arr.map([...body.matchAll(/`([a-z][a-z-]*)`/g)], (match) => match[1] ?? "");

describe("the icon page", () => {
  it("prints the size of the set it documents", () => {
    const description = Option.getOrElse(frontmatter("description"), () =>
      expect.fail("the page has no description"),
    );
    expect(description).toContain(`${ICON_NAMES.length} monochrome icons`);
  });

  it("prints each size step at the scale's pixel value", () => {
    Arr.forEach(R.toEntries(ICON_SIZES), ([step, pixels]) => {
      // The default step's row names its default after the name: `md` (default).
      const row = new RegExp(
        `\\|\\s*\`${step}\`[^|]*\\|\\s*(\\d+)\\s*\\|`,
      ).exec(page);
      expect(row?.[1]).toBe(String(pixels));
    });
  });

  it("teaches the answer a stored size name gets", () => {
    // This test guards a page claim, not a behaviour: `iconPixels` is proven by
    // `sizes.test.ts` and the painted box by `runtime/icons.runtime.test.tsx`.
    // But a reader who stores a size (a density preference, a saved layout) is
    // the one caller the type does not protect, and the page said nothing about
    // what such a name resolves to while the resolver answered `undefined`. The
    // words are held to the behaviour so they cannot drift apart.
    const sizes = section("Sizes");
    expect({
      resolvesToDefault: sizes.includes("resolve to `md`"),
      namesStoredPreference: sizes.includes("stored preference"),
      namesTheBrokenCount: sizes.includes(
        "`NaN`, an infinity, zero or a negative",
      ),
      readmeTeaches: /name the scale\s+does not carry/.test(readme),
      unknownName: iconPixels("huge"),
      defaultStep: ICON_SIZES.md,
    }).toEqual({
      resolvesToDefault: true,
      namesStoredPreference: true,
      namesTheBrokenCount: true,
      readmeTeaches: true,
      unknownName: ICON_SIZES.md,
      defaultStep: ICON_SIZES.md,
    });
  });

  it("lists every icon the package ships, and only those", () => {
    // A set that grows while its page keeps the old names leaves a reader
    // typing a name that does not exist — and a name typed into the page that
    // does not exist is the same bug in the other direction.
    const listed = Arr.sort(
      Arr.dedupe(namesIn(section("Names"))),
      Order.String,
    );
    expect(listed).toEqual([...ICON_NAMES]);
  });

  it("documents every prop IconProps declares", () => {
    // The bug guarded: the page lists the props it remembers, so a new prop
    // (`testId`, `size`'s raw-pixel form) ships without a reader learning it
    // exists. The same rule `packages/primitives/src/docs.test.ts` holds every
    // Tier 1 page to, applied to the one component page outside that package.
    const declared = Arr.filterMap(
      Arr.fromIterable(
        (
          /export interface IconProps \{([\s\S]*?)\n\}/.exec(iconSource)?.[1] ??
          ""
        ).matchAll(
          /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm,
        ),
      ),
      (match) => {
        const name = match[1] ?? match[2];
        return name === undefined ? Result.failVoid : Result.succeed(name);
      },
    );
    const api = section("API");
    const cells = Arr.map(
      Arr.filter(api.split("\n"), (line) => line.startsWith("|")),
      (line) => /^\|\s*([^|]*)/.exec(line)?.[1] ?? "",
    );
    const documented = new Set(
      Arr.flatMap(cells, (cell) =>
        Arr.map([...cell.matchAll(/`([^`]+)`/g)], (match) => match[1] ?? ""),
      ),
    );
    expect(Arr.length(declared)).toBeGreaterThan(0);
    expect(
      Arr.filter(declared, (name) => !documented.has(name)),
      "props IconProps declares that the API table does not document",
    ).toEqual([]);
  });

  it("cites a provenance record that carries both notices", () => {
    // The claim that used to be false: the page said no third-party icon file
    // was copied while most of the geometry is Lucide's, and pointed at a
    // `LICENSES/` directory with no Lucide record — an ISC/MIT notice the
    // release owed and did not carry.
    expect(section("Provenance")).toContain("`LICENSES/lucide.md`");
    expect(lucideRecord).toContain("lucide-static` `1.61.0`");
    expect(lucideRecord).toContain("## ISC License");
    expect(lucideRecord).toContain("Lucide Icons and Contributors");
    expect(lucideRecord).toContain(
      "## MIT License (for the icons derived from Feather)",
    );
    expect(lucideRecord).toContain("Cole Bemis");
  });
});

describe("the icons README", () => {
  it("cites the provenance record instead of claiming nothing is copied", () => {
    // The same retracted claim the page carried: most of the geometry *is*
    // Lucide's, so a README that denies it and points at a directory with no
    // Lucide record undoes the page's correction.
    expect(readme).toContain("LICENSES/lucide.md");
    expect(readme).not.toContain("copied verbatim");
  });

  it("imports only names @gpuixui/tokens exports", () => {
    // The bug guarded: the README's first example imported `{ theme }` from
    // "@gpuixui/tokens", which publishes `lightTheme`/`darkTheme`/`getTheme` —
    // the package's own usage example failed at its first import.
    const names = Arr.flatMap(
      [...readme.matchAll(/import\s+\{([^}]*)\}\s+from\s+"@gpuixui\/tokens"/g)],
      (match) =>
        Arr.filter(
          Arr.map((match[1] ?? "").split(","), (name) => name.trim()),
          (name) => name !== "",
        ),
    );
    expect(Arr.length(names)).toBeGreaterThan(0);
    expect(
      Arr.filter(names, (name) => !(name in Tokens)),
      "names the README imports that the package does not export",
    ).toEqual([]);
  });

  it("teaches the plural role path the theme it names actually has", () => {
    // The same bug's second half: `theme.color.mutedForeground` and
    // `theme.color.destructive.background` name a `color` group that does not
    // exist, and `destructive` is a role string, not an object with a
    // `.background`.
    const source = `${readme}\n${iconSource}`;
    expect(source).not.toMatch(/\.color\./);
    const roles = Arr.flatMap(
      [...readme.matchAll(/\.colors\.([A-Za-z]+)/g)],
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );
    expect(Arr.length(roles)).toBeGreaterThan(0);
    expect(
      Arr.filter(roles, (role) => !Arr.contains(Tokens.colorRoles, role)),
      "role paths the README uses that no theme carries",
    ).toEqual([]);
  });
});
