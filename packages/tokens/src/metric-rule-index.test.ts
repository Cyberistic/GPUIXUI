/**
 * Guards the drift plan 372 fixes: the `MetricRule` row in `docs/tokens.md`
 * named `ladder`, `fit` and `fraction` — none of which the contract emits —
 * while the nine rules it does report had no ordered index, so a rule could join
 * the union without a line in the reference and nothing noticed.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * files, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metricRules, type MetricRule } from "./metrics.js";

const markdown = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const row = markdown
  .split("\n")
  .find((line) => line.startsWith("| `MetricRule` |"));

const containsWord = (text: string, word: string): boolean =>
  new RegExp(`(^|[^A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(text);

describe("metric rule index", () => {
  it("lists the nine rules in documentation order", () => {
    expect(metricRules).toEqual([
      "positive",
      "non-negative",
      "zero",
      "finite",
      "increasing",
      "non-decreasing",
      "at-least",
      "at-most",
      "within",
    ]);
    expect(new Set<string>(metricRules).size).toBe(metricRules.length);
  });

  it("names every indexed rule in the type reference", () => {
    expect(row).toBeDefined();
    metricRules.forEach((rule: MetricRule) => {
      expect(containsWord(row ?? "", rule), rule).toBe(true);
    });
  });

  it("does not name the retired approximations", () => {
    ["ladder", "fit", "fraction"].forEach((word) => {
      expect(containsWord(row ?? "", word), word).toBe(false);
    });
  });
});
