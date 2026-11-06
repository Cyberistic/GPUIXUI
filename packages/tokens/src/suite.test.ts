import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  new URL("../vitest.config.ts", import.meta.url),
  "utf8",
);

const budget = (name: string): number | undefined => {
  const match = new RegExp(`${name}:\\s*(\\d+)`).exec(config);
  return match?.[1] === undefined ? undefined : Number(match[1]);
};

describe("suite time budget", () => {
  it("fails a waiting test in two seconds rather than the default five", () => {
    expect(budget("testTimeout")).toBe(2000);
  });

  it("fails a stuck hook on the same budget", () => {
    expect(budget("hookTimeout")).toBe(2000);
  });

  it("still runs the whole suite, tests and the React entry", () => {
    expect(config).toContain('"src/**/*.test.ts"');
    expect(config).toContain('"src/**/*.test.tsx"');
    expect(config).toContain('environment: "node"');
  });
});
