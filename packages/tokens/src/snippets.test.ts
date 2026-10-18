/**
 * Guards the defect fixed in plan 355: the fenced TypeScript snippets in
 * `docs/tokens.md` and the package README are what a reader copies, and nothing
 * held them to the package. The platform-recipe snippet rendered
 * `<ThemeProvider>` without importing it while every gate stayed green.
 *
 * This is not a compiler: a snippet is a contextual fragment, so `theme`,
 * `children` and `contosoStyle` have no module scope. It checks the four facts a
 * fragment can still get wrong about this package — that its imports exist,
 * that the colour roles and scale members it names exist, and that a public
 * function, component or type it uses is imported by the same block.
 *
 * `node:fs` is deliberate, as in `public-types.test.ts` and `examples.test.ts`:
 * this is a synchronous policy check over the tree's own documents, not runtime
 * I/O, and the package ships zero runtime dependencies by design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as tokens from "./index.js";
import * as react from "./react.js";

const documents = [
  {
    label: "docs/tokens.md",
    url: new URL("../../../docs/tokens.md", import.meta.url),
  },
  {
    label: "packages/tokens/README.md",
    url: new URL("../README.md", import.meta.url),
  },
] as const;

interface Snippet {
  readonly label: string;
  readonly index: number;
  readonly code: string;
}

const snippetsOf = (document: (typeof documents)[number]): Snippet[] =>
  [
    ...readFileSync(document.url, "utf8").matchAll(
      /```(ts|tsx)\n([\s\S]*?)```/g,
    ),
  ].map((match, index) => ({
    label: document.label,
    index,
    code: match[2] ?? "",
  }));

const snippets = documents.flatMap(snippetsOf);

const importPattern =
  /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(@gpuixui\/tokens(?:\/react)?)"/g;

const namedImports = (clause: string): string[] =>
  clause.split(",").flatMap((raw) => {
    const name = raw
      .trim()
      .replace(/^type\s+/, "")
      .split(/\s+as\s+/)
      .pop()
      ?.trim();
    return name === undefined || name === "" ? [] : [name];
  });

const importedOf = (code: string): ReadonlySet<string> =>
  new Set(
    [...code.matchAll(importPattern)].flatMap((match) =>
      namedImports(match[1] ?? ""),
    ),
  );

// The type walk of `public-types.test.ts`: types have no runtime key, so follow
// the entry modules' re-exports.
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

const indexTypes = exportedTypes(new URL("./index.ts", import.meta.url));
const reactTypes = exportedTypes(new URL("./react.ts", import.meta.url));
const publicTypes = new Set([...indexTypes, ...reactTypes]);

const publicFunctions = new Set(
  Object.entries({ ...tokens, ...react }).flatMap(([name, value]) =>
    typeof value === "function" ? [name] : [],
  ),
);

const scaleGroups: Readonly<Record<string, object>> = {
  spacing: tokens.spacing,
  radius: tokens.radius,
  density: tokens.defaultDensity,
  motion: tokens.motion,
  elevation: tokens.lightElevation,
  borderWidth: tokens.borderWidth,
  iconSize: tokens.iconSize,
  avatarSize: tokens.avatarSize,
  dimensions: tokens.dimensions,
  typography: tokens.typography,
};

const scaleNames = new Set(Object.keys(scaleGroups));

/**
 * The public values a snippet must import when it names them: every function,
 * and every data export except the scale groups, whose names (`radius`,
 * `spacing`, `motion`) are also ordinary object keys and JSX prop names.
 */
const checkedValues = new Set([
  ...publicFunctions,
  ...Object.keys({ ...tokens, ...react }).filter(
    (name) => !publicFunctions.has(name) && !scaleNames.has(name),
  ),
]);

/** A snippet's code without comments or imports: only its usage remains. */
const usageOf = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/^import[\s\S]*?;$/gm, "");

const declares = (code: string, name: string): boolean =>
  new RegExp(`(?:const|let|var|function|class)\\s+${name}\\b`).test(code);

const usesWithoutImport = (code: string, name: string): boolean => {
  const body = usageOf(code);
  if (declares(code, name)) {
    return false;
  }
  if (new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(body)) {
    return true;
  }
  if (new RegExp(`<${name}(?![\\w$.])`).test(body)) {
    return true;
  }
  return (
    (publicTypes.has(name) ||
      (!publicFunctions.has(name) && checkedValues.has(name))) &&
    new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(body)
  );
};

describe("documented snippets", () => {
  it("has snippets to check", () => {
    expect(snippets.length).toBeGreaterThan(40);
  });

  it("imports only names the package exports", () => {
    snippets.forEach(({ label, index, code }) => {
      [...code.matchAll(importPattern)].forEach((match) => {
        const source = match[2];
        const isReact = source === "@gpuixui/tokens/react";
        const namespace = isReact ? react : tokens;
        const types = isReact ? reactTypes : indexTypes;
        namedImports(match[1] ?? "").forEach((name) => {
          expect(
            name in namespace || types.has(name),
            `${label} #${index}: ${name} from ${source}`,
          ).toBe(true);
        });
      });
    });
  });

  it("names only shipped colour roles and scale members", () => {
    snippets.forEach(({ label, index, code }) => {
      [...code.matchAll(/theme\.colors\.(\w+)/g)].forEach((match) => {
        expect(
          tokens.colorRoles,
          `${label} #${index}: colors.${match[1]}`,
        ).toContain(match[1]);
      });
      [
        ...code.matchAll(
          /theme\.(spacing|radius|density|motion|elevation|borderWidth|iconSize|avatarSize|dimensions|typography)\.(\w+)/g,
        ),
      ].forEach((match) => {
        const group = scaleGroups[match[1] ?? ""];
        expect(group, `${label} #${index}: theme.${match[1]}`).toBeDefined();
        expect(
          group !== undefined && match[2] !== undefined && match[2] in group,
          `${label} #${index}: theme.${match[1]}.${match[2]}`,
        ).toBe(true);
      });
    });
  });

  it("imports every public name it calls, renders or types", () => {
    // A block with no package import is a contextual continuation of the block
    // above it (an expression or a shape sketch), not a copyable module; the
    // import contract applies to the blocks that present themselves as one.
    snippets
      .filter(({ code }) => [...code.matchAll(importPattern)].length > 0)
      .forEach(({ label, index, code }) => {
        const imported = importedOf(code);
        [...checkedValues, ...publicTypes].forEach((name) => {
          if (imported.has(name)) {
            return;
          }
          expect(
            usesWithoutImport(code, name),
            `${label} #${index}: uses ${name} without importing it`,
          ).toBe(false);
        });
      });
  });
});
