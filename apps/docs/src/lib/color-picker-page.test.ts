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

/** The name the component publishes for a label that says nothing. */
const fallback =
  /const DEFAULT_COLOR_PICKER_LABEL = "([^"]+)";/.exec(source)?.[1] ?? "";

/** The row that documents the label, and the name it falls back to. */
const labelRow = page.split("\n").find((line) => line.startsWith("| `label`"));

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

  it("names the fallback a blank label publishes", () => {
    // Bug guarded: a label is copy from an i18n table as often as a literal,
    // and the component named a blank one `Color picker` while the served page
    // still promised the caller's text — an unnamed group beside `" hex value"`
    // is the defect the component fixed and the page did not teach.
    expect(fallback).not.toBe("");
    expect(source).toContain(
      "accessibleName(label) ?? DEFAULT_COLOR_PICKER_LABEL",
    );
    expect(labelRow).toBeDefined();
    expect(labelRow ?? "").toContain(fallback);
    expect(labelRow ?? "").toContain("blank");
  });
});
