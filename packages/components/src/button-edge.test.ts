import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const recipe = (): string => read("../../primitives/src/recipe/index.ts");

const adapter = (): string => read("./internal/button.tsx");

const SECONDARY_RECIPE =
  "bg-secondary text-secondary-foreground border border-strong";

const SECONDARY_EDGE =
  /secondary: \{ variant: "secondary", className: "border border-strong" \}/;

describe("the tonal action's edge", () => {
  it("is painted by the primitive's recipe", () => {
    expect(recipe()).toContain(SECONDARY_RECIPE);
  });

  it("is carried by the components adapter in the same role", () => {
    expect(adapter()).toMatch(SECONDARY_EDGE);
  });
});
