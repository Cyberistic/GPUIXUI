/**
 * Guards the example gallery's header against a drifting count.
 *
 * The header said "39 screens" while the registry had grown to 46 and nothing
 * read it: the scenario pages whatever `examples` holds, so only the prose fell
 * behind. The header must not print a count at all, and the readout must ask the
 * registry — a number written down in either place is the bug.
 *
 * Bug guarded: a registry that grows leaves a one-number claim false.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./examples.tsx", import.meta.url), "utf8");

describe("the example gallery's header", () => {
  it("does not pin the registry size in prose", () => {
    expect(source).not.toMatch(/\b\d+\s+(?:screens|examples)\b/i);
  });

  it("reports the size from the registry", () => {
    expect(source).toContain("of=${Arr.length(exampleIds)}");
  });
});
