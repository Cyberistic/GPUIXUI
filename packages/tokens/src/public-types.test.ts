/**
 * Guards the defect fixed in plan 324: `docs/tokens.md` promises that a token
 * missing from the page is not public, but its coverage guard walks the runtime
 * namespace, so it could only see values. Types do not exist at runtime, and 24
 * of the package's 44 public types — the extension mechanism's `ThemeOverrides`
 * and `ThemeConfig`, the contrast contract's `ContrastPair` and `ContrastFailure`,
 * and plan 311's `PlatformRecipeName` among them — were absent while every suite
 * stayed green.
 *
 * The walk follows the two entry modules and their `export *` / named
 * re-exports, because a type has no runtime key to enumerate. `node:fs` is
 * deliberate: this is a documentation test over the tree's own sources, the
 * package ships zero runtime dependencies by design, and a synchronous read is
 * deterministic and outside any event loop.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const declarations = /^export (?:interface|type|class|enum) (\w+)/gm;
const starExports = /^export \* from "([^"]+)";/gm;
const namedReExports = /^export (?:type )?\{[^}]+\} from "([^"]+)";/gm;

const moduleUrl = (specifier: string, from: URL): URL =>
  new URL(specifier.replace(/\.js$/, ".ts"), from);

const exportedTypes = (entry: URL): ReadonlySet<string> => {
  const visited = new Set<string>();
  const names = new Set<string>();
  const visit = (url: URL): void => {
    if (visited.has(url.href)) {
      return;
    }
    visited.add(url.href);
    const source = readFileSync(url, "utf8");
    [...source.matchAll(declarations)].forEach((match) => {
      const name = match[1];
      if (name !== undefined) {
        names.add(name);
      }
    });
    [starExports, namedReExports].forEach((pattern) => {
      [...source.matchAll(pattern)].forEach((match) => {
        const specifier = match[1];
        if (specifier !== undefined) {
          visit(moduleUrl(specifier, url));
        }
      });
    });
  };
  visit(entry);
  return names;
};

const publicTypes = new Set([
  ...exportedTypes(new URL("./index.ts", import.meta.url)),
  ...exportedTypes(new URL("./react.ts", import.meta.url)),
]);

const reference = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

/** The names in the `## Types` table, in document order. */
const typeIndex = (markdown: string): ReadonlyArray<string> => {
  const start = markdown.indexOf("\n## Types\n");
  if (start === -1) {
    return [];
  }
  const end = markdown.indexOf("\n## ", start + 1);
  const section = markdown.slice(start, end === -1 ? undefined : end);
  return [...section.matchAll(/^\| `([A-Za-z]+)` \|/gm)].flatMap((match) => {
    const name = match[1];
    return name === undefined ? [] : [name];
  });
};

describe("docs/tokens.md type index", () => {
  it("finds the public types in the entry modules", () => {
    [
      "Theme",
      "ThemeOverrides",
      "ThemeConfig",
      "PlatformRecipeName",
      "ThemeProviderProps",
    ].forEach((name) => {
      expect(publicTypes.has(name), name).toBe(true);
    });
    expect(publicTypes.size).toBeGreaterThan(40);
  });

  it("names every public type once and no retired one", () => {
    const rows = typeIndex(reference);
    expect(rows.length).toBe(new Set(rows).size);
    expect(rows.toSorted()).toEqual([...publicTypes].toSorted());
  });
});
