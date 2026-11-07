import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

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

const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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
