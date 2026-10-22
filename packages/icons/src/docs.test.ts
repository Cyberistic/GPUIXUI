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
import * as R from "effect/Record";
import * as Tokens from "@gpuixui/tokens";
import { ICON_NAMES } from "./names.js";
import { ICON_SIZES } from "./sizes.js";

const page = readFileSync(new URL("../docs/icon.mdx", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const iconSource = readFileSync(new URL("./Icon.tsx", import.meta.url), "utf8");

/** A frontmatter field's value, or nothing when the field is absent. */
const frontmatter = (field: string): Option.Option<string> =>
  Option.fromNullishOr(new RegExp(`^${field}: (.+)$`, "m").exec(page)?.[1]);

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
});

describe("the icons README", () => {
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
