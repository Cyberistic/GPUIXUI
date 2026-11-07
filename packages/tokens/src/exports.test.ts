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
      expect(target, subpath).not.toMatch(/^\.\/(dist|build)\//);
      expect(
        existsSync(new URL(target, packageUrl)),
        `${subpath} → ${target}`,
      ).toBe(true);
    });
  });
});
