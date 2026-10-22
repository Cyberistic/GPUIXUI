/**
 * Guards the totals the README prints against the registry.
 *
 * The README is what a release report and the docs site cite: the "<n>/<n>
 * green" headline and the capability list are the two things a reader uses to
 * tell a complete run from a partial one. Both are derived from `registry.ts`
 * but written by hand, so a scenario added without touching them leaves the
 * document claiming the previous total and nothing fails — which is how the
 * headline stayed at the previous count after the example gallery landed.
 *
 * `node:fs` is deliberate, as in `live/registry.test.ts`: this reads the
 * repository's own Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { Smoke } from "@gpuixui/testing";
import { registry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const total = registry.length;

/** `32/32 green` and `32/32 scenarios passed`, wherever the README prints one. */
const printedTotals = (): ReadonlyArray<string> =>
  Arr.fromIterable(
    readme.matchAll(/(\d+)\/(\d+) (?:green|scenarios passed)/g),
  ).map((match) => `${match[1]}/${match[2]}`);

/** The run block's capability list: the tokens after `capabilities:`. */
const reportedCapabilities = (): ReadonlyArray<string> => {
  const [, list = ""] =
    /scenarios passed · capabilities:([\s\S]*?)```/.exec(readme) ?? [];
  return Arr.fromIterable(list.matchAll(/([a-z-]+)=verified/g)).map(
    (match) => match[1] ?? "",
  );
};

/** What the runner prints: every capability some scenario covers, in order. */
const covered: ReadonlyArray<string> = Arr.filter(
  Smoke.CAPABILITIES,
  (capability) =>
    Arr.some(registry, (scenario) => scenario.capability === capability),
);

describe("the README's printed totals", () => {
  it("prints the scenario total the registry actually runs", () => {
    const printed = printedTotals();
    expect(printed.length).toBeGreaterThan(0);
    expect(Arr.dedupe(printed)).toEqual([`${total}/${total}`]);
  });

  it("reports exactly the capabilities the scenarios cover", () => {
    expect(reportedCapabilities()).toEqual(covered);
  });
});
