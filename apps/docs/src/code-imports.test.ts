import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  directExports,
  exportsOfModule,
  importsInCodeFences,
} from "./lib/code-imports";

/**
 * Guards the imports a reader copies out of a code fence (plan 577).
 *
 * The bug this file was written for shipped on 2026-10-19: the Inline
 * validation Usage fence imported `validate` from
 * `@gpuixui/components/validation/logic`, but the package exports
 * `"./*": "./src/*.tsx"` and the helper lives at `src/validation/logic.ts`, so
 * the specifier resolves nowhere. The import was unused in the snippet and the
 * build never read the fence, so no gate noticed. Measured then: 219 named
 * `@gpuixui/*` imports, 28 specifiers, one unresolvable.
 *
 * The site check resolves each specifier through the package's real `exports`
 * map (Node's resolver), then checks every named import against the resolved
 * module's own exports and its `export *` chain. `node:fs`/`node:path` are
 * deliberate at this vitest boundary, like `content-references.test.ts`.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const contentRoot = join(appRoot, "content/docs");
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const requireFromApp = createRequire(join(appRoot, "package.json"));

const walkPages = (dir: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return walkPages(join(dir, entry.name), path);
    return entry.name.endsWith(".mdx") ? [path] : [];
  });

const pages = walkPages(contentRoot);

const readPage = (page: string): string =>
  readFileSync(join(contentRoot, page), "utf8");

describe("importsInCodeFences", () => {
  it("reads named, type and aliased imports from a fence", () => {
    const primitives = "@gpuixui/primitives";
    const components = "@gpuixui/components";
    const icons = "@gpuixui/icons";
    const markdown = [
      `The prose may mention \`import { Nope } from "${primitives}"\`.`,
      "",
      "```tsx",
      `import { Button, type ButtonProps as Props } from "${primitives}";`,
      `import { Card, CardHeader } from "${components}";`,
      `import * as icons from "${icons}";`,
      'import "side-effect";',
      "```",
    ].join("\n");

    expect(importsInCodeFences(markdown)).toEqual([
      { specifier: primitives, names: ["Button", "ButtonProps"] },
      { specifier: components, names: ["Card", "CardHeader"] },
      { specifier: icons, names: [] },
      { specifier: "side-effect", names: [] },
    ]);
  });

  it("ignores an import written in prose", () => {
    const markdown = `import { Nope } from "${["@gpuixui", "primitives"].join("/")}";`;

    expect(importsInCodeFences(markdown)).toEqual([]);
  });
});

describe("directExports", () => {
  it("reads declarations, aliases, namespaces and a default export", () => {
    const source = [
      "export const A = 1;",
      "export type B = string;",
      "export { Inner as Outer };",
      'export * as ns from "./other.js";',
      "export default function main() {}",
    ].join("\n");

    expect([...directExports(source)].sort()).toEqual([
      "A",
      "B",
      "Outer",
      "default",
      "ns",
    ]);
  });
});

describe("exportsOfModule", () => {
  it("follows a barrel's re-exports", () => {
    const names = exportsOfModule(
      join(repoRoot, "packages/components/src/index.ts"),
    );

    expect(names.has("Field")).toBe(true);
    expect(names.has("Dialog")).toBe(true);
  });

  it("answers from a single module and rejects a name it does not export", () => {
    const names = exportsOfModule(
      join(repoRoot, "packages/components/src/field.tsx"),
    );

    expect(names.has("FieldInput")).toBe(true);
    expect(names.has("Nope")).toBe(false);
  });
});

describe("the site's copyable imports", () => {
  it("resolves and names every @gpuixui import in a code fence", () => {
    const violations = pages.flatMap((page) =>
      importsInCodeFences(readPage(page)).flatMap(({ specifier, names }) => {
        if (!specifier.startsWith("@gpuixui/")) return [];
        const file = (() => {
          try {
            return requireFromApp.resolve(specifier);
          } catch {
            return null;
          }
        })();
        if (file === null) {
          return [`${page}: cannot resolve ${specifier}`];
        }
        const exported = exportsOfModule(file);
        return names.flatMap((name) =>
          exported.has(name)
            ? []
            : [`${page}: ${specifier} has no export ${name}`],
        );
      }),
    );

    expect(violations).toEqual([]);
  });
});
