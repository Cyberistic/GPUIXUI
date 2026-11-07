import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const source = read("packages/components/src/color-picker.tsx");
const logic = read("packages/components/src/color-picker/logic.ts");
const page = read("apps/docs/content/docs/components/color-picker.mdx");

const suffixes = [
  ...new Set(
    [...source.matchAll(/`\$\{testId\}([^`]+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  ),
];

const row = page.split("\n").find((line) => line.startsWith("| `testId`"));

const fallback =
  /const DEFAULT_COLOR_PICKER_LABEL = "([^"]+)";/.exec(logic)?.[1] ?? "";

const labelRow = page.split("\n").find((line) => line.startsWith("| `label`"));

describe("the colour picker's testId row", () => {
  it("names every suffix the component derives", () => {
    expect(suffixes.length).toBeGreaterThanOrEqual(4);
    expect(row).toBeDefined();
    const printed = row ?? "";

    const missing = suffixes.filter(
      (suffix) => !printed.includes(suffix.replace("${index}", "<index>")),
    );

    expect(missing).toEqual([]);
  });

  it("does not point at a list the page does not print", () => {
    expect(row).not.toContain("above");
    expect(row).toContain("root's locator");
  });

  it("names the fallback a blank label publishes", () => {
    expect(fallback).not.toBe("");
    expect(source).toContain(
      "accessibleName(textOf(label)) ?? DEFAULT_COLOR_PICKER_LABEL",
    );
    expect(labelRow).toBeDefined();
    expect(labelRow ?? "").toContain(fallback);
    expect(labelRow ?? "").toContain("blank");
  });
});
