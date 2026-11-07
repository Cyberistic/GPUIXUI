import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  new URL("../tsconfig.json", import.meta.url),
  "utf8",
);

describe("the package's tsconfig", () => {
  it("does not map the JSX runtime to a type declaration", () => {
    expect(config).not.toContain("jsx-runtime");
  });

  it("compiles JSX for the GPUix reconciler", () => {
    expect(config).toContain('"jsxImportSource": "@gpuix/react"');
  });
});
