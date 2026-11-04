import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSymbolIndex,
  parseExport,
  readPublishedModules,
  readWorkspace,
  repoRoot,
  scanExports,
} from "./public-symbols-source";
import { buildSymbolIndex, docsUrlFor, filterSymbols } from "./public-symbols";

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

  it("reads a declaration whose body holds a regex literal", () => {
    // A regex's brackets are **pattern syntax**, not code: `[^)]` holds a
    // closing parenthesis that closes nothing. Counting them left the
    // scanner's depth off by one, and it swallowed the rest of the module --
    // so the exports after a regex were never published, and a page naming
    // one read as importing a name the package does not publish.
    const source = [
      "export const substitute = (svg: string): string =>",
      '  svg.replace(/var\\((--pele-[a-z-]+)\\s*,\\s*[^)]*\\)/g, "\\$1");',
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      'export const substitute = (svg: string): string =>\n  svg.replace(/var\\((--pele-[a-z-]+)\\s*,\\s*[^)]*\\)/g, "\\$1");',
      "export const after = 1;",
    ]);
  });

  it("reads a declaration whose body holds JSX", () => {
    // JSX is the fifth thing beside code, comments, strings and templates:
    // its tags are not brackets, and a comma inside a child's props is not
    // a declarator. A component that returns JSX was therefore unreadable,
    // and every export after it was lost with it.
    const source = [
      "export const Label = ({ text }: Props) => (",
      "  <div>",
      "    <span>{text}</span>",
      "  </div>",
      ");",
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const Label = ({ text }: Props) => (\n  <div>\n    <span>{text}</span>\n  </div>\n);",
      "export const after = 1;",
    ]);
  });

  it("reads a division as a division, not as a regex", () => {
    // A slash after something that can end an expression is a division. Read
    // as a regex it swallowed the rest of the file, and the exports after
    // it were never published.
    const source = [
      "export const half = (value: number): number =>",
      "  (value + 1) / 2;",
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const half = (value: number): number =>\n  (value + 1) / 2;",
      "export const after = 1;",
    ]);
  });

  it("reads a declaration whose parameter is destructured", () => {
    // A destructured parameter is a brace inside the parameter list, and its
    // close is not the end of the statement. A scanner that counted only the
    // braces closed the parameter list at the pattern's brace, and every
    // export after it was lost with it.
    const source = [
      "export const SearchInput = ({",
      "  value: valueProp,",
      "  ...rest",
      "}: SearchInputProps) => {",
      "  return null;",
      "};",
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const SearchInput = ({\n  value: valueProp,\n  ...rest\n}: SearchInputProps) => {\n  return null;\n}",
      "export const after = 1;",
    ]);
  });

  it("reads an object literal that is an argument", () => {
    // An object literal's brace closes at the same depth as the call's own
    // parenthesis, so the statement's own brackets are still open when its
    // `;` arrives. Read as a pattern's brace, the statement ended early and
    // the exports after it were lost.
    const source = [
      "export const Field = () => {",
      "  const [value, setValue] = useState({",
      "    value: valueProp,",
      "  });",
      "};",
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const Field = () => {\n  const [value, setValue] = useState({\n    value: valueProp,\n  });\n}",
      "export const after = 1;",
    ]);
  });

  it("reads a tag whose attributes hold a comment", () => {
    // A comment in a tag's attributes is not the tag's end, and the comment
    // may hold the `>` that a naive scan would read as the tag's own. The
    // element was then never closed, and every export after it was lost.
    const source = [
      "export const Field = () => (",
      "  <input",
      "    {...rest}",
      "    // The caret is measured against `background`.",
      "    value={value}",
      "  />",
      ");",
      "export const after = 1;",
    ].join("\n");

    expect(scanExports(source).map((entry) => entry.text)).toEqual([
      "export const Field = () => (\n  <input\n    {...rest}\n    // The caret is measured against `background`.\n    value={value}\n  />\n);",
      "export const after = 1;",
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

describe("the page a symbol's module ships with", () => {
  const collections = [
    { dir: "packages/primitives/docs", route: "/primitives" },
    { dir: "packages/components/docs", route: "/components" },
  ];
  const pages = [{ url: "/primitives/otp-field" }, { url: "/components/card" }];

  it("kebab-cases the declaring file, acronyms included", () => {
    expect(
      docsUrlFor(
        "packages/primitives/src/components/OTPField.tsx",
        collections,
        pages,
      ),
    ).toBe("/primitives/otp-field");
    expect(
      docsUrlFor("packages/components/src/card.tsx", collections, pages),
    ).toBe("/components/card");
  });

  it("refuses a helper, a bare index and a page the site does not mount", () => {
    expect(
      docsUrlFor("packages/primitives/src/core/style.ts", collections, pages),
    ).toBeUndefined();
    expect(
      docsUrlFor("packages/components/src/menu/index.tsx", collections, pages),
    ).toBeUndefined();
    // A file whose page was removed must not become a 404 in a link.
    expect(
      docsUrlFor("packages/components/src/accordion.tsx", collections, pages),
    ).toBeUndefined();
  });

  it("refuses a package with no docs collection, and a path outside packages/", () => {
    expect(
      docsUrlFor("packages/tokens/src/theme.ts", collections, pages),
    ).toBeUndefined();
    expect(
      docsUrlFor("apps/docs/src/lib/site.ts", collections, pages),
    ).toBeUndefined();
  });
});
