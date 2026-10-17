import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the docs-site boundary law (MISSION "Boundaries", plan 410 §2, plan
 * 411 §5). `apps/docs` is a browser app: it must never import the native
 * runtime, and the Effect runtime must not reach the client bundle. The
 * interesting failure is a convenient import that quietly drags
 * `@gpuix/react` or `effect` into the site — the site still builds and renders,
 * so nothing else notices, and the boundary is gone.
 */
const srcDir = fileURLToPath(new URL(".", import.meta.url));

const walk = (dir: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(join(srcDir, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    return entry.isDirectory()
      ? walk(path, path)
      : /\.tsx?$/.test(entry.name)
        ? [path]
        : [];
  });

interface Import {
  readonly file: string;
  readonly specifier: string;
  readonly typeOnly: boolean;
}

const fileImports = (file: string): ReadonlyArray<Import> => {
  const source = readFileSync(join(srcDir, file), "utf8");
  return [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => {
    // Walk back to the nearest line-starting `import` so `import type` is
    // distinguishable from a value import of the same module.
    const statementStart = source.lastIndexOf("\nimport", match.index) + 1;
    const statement = source.slice(statementStart, match.index).trimStart();
    return {
      file,
      specifier: match[1] ?? "",
      typeOnly: /^import\s+type\b/.test(statement),
    };
  });
};

const imports = walk(".").flatMap(fileImports);

const describeImport = (entry: Import): string =>
  `${entry.file} -> ${entry.specifier}`;

describe("docs-site boundaries", () => {
  it("imports no GPUix runtime package", () => {
    const offenders = imports
      .filter((entry) => /^@gpuix(\/|ui\/)/.test(entry.specifier))
      .map(describeImport);
    expect(offenders).toEqual([]);
  });

  // `component-meta/schema.ts` is the test-only Effect contract; every other
  // module reaches it through `import type`, which the bundler erases.
  const effectModule = "component-meta/schema.ts";
  const isTestFile = (file: string): boolean => /\.test\.tsx?$/.test(file);

  it("keeps the Effect runtime out of every non-test module", () => {
    const offenders = imports
      .filter(
        (entry) =>
          entry.specifier === "effect" || entry.specifier.startsWith("effect/"),
      )
      .filter((entry) => !isTestFile(entry.file) && entry.file !== effectModule)
      .map(describeImport);
    expect(offenders).toEqual([]);
  });

  it("reaches the Effect schema only through type-only imports", () => {
    const offenders = imports
      .filter((entry) => !isTestFile(entry.file))
      .filter((entry) => entry.specifier.endsWith("/schema"))
      .filter((entry) => !entry.typeOnly)
      .map(describeImport);
    expect(offenders).toEqual([]);
  });
});
