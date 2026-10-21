import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSymbolIndex,
  parseExport,
  readPublishedModules,
  readWorkspace,
  repoRoot,
  scanExports,
} from "./public-symbols-source";
import { buildSymbolIndex, filterSymbols } from "./public-symbols";

/**
 * The public symbol index.
 *
 * The reference page claims to publish every symbol a consumer can import.
 * That claim is checked here against the workspace itself: the reader must
 * find the exports the source declares, and it must not invent names the
 * source does not declare. A scanner that quietly misses a form would leave
 * the page quietly incomplete, so the two directions are both measured.
 */

describe("the export scanner", () => {
  it("finds a declaration, and the doc comment above it", () => {
    const source = [
      "/**",
      " * The button.",
      " *",
      " * More prose.",
      " */",
      "export function Button() {}",
    ].join("\n");

    expect(scanExports(source)).toEqual([
      {
        text: "export function Button() {}",
        doc: "\n * The button.\n *\n * More prose.\n ",
      },
    ]);
  });

  it("ignores an export inside a comment, a string or a template", () => {
    const source = [
      "// export const commented = 1;",
      "/* export const blocked = 2; */",
      'const text = "export const quoted = 3;";',
      "const template = `export const templated = 4;`;",
      "export const real = 5;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const real = 5;",
    ]);
  });

  it("reads a statement that spans lines", () => {
    const source = [
      "export {",
      "  first,",
      "  second,",
      '} from "./other.js";',
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      'export {\n  first,\n  second,\n} from "./other.js";',
    ]);
  });

  it("reads a declaration whose body holds braces and semicolons", () => {
    const source = [
      "export function make() {",
      "  const inner = { a: 1 };",
      "  return inner;",
      "}",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export function make() {\n  const inner = { a: 1 };\n  return inner;\n}",
    ]);
  });
});

describe("the statement reader", () => {
  it("reads a star re-export", () => {
    expect(parseExport('export * from "./button.js";')).toEqual({
      type: "star",
      module: "./button.js",
    });
  });

  it("reads a namespace re-export", () => {
    expect(parseExport('export * as Native from "./native.js";')).toEqual({
      type: "namespace",
      name: "Native",
      module: "./native.js",
    });
  });

  it("reads a named re-export, with its aliases and type marks", () => {
    const parsed = parseExport(
      'export { resolve, type Binding, format as formatKey } from "./keymap.js";',
    );

    expect(parsed).toEqual({
      type: "named",
      names: [
        { exported: "resolve", local: "resolve", typeOnly: false },
        { exported: "Binding", local: "Binding", typeOnly: true },
        { exported: "formatKey", local: "format", typeOnly: false },
      ],
      module: "./keymap.js",
    });
  });

  it("reads the declarations a module makes", () => {
    expect(parseExport("export interface Theme { mode: string }")).toEqual({
      type: "declaration",
      names: [{ name: "Theme", kind: "interface" }],
    });
    expect(parseExport('export type Mode = "light" | "dark";')).toEqual({
      type: "declaration",
      names: [{ name: "Mode", kind: "type" }],
    });
    expect(parseExport("export class Registry {}")).toEqual({
      type: "declaration",
      names: [{ name: "Registry", kind: "class" }],
    });
    expect(parseExport("export function useTheme() {}")).toEqual({
      type: "declaration",
      names: [{ name: "useTheme", kind: "hook" }],
    });
    expect(parseExport("export function Button() {}")).toEqual({
      type: "declaration",
      names: [{ name: "Button", kind: "component" }],
    });
    expect(parseExport("export const createTheme = () => ({})")).toEqual({
      type: "declaration",
      names: [{ name: "createTheme", kind: "function" }],
    });
  });
});

describe("the workspace index", () => {
  const index = buildWorkspaceSymbolIndex(repoRoot);

  it("reads every package that publishes an entry point", () => {
    const published = readWorkspace(repoRoot).map(({ pkg }) => pkg.name);

    expect(index.packages.map((pkg) => pkg.name)).toEqual(published);
  });

  it("finds the symbols every published module declares", () => {
    const empty = readPublishedModules(repoRoot)
      .filter((module) => module.symbols.length === 0)
      .map((module) => module.specifier);

    expect(empty).toEqual([]);
  });

  it("names a symbol the library is known for, with its kind", () => {
    const tokens = index.packages.find((pkg) => pkg.name === "@gpuixui/tokens");
    const theme = tokens?.symbols.find((row) => row.name === "createTheme");

    expect(theme?.kind).toBe("function");
    expect(theme?.module).toBe("packages/tokens/src/theme.ts");
    expect(theme?.summary).not.toBe("");
  });

  it("lists every specifier that publishes a symbol", () => {
    const components = index.packages.find(
      (pkg) => pkg.name === "@gpuixui/components",
    );
    const card = components?.symbols.find((row) => row.name === "Card");

    expect(card?.specifiers).toContain("@gpuixui/components");
    expect(card?.specifiers).toContain("@gpuixui/components/card");
  });
});

describe("the index model", () => {
  const packages = [
    { dir: "tokens", name: "@gpuixui/tokens", description: "tokens" },
  ];
  const modules = [
    {
      specifier: "@gpuixui/tokens",
      packageName: "@gpuixui/tokens",
      module: "packages/tokens/src/theme.ts",
      symbols: [
        {
          name: "createTheme",
          kind: "function" as const,
          module: "packages/tokens/src/theme.ts",
          summary: "Builds a theme.",
        },
      ],
    },
    {
      specifier: "@gpuixui/tokens/theme",
      packageName: "@gpuixui/tokens",
      module: "packages/tokens/src/theme.ts",
      symbols: [
        {
          name: "createTheme",
          kind: "function" as const,
          module: "packages/tokens/src/theme.ts",
          summary: "Builds a theme.",
        },
      ],
    },
  ];

  it("holds one row per symbol, listing the specifiers that publish it", () => {
    const built = buildSymbolIndex(packages, modules);

    expect(built.count).toBe(1);
    expect(built.packages[0]?.symbols[0]?.specifiers).toEqual([
      "@gpuixui/tokens",
      "@gpuixui/tokens/theme",
    ]);
  });

  it("keeps only the rows a query names", () => {
    const built = buildSymbolIndex(packages, modules);

    expect(filterSymbols(built.packages, "theme")).toHaveLength(1);
    expect(filterSymbols(built.packages, "nothing")).toHaveLength(0);
  });
});
