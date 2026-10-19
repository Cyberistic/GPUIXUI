/**
 * Guards the defect fixed in plan 355: the fenced TypeScript snippets in
 * `docs/tokens.md` and the package README are what a reader copies, and nothing
 * held them to the package. The platform-recipe snippet rendered
 * `<ThemeProvider>` without importing it while every gate stayed green.
 *
 * Plan 356 extends the same guard to the `@example` blocks in the package's own
 * modules, the surface plan 355 had called closed: `getPlatformTheme` and
 * `getPlatformRecipeTheme` each still rendered `<ThemeProvider>` without
 * importing it, one documentation surface over.
 *
 * Plan 655 closes the half plan 356 left open: the import case filtered out a
 * block with no import as a contextual continuation, which is right for a docs
 * page and wrong for a source example. Fourteen source examples called the API
 * (five with an undeclared `theme`) and could not be copied; every source
 * block now imports the package, and the case below fails if one stops doing
 * so.
 *
 * Plan 656 closes the other half of plan 655's promise. A block that imports the
 * package presents itself as a module, but twenty-two still painted with an
 * undeclared `theme`; the public-name case cannot see a local variable. A
 * copyable block now has to bind `theme` or receive it as a parameter. A docs
 * block with no package import stays a contextual continuation, and a JSX
 * `theme={…}` prop is not the variable.
 *
 * This is not a compiler: a snippet is a contextual fragment, so `children` and
 * `brandTheme` have no module scope. It checks the four facts a fragment can
 * still get wrong about this package — that its imports exist, that its theme
 * is declared once the block imports the package, that the colour roles and
 * scale members it names exist, and that a public function, component or type
 * it uses is imported by the same block.
 *
 * `node:fs` is deliberate, as in `public-types.test.ts` and `examples.test.ts`:
 * this is a synchronous policy check over the tree's own documents, not runtime
 * I/O, and the package ships zero runtime dependencies by design.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandTheme } from "./brand-theme.example.js";
import {
  contrastFloors,
  createTheme,
  darkTheme,
  extendTheme,
  themeFailures,
} from "./index.js";
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

const moduleDir = new URL("./", import.meta.url);

const modules = readdirSync(moduleDir).filter(
  (name) =>
    name.endsWith(".ts") &&
    !name.endsWith(".test.ts") &&
    !name.endsWith(".example.ts"),
);

/** Remove the ` * ` prefix a JSDoc fence carries on every line. */
const stripJsdoc = (block: string): string =>
  block
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n");

/** Every fenced `@example` block in the package's non-test modules. */
const sourceSnippets: Snippet[] = modules.flatMap((name) =>
  [
    ...readFileSync(new URL(name, moduleDir), "utf8").matchAll(
      /```(ts|tsx)\n([\s\S]*?)```/g,
    ),
  ].map((match, index) => ({
    label: `packages/tokens/src/${name} @example`,
    index,
    code: stripJsdoc(match[2] ?? ""),
  })),
);

const snippets = [...documents.flatMap(snippetsOf), ...sourceSnippets];

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

/**
 * A block's use of the ambient `theme` after comments, imports and a JSX
 * `theme={…}` prop are removed. A prop named `theme` is not the variable.
 */
const themeUsage = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/^import[\s\S]*?;$/gm, "")
    .replace(/\btheme\s*=/g, "");

/**
 * A block that brings its own theme: a local binding, a destructured callback
 * parameter (`shippedThemes.flatMap(({ theme }) => …)`), or a typed function
 * parameter.
 */
const declaresTheme = (code: string): boolean =>
  /(?:const|let|var)\s+theme\b/.test(code) ||
  /(?:const|let|var)\s*\{[^}]*\btheme\b[^}]*\}\s*=/.test(code) ||
  /\btheme\s*:\s*Theme\b/.test(code) ||
  /\bfunction\b[^(]*\([^)]*\btheme\b/.test(code) ||
  /\(\s*\{[^}]*\btheme\b[^}]*\}\s*\)/.test(code);

/**
 * The `theme` identifier used as a value: a member access (`theme.colors`) or
 * an argument (`statusTone(theme, …)`, `focusRing(theme)`). The word "theme" in
 * a JSX label is not a variable.
 */
const usesUndeclaredTheme = (code: string): boolean =>
  /(?<![\w$.])theme\s*[.,)]/.test(themeUsage(code)) && !declaresTheme(code);

