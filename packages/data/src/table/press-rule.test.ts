import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";

const inventory = readFileSync(
  new URL("../../../../.agents/slop/COMPONENTS.md", import.meta.url),
  "utf8",
);

const row = (name: string): string => {
  const rows = Arr.filter(Arr.fromIterable(inventory.split("\n")), (line) =>
    line.startsWith(`| ${name} |`),
  );
  expect(rows.length).toBe(1);
  return rows[0] ?? "";
};

describe("the painted-child press rule", () => {
  it("stays in the Tables and Row selection rows", () => {
    const tables = row("Tables");
    const selection = row("Row selection");

    expect(tables).toContain("press-routing-lifecycle");
    expect(tables).toContain('pointerEvents: "none"');
    expect(selection).toContain("press-routing-lifecycle");
  });
});
