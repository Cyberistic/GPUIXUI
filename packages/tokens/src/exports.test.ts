/**
 * Guards the defect fixed in plan 016: `@gpuixui/tokens` exported `./dist/*`,
 * but `dist/` is gitignored, so a consumer in a clean checkout could not resolve
 * the package and every workspace that depends on it had to build it first — the
 * `primitives` package worked around it with a structural copy of the theme.
 * A workspace package must export source.
 *
 * `node:fs` is used deliberately: this is a packaging test over the tree's own
 * manifest, and the tokens package has no `effect` dependency to borrow
 * `FileSystem` from (it ships zero runtime dependencies by design).
 */

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

interface ExportTarget {
  readonly subpath: string;
  readonly target: string;
}

const packageUrl = new URL("..", import.meta.url);

const exportTargets: ReadonlyArray<ExportTarget> = Object.entries(
  packageJson.exports,
).flatMap(([subpath, entry]) =>
  typeof entry === "string"
    ? { subpath, target: entry }
    : Object.entries(entry).map(([, target]) => ({ subpath, target })),
);

describe("package exports", () => {
  it("exposes the core and react entries", () => {
    const subpaths = exportTargets.map((entry) => entry.subpath);
    expect(subpaths).toContain(".");
    expect(subpaths).toContain("./react");
  });

  it("points every entry at a file in the repository, not a build artifact", () => {
    expect(exportTargets.length).toBeGreaterThan(2);
    exportTargets.forEach(({ subpath, target }) => {
      // A gitignored build directory is absent from a clean checkout.
      expect(target, subpath).not.toMatch(/^\.\/(dist|build)\//);
      expect(
        existsSync(new URL(target, packageUrl)),
        `${subpath} → ${target}`,
      ).toBe(true);
    });
  });
});
