import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  derivedDependencies,
  importSpecifiers,
  resolveLocalModule,
  runtimeModules,
} from "../lib/source-imports";
import { bySlug, components } from "./registry";

/**
 * Guards the `Dependencies` section (plan 428). The load-bearing failure is a
 * page whose dependency list disagrees with the component's real entry file: an
 * import that changed, a wrapper subpath that was removed, or a hand-typed
 * dependency the code never imports. None of those break the MDX build.
 */

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const sourced = components.flatMap((record) =>
  record.status === "planned" || record.sourcePath === null
    ? []
    : [{ record, sourcePath: record.sourcePath }],
);

const slugBySourcePath = new Map(
  sourced.map(({ record, sourcePath }) => [sourcePath, record.slug]),
);

describe("component dependencies", () => {
  it("derives every delivered record's list from its entry file", () => {
    const drifted = sourced.flatMap(({ record, sourcePath }) => {
      const expected = derivedDependencies(
        sourcePath,
        repoRoot,
        slugBySourcePath,
      );
      const matches =
        expected.length === record.dependencies.length &&
        expected.every(
          (dependency, index) => dependency === record.dependencies[index],
        );
      return matches
        ? []
        : [
            `${record.slug}: expected ${expected.join(", ") || "(none)"}, found ${record.dependencies.join(", ") || "(none)"}`,
          ];
    });
    expect(drifted).toEqual([]);
  });

  it("links only components that have a page", () => {
    const dead = sourced.flatMap(({ record }) =>
      record.dependencies.flatMap((dependency) => {
        const target = bySlug.get(dependency);
        return target === undefined || target.status !== "planned"
          ? []
          : [`${record.slug} composes planned component ${dependency}`];
      }),
    );
    expect(dead).toEqual([]);
  });
});

describe("source import derivation", () => {
  it("reads multi-line, side-effect and re-export specifiers, and ignores comments", () => {
    const source = [
      '// import { hidden } from "comment-only";',
      "import {",
      "  one,",
      "  two,",
      '} from "@scope/widget";',
      'import "side-effect";',
      'export { three } from "./child.js";',
      "const label = 'from \"string-only\"';",
    ].join("\n");

    expect(importSpecifiers(source)).toEqual([
      "@scope/widget",
      "side-effect",
      "./child.js",
    ]);
  });

  it("leaves the peer packages out of a component's module list", () => {
    expect(
      runtimeModules([
        "react",
        "react/jsx-runtime",
        "@gpuix/react",
        "@gpuix/react/floating",
        "effect/Array",
        "./local.js",
      ]),
    ).toEqual(["@gpuix/react/floating", "effect/Array"]);
  });

  it("resolves a composed component but not a private helper", () => {
    const composed = resolveLocalModule(
      "packages/components/src/command-menu.tsx",
      "./dialog.js",
      repoRoot,
    );
    const helper = resolveLocalModule(
      "packages/components/src/command-menu.tsx",
      "./internal/key.js",
      repoRoot,
    );

    expect(composed).toBe(join("packages/components/src", "dialog.tsx"));
    expect(composed !== null && slugBySourcePath.has(composed)).toBe(true);
    expect(helper).toBe(join("packages/components/src/internal", "key.ts"));
    expect(helper !== null && slugBySourcePath.has(helper)).toBe(false);
  });
});
