/**
 * Holds the one law this package cannot break: it runs where no GPUix binding
 * exists.
 *
 * `@gpuixui/testing` is the half of the native smoke suite a host without a
 * binding can still execute — the check model, the report, the offscreen port.
 * `apps/playground` supplies the real renderer. Nothing held that separation:
 * one `import … from "@gpuix/react"` in `native.ts` would keep the workspace
 * type-checking and pass every suite on a machine where the binding is
 * installed, while the package's own tests started failing on the host B1 was
 * fought for. The source scan and the manifest's dependency list are the same
 * rule seen twice, so an import and a declaration cannot disagree.
 *
 * `node:fs` is deliberate, as in `packages/primitives/src/docs.test.ts`'s guards:
 * this is a plain vitest case that reads the repository's own sources and
 * manifest, with no Effect runtime or `FileSystem` layer provided, and the
 * synchronous walk is the point — a guard that needed a platform layer would
 * stop being the check that any host can run.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

/** Every TypeScript file in `src/`, tests included — the law is the package's. */
const sources = (relative = "src/"): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sources(`${path}/`);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    },
  );
};

const files = sources();

/** The file's code, with comments removed so prose cannot trip the scan. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** The module a specifier names, from any `import … from "…"` / `import "…"`. */
const specifiers = (source: string): ReadonlyArray<string> => {
  const text = code(source);
  return Arr.flatMap(
    [
      ...text.matchAll(/from\s+"([^"]+)"/g),
      ...text.matchAll(/^\s*import\s+"([^"]+)"/gm),
    ],
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );
};

const namesRuntime = (specifier: string): boolean =>
  Str.startsWith("@gpuix/")(specifier);

/** The manifest's runtime dependencies, as `name@range` pairs. */
const runtimeDependencies = (manifest: string): ReadonlyArray<string> => {
  const text = manifest.replace(/\s+/g, "");
  const block = /"dependencies":\{([^}]*)\}/.exec(text)?.[1] ?? "";
  return Arr.filter(
    Arr.map(
      [...block.matchAll(/"([^"]+)":"([^"]+)"/g)],
      (match) => `${match[1] ?? ""}@${match[2] ?? ""}`,
    ),
    Str.isNonEmpty,
  );
};

describe("the platform-free half of the smoke suite", () => {
  it("imports nothing from the GPUix runtime, in any source or suite", () => {
    // A floor, so a walk that stopped finding files cannot pass vacuously.
    expect(files.length).toBeGreaterThan(10);
    const offenders = Arr.flatMap(files, (path) =>
      Arr.filter(specifiers(read(path)), namesRuntime).map(
        (specifier) => `${path}: ${specifier}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("declares only Effect as a runtime dependency", () => {
    const declared = runtimeDependencies(read("package.json"));
    expect(declared.length).toBeGreaterThan(0);
    const foreign = Arr.filter(
      declared,
      (entry) =>
        !Str.startsWith("effect@")(entry) && !Str.startsWith("@effect/")(entry),
    );
    expect(foreign).toEqual([]);
  });

  it("keeps the README's promise beside the guard that holds it", () => {
    const readme = read("README.md").replace(/\s+/g, " ");
    expect(readme).toContain(
      "It never imports `@gpuix/react` or `@gpuix/native`",
    );
    expect(readme).toContain(
      "its tests run on any host — including a host where no GPUix binding exists",
    );
    expect(readme).toContain("It has no GPUix dependency");
  });
});