describe("documented snippets", () => {
  it("has snippets to check", () => {
    expect(snippets.length).toBeGreaterThan(40);
  });

  it("makes every source example a copyable module", () => {
    const missingImports = sourceSnippets
      .filter(({ code }) => [...code.matchAll(importPattern)].length === 0)
      .map(({ label, index }) => `${label} #${index}`);
    expect(missingImports).toEqual([]);
  });

  it("finds an example in every module that documents one", () => {
    expect(sourceSnippets.length).toBeGreaterThanOrEqual(20);
    expect(sourceSnippets.some(({ label }) => label.includes("theme.ts"))).toBe(
      true,
    );
    expect(
      sourceSnippets.some(({ label }) => label.includes("platform-recipes.ts")),
    ).toBe(true);
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

  it("declares the theme a copyable block paints with", () => {
    // Plan 655 made every source block import the package but left the ambient
    // `theme` to prose: twenty-two blocks presented themselves as modules and
    // threw `ReferenceError` when copied. A block with no import stays a
    // contextual continuation; a block with one brings the theme it paints with.
    const missing = snippets
      .filter(({ code }) => [...code.matchAll(importPattern)].length > 0)
      .filter(({ code }) => usesUndeclaredTheme(code))
      .map(({ label, index }) => `${label} #${index}`);
    expect(missing).toEqual([]);
  });

  it("reports a block that paints with an undeclared theme", () => {
    expect(
      usesUndeclaredTheme(
        `import { statusTone } from "@gpuixui/tokens";\nstatusTone(theme, "info");`,
      ),
    ).toBe(true);
    expect(
      usesUndeclaredTheme(
        `import { getTheme, statusTone } from "@gpuixui/tokens";\nconst theme = getTheme("light");\nstatusTone(theme, "info");`,
      ),
    ).toBe(false);
    expect(
      usesUndeclaredTheme(
        `const ringStyle = (theme: Theme) => focusRing(theme);`,
      ),
    ).toBe(false);
    expect(
      usesUndeclaredTheme(`<ThemeProvider theme={getTheme("dark")} />`),
    ).toBe(false);
  });
});

/**
 * Guards the defect plan 553 fixes: the snippets that teach the brand and the
 * two builder JSDoc examples were held to the API surface but not to the
 * contract. The docs page and the README showed the executed brand palette
 * without `track`, so a reader who copied it shipped a progress segment at
 * 2.225:1 on the identity groove, under the 3:1 mark floor, while the page said
 * the executed example was "this exact family". The `extendTheme` and
 * `createTheme` examples moved only `primary`, so each built a theme the
 * package's own checker rejected three times.
 *
 * `colourMapOf` reads the literal map a documented example writes. It is not a
 * TypeScript parser: a snippet is a fragment, and the only thing this guard
 * needs is the role/value pairs it names.
 */
const colourMapOf = (code: string): Readonly<Record<string, string>> => {
  const body = /colors:\s*\{([^}]*)\}/.exec(code)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/([A-Za-z]+):\s*"(#[0-9A-Fa-f]{6,8})"/g)].map(
      ([, role, value]) => [role ?? "", value ?? ""],
    ),
  );
};

/** The documented blocks that claim to build a theme with colours. */
const documentedBrands = snippets.filter(({ label, code }) =>
  label === "docs/tokens.md" || label === "packages/tokens/README.md"
    ? code.includes("brandTheme =")
    : label.includes("theme.ts @example") && code.includes("colors:"),
);

const buildDocumented = (
  code: string,
  colors: Readonly<Record<string, string>>,
) =>
  code.includes("createTheme(")
    ? createTheme({ mode: "dark", name: "Documented", colors })
    : extendTheme(darkTheme, { name: "Documented", colors });

describe("documented theme examples", () => {
  it("finds every documented brand map", () => {
    const labels = documentedBrands.map(({ label }) => label);
    expect(labels).toContain("docs/tokens.md");
    expect(labels).toContain("packages/tokens/README.md");
    expect(labels.some((label) => label.includes("theme.ts @example"))).toBe(
      true,
    );
  });

  it("builds a theme the contract accepts", () => {
    documentedBrands.forEach(({ label, index, code }) => {
      expect(
        themeFailures(buildDocumented(code, colourMapOf(code))),
        `${label} #${index}`,
      ).toEqual([]);
    });
  });

  it("moves the whole filled family and the groove", () => {
    documentedBrands.forEach(({ label, index, code }) => {
      const roles = Object.keys(colourMapOf(code));
      [
        "primary",
        "primaryForeground",
        "primaryHover",
        "primaryActive",
        "primaryText",
        "track",
      ].forEach((role) => {
        expect(roles, `${label} #${index}: ${role}`).toContain(role);
      });
    });
  });

  it("is the palette the executed example ships", () => {
    documentedBrands.forEach(({ label, index, code }) => {
      expect(brandTheme.colors, `${label} #${index}`).toMatchObject(
        colourMapOf(code),
      );
    });
  });

  it("catches the snippet it replaced", () => {
    const [documented] = documentedBrands;
    expect(documented).toBeDefined();
    if (documented === undefined) {
      return;
    }
    const { track: _track, ...withoutGroove } = colourMapOf(documented.code);
    expect(
      themeFailures(buildDocumented(documented.code, withoutGroove)),
    ).toContainEqual(
      expect.objectContaining({
        kind: "contrast",
        foreground: "primary",
        background: "track",
        pairClass: "mark",
        floor: contrastFloors.default.mark,
      }),
    );
  });
});
