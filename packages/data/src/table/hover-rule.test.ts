import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const readme = read("../../README.md");
const inventory = read("../../../../.agents/slop/COMPONENTS.md");
const capabilityRecord = read("../../../../docs/gpuix-capabilities.md");

const row = (name: string): string => {
  const rows = Arr.filter(Arr.fromIterable(inventory.split("\n")), (line) =>
    line.startsWith(`| ${name} |`),
  );
  expect(rows.length).toBe(1);
  return rows[0] ?? "";
};

describe("the painted-child hover rule", () => {
  it("stays in the README rule table", () => {
    expect(readme).toContain("hover-routing-lifecycle");
    expect(readme).toContain('pointerEvents: "none"');
    expect(readme).toContain("same hit test");
  });

  it("stays in the Tables, Row selection and Tree views rows", () => {
    Arr.forEach(["Tables", "Row selection", "Tree views"], (name) => {
      expect(row(name)).toContain("hover-routing-lifecycle");
    });

    const measured = Option.getOrUndefined(
      Arr.findFirst(Arr.fromIterable(capabilityRecord.split("\n")), (line) =>
        line.startsWith("| Composite-row hover routing |"),
      ),
    );
    expect(measured).toBeDefined();
    expect(measured ?? "").toContain("hover-routing-lifecycle");
    expect(measured ?? "").toContain("supported, with limits");
  });
});
