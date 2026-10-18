/**
 * Guards the defect plan 350 fixes: `primary-text.example.ts` shipped in plan
 * 082 with no test importing it and no document linking it, so the snippet
 * could drift from the API it demonstrates while every gate stayed green. An
 * `*.example.ts` file is a runnable, copyable example by this package's own
 * convention, so a suite must import it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// `node:fs` is deliberate: this is a policy test over the package's own source,
// and the tokens package ships zero runtime dependencies by design.
const src = new URL(".", import.meta.url);
const exampleFiles = readdirSync(src).filter((file) =>
  file.endsWith(".example.ts"),
);
const testFiles = readdirSync(src).filter(
  (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"),
);
const testSource = testFiles
  .map((file) => readFileSync(new URL(file, src), "utf8"))
  .join("\n");

describe("runnable examples", () => {
  it("has examples to check", () => {
    expect(exampleFiles.length).toBeGreaterThanOrEqual(15);
  });

  it("imports every example from a test, so the snippet runs", () => {
    exampleFiles.forEach((file) => {
      const specifier = `./${file.replace(/\.ts$/, ".js")}`;
      expect(testSource, file).toContain(specifier);
    });
  });
});
