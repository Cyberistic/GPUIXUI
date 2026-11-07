import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

describe("the package's source claims", () => {
  it("names the frozen composition that ships instead of a phase still to come", () => {
    expect(index).toContain("FrozenTable");
    expect(index).not.toContain("plan 610 for the remaining phases");
  });

  it("lists every subtree the root actually exports from", () => {
    expect(index).toContain('from "./tree/');
    expect(index).toContain('from "./chart/');
    expect(index).toContain('from "./surfaces/');
  });
});
