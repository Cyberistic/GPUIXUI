/**
 * The package's compiler contract.
 *
 * This suite exists for one measured failure (2026-10-21, plan 714): the
 * TypeScript config mapped the automatic JSX runtime to
 * `./node_modules/@gpuix/react/jsx-runtime.d.ts`. That mapping is invisible to
 * `tsc --noEmit`, which passed, but the runner's loader also resolves
 * workspace source through it — so importing `@gpuixui/components` from
 * `apps/playground` died with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
 * before a single component mounted. Removing the mapping fixes the import
 * (194 exports load and `Tabs` is a function). `@gpuixui/tokens` pins React with
 * its own JSX pragma, which is why the mapping is no longer needed.
 *
 * `jsxImportSource` itself must stay `@gpuix/react`: the components render GPUix
 * host elements, not DOM React. A move to `react` would type-check a component
 * tree the runtime cannot paint.
 *
 * `node:fs` is a test-time repository check, the same standing exception
 * `inventory.test.ts` records (plan 117 §3): no runtime module imports it.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  new URL("../tsconfig.json", import.meta.url),
  "utf8",
);

describe("the package's tsconfig", () => {
  it("does not map the JSX runtime to a type declaration", () => {
    // A `paths` entry for the runtime makes the loader resolve a `.d.ts` at
    // runtime; the automatic runtime must resolve through the package exports.
    expect(config).not.toContain("jsx-runtime");
  });

  it("compiles JSX for the GPUix reconciler", () => {
    expect(config).toContain('"jsxImportSource": "@gpuix/react"');
  });
});
