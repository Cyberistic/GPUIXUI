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

const printedTotals = (): ReadonlyArray<string> =>
  Arr.fromIterable(
    readme.matchAll(/(\d+)\/(\d+) (?:green|scenarios passed)/g),
  ).map((match) => `${match[1]}/${match[2]}`);

const reportedCapabilities = (): ReadonlyArray<string> => {
  const [, list = ""] =
    /scenarios passed · capabilities:([\s\S]*?)```/.exec(readme) ?? [];
  return Arr.fromIterable(list.matchAll(/([a-z-]+)=verified/g)).map(
    (match) => match[1] ?? "",
  );
};

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
