/**
 * Guards the defect fixed in plan 061: `src/react.tsx` was the package's only
 * JSX, and TypeScript compiles JSX against the *consumer's* `jsxImportSource`.
 * A GPUix app points that at `@gpuix/react/jsx-runtime`, which `tokens` does not
 * depend on, so type-checking the imported package failed with TS2875 and the
 * playground carried a `paths` shim. The React entry now uses `createElement`,
 * so the package compiles under any consumer jsx runtime.
 *
 * This test runs the real compiler with the GPUix consumer config and no shim.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "lib/tsc.js",
);

describe("consumer type check", () => {
  it("compiles under the GPUix jsxImportSource without a paths shim", () => {
    const result = spawnSync(
      process.execPath,
      [tsc, "-p", "tsconfig.consumer.json"],
      { cwd: packageRoot, encoding: "utf8" },
    );
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });
});
