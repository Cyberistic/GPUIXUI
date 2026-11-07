import { existsSync, readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { parseManifest } from "./public-api";

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const modules = [
  {
    file: "packages/shell/src/toolbar/logic.ts",
    names: ["initialRoving", "moveRoving", "splitOverflow"],
  },
  {
    file: "packages/shell/src/app-menu/logic.ts",
    names: ["dismiss", "hoverOpen", "initial", "step"],
  },
  {
    file: "packages/shell/src/status-bar/logic.ts",
    names: ["statusToneOf", "toneForeground"],
  },
] as const;

const publishedSubpaths = (path: string): ReadonlyArray<string> => {
  const parsed: unknown = JSON.parse(read(path));
  const manifest = parseManifest(parsed);
  return manifest === undefined ? [] : Object.keys(manifest.exports);
};

describe("the shell logic seam", () => {
  it("reads the package's own logic modules", () => {
    const seam = read("apps/docs/src/lib/shell-logic.ts");

    Arr.forEach(modules, (module) => {
      expect(existsSync(new URL(module.file, root))).toBe(true);
      expect(seam).toContain(
        module.file.replace("packages/shell/src/", "").replace(/\.ts$/, ".js"),
      );

      const source = read(module.file);
      Arr.forEach(module.names, (name) => {
        expect(source).toContain(`export const ${name}`);
        expect(seam).toContain(name);
      });
    });
  });

  it("exists only while the package publishes no logic subpath", () => {
    const subpaths = publishedSubpaths("packages/shell/package.json");

    expect(subpaths).not.toContain("./logic");
    expect(subpaths).toContain(".");

    expect(
      subpaths.includes("./logic"),
      "the shell package publishes a ./logic subpath now: delete " +
        "apps/docs/src/lib/shell-logic.ts and import @gpuixui/shell/logic",
    ).toBe(false);
  });
});
