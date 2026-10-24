import { existsSync, readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { parseManifest } from "./public-api";

/**
 * The seam that reads the shell package's reducers.
 *
 * The shell drawings need the rules behind the chrome, and `@gpuixui/shell`
 * publishes its components — GPUix JSX the docs app cannot compile — rather
 * than the logic modules behind them. So `src/lib/shell-logic.ts` reads the
 * three logic modules the package ships.
 *
 * That is a **temporary** state, and this case is what ends it: the day the
 * package publishes a `./logic` subpath, the seam has to go and the drawings
 * import the package. Until then the seam must read the package's own files,
 * so a reducer that moves moves the drawing with it.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The logic modules the seam reads, and the names it re-exports from each. */
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

/** The subpaths a package manifest publishes, read by the site's own reader. */
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
      // Every name the seam re-exports is declared by that module, so a rule
      // that moves cannot leave the drawing importing a name that is gone.
      const source = read(module.file);
      Arr.forEach(module.names, (name) => {
        expect(source).toContain(`export const ${name}`);
        expect(seam).toContain(name);
      });
    });
  });

  it("exists only while the package publishes no logic subpath", () => {
    const subpaths = publishedSubpaths("packages/shell/package.json");

    // Today the package publishes its components and its examples only.
    expect(subpaths).not.toContain("./logic");
    expect(subpaths).toContain(".");
    // The moment it publishes one, this case fails and says what to do.
    expect(
      subpaths.includes("./logic"),
      "the shell package publishes a ./logic subpath now: delete " +
        "apps/docs/src/lib/shell-logic.ts and import @gpuixui/shell/logic",
    ).toBe(false);
  });
});
