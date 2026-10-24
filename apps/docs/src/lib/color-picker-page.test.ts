import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The locators the colour picker's `testId` derives, held to its source.
 *
 * Bug guarded: the page's `testId` row answered "the stable locators above"
 * while no list existed anywhere on the page — the same dangling reference the
 * badge and card variant tables carried — so an automation host reading the
 * prop could not learn a single locator to target. The row now prints the four
 * suffixes the component builds, and this guard derives them from
 * `color-picker.tsx` so a renamed locator moves the page.
 */

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const source = read("packages/components/src/color-picker.tsx");
const page = read("apps/docs/content/docs/components/color-picker.mdx");

/** The suffix after `${testId}` in every template the component builds. */
const suffixes = [
  ...new Set(
    [...source.matchAll(/`\$\{testId\}([^`]+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  ),
];

/** The row that documents the prop. */
const row = page.split("\n").find((line) => line.startsWith("| `testId`"));

describe("the colour picker's testId row", () => {
  it("names every suffix the component derives", () => {
    // A scan that stopped matching, or a component that stopped deriving any,
    // cannot pass on an empty list.
    expect(suffixes.length).toBeGreaterThanOrEqual(4);
    expect(row).toBeDefined();
    const printed = row ?? "";

    const missing = suffixes.filter(
      (suffix) => !printed.includes(suffix.replace("${index}", "<index>")),
    );

    expect(missing).toEqual([]);
  });

  it("does not point at a list the page does not print", () => {
    // The retracted sentence is the bug: it named a list that was not there.
    expect(row).not.toContain("above");
    expect(row).toContain("root's locator");
  });
});
