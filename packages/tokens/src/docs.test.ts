/**
 * Guards the catalogue against drift. `docs/tokens.md` is the page a consumer
 * reads and states that a token absent from it is not public, so the package is
 * the source and the page must keep up: an export with no line in the catalogue,
 * or a colour role with no table row, is a reader who cannot find the value
 * their theme already carries.
 *
 * The second drift is an import: a README or catalogue snippet that imports a
 * helper this package no longer exports sends a reader to a name that does not
 * exist, and nothing at runtime catches it because the snippet is prose. Every
 * name imported from `@gpuixui/tokens` in either document must be a real runtime
 * or type export.
 *
 * The third is a claim about other packages: the catalogue states which focus
 * ring the component packages paint, and it kept stating the old answer after
 * both adopted the new one. The page is held to the sources that decide it.
 *
 * `node:fs` is deliberate, as in `exports.test.ts`: this is a check over the
 * repository's own Markdown, and the package keeps zero runtime dependencies by
 * design.
 */

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Tokens from "./index.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const readme = read("../README.md");
const designSystem = read("../../../docs/design-system.md");

/** The package's source files a document may import from — no tests, no examples. */
const sourceFiles: ReadonlyArray<string> = readdirSync(
  new URL("./", import.meta.url),
).filter(
  (name) =>
    (name.endsWith(".ts") || name.endsWith(".tsx")) &&
    !name.includes(".test.") &&
    !name.includes(".example."),
);

/** Every name the package declares as an export, value or type. */
const declared: ReadonlySet<string> = new Set(
  sourceFiles.flatMap((file) =>
    [
      ...read(`./${file}`).matchAll(
        /export\s+(?:declare\s+)?(?:type|interface|class|function|const|enum)\s+([A-Za-z_$][\w$]*)/g,
      ),
    ].map((match) => match[1] ?? ""),
  ),
);

/** The names one document imports from `@gpuixui/tokens` or its React entry. */
const importedNames = (document: string): ReadonlyArray<string> =>
  [
    ...document.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@gpuixui\/tokens(?:\/react)?"/g,
    ),
  ]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map(
      (name) =>
        name
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0] ?? "",
    )
    .filter((name) => name.length > 0);

const roleRow = (role: string): string => `| \`${role}\` |`;

/** The runtime exports of the package, excluding nothing: every one is public. */
const exportedValues = Object.keys(Tokens);

describe("token catalogue", () => {
  it("documents every public export", () => {
    const missing = exportedValues.filter((name) => !catalogue.includes(name));

    expect(missing).toEqual([]);
  });

  it("gives every colour role a row in both colour tables", () => {
    // The default and high-contrast tables list the same roles; a role present
    // in only one of them is a reader comparing modes with a missing line.
    const missing = Tokens.colorRoles.filter(
      (role) => catalogue.split(roleRow(role)).length - 1 < 2,
    );

    expect(missing).toEqual([]);
  });

  it("gives every type role a table row", () => {
    const roles = Object.keys(Tokens.typography).filter(
      (role) => role !== "sans" && role !== "mono",
    );
    const missing = roles.filter((role) => !catalogue.includes(roleRow(role)));

    expect(missing).toEqual([]);
  });

  it("counts the roles and the pairs it documents", () => {
    expect(catalogue).toContain(`There are ${Tokens.colorRoles.length} roles.`);
    expect(catalogue).toContain(
      `The ${Tokens.contrastPairs.length} pairs cover`,
    );
  });
});

/**
 * Guards the audit's report list. `auditTheme` grows a report whenever a
 * contract lands, and the three pages that list them are how a consumer learns
 * what `passed` actually covers: a report with no line is a check the reader
 * never looks at, and a line for a report the gate no longer returns sends them
 * to a property that is `undefined`. The count word is derived from the gate
 * itself, so neither direction can drift.
 */
describe("the audit's report list", () => {
  const reports = Object.keys(Tokens.auditTheme(Tokens.lightTheme)).filter(
    (key) => key !== "passed",
  );
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ] as const;
  const count = words[reports.length] ?? `${reports.length}`;
  const surfaces = [
    {
      name: "docs/tokens.md",
      text: catalogue,
      phrase: `all ${count} reports`,
    },
    { name: "README.md", text: readme, phrase: `all ${count} reports` },
    {
      name: "docs/design-system.md",
      text: designSystem,
      phrase: `reports all ${count} in one call`,
    },
  ];
  const named = (text: string): ReadonlySet<string> =>
    new Set(
      [...text.matchAll(/\baudit\.([A-Za-z][A-Za-z0-9]*)\b(?!\.)/g)].map(
        (match) => match[1] ?? "",
      ),
    );

  it("names every report the gate returns", () => {
    const missing = surfaces.flatMap(({ name, text }) =>
      reports
        .filter(
          (report) =>
            !named(text).has(report) && !text.includes(`\`${report}\``),
        )
        .map((report) => `${name}: audit.${report}`),
    );

    expect(missing).toEqual([]);
  });

  it("names no property the gate does not return", () => {
    const known = new Set([...reports, "passed"]);
    const stale = surfaces.flatMap(({ name, text }) =>
      [...named(text)]
        .filter((property) => !known.has(property))
        .map((property) => `${name}: audit.${property}`),
    );

    expect(stale).toEqual([]);
  });

  it("prints the report count the gate has", () => {
    const silent = surfaces
      .filter(({ text, phrase }) => !text.includes(phrase))
      .map(({ name }) => name);

    expect(silent).toEqual([]);
  });
});

/**
 * Guards the catalogue's claim about which ring the component packages paint.
 * That claim went stale once: the page said they still painted the shadow on
 * every focus path long after both adopted `keyboardFocusRing` at rest. The
 * page is the only place a consumer reads it, so it is held to the sources that
 * decide it — and if a package ever paints the shadow again, this fails and
 * asks for the page to move with it.
 */
describe("focus adoption claim", () => {
  const packageSources = (directory: string): ReadonlyArray<string> =>
    readdirSync(new URL(directory, import.meta.url), {
      withFileTypes: true,
    }).flatMap((entry) => {
      const path = `${directory}${entry.name}`;
      if (entry.isDirectory()) {
        return packageSources(`${path}/`);
      }
      const isSource =
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !entry.name.includes(".test.");
      return isSource ? [read(path)] : [];
    });

  const componentSources: ReadonlyArray<string> = [
    "../../../packages/primitives/src/",
    "../../../packages/components/src/",
  ].flatMap(packageSources);

  it("no longer says the packages paint the shadow ring on every focus path", () => {
    expect(catalogue).not.toContain(
      "still paint that shadow on every focus path",
    );
  });

  it("names both seams the adoption went through", () => {
    expect(catalogue).toContain("packages/primitives/src/core/focus.ts");
    expect(catalogue).toContain("packages/components/src/internal/theme.ts");
  });

  it("matches the sources: neither package paints the shadow ring itself", () => {
    const callers = componentSources.filter((source) =>
      source.includes("focusRing("),
    );

    expect(callers).toEqual([]);
  });
});

describe("documents import what the package exports", () => {
  /** The two documents a consumer copies a snippet from. */
  const documents: Readonly<Record<string, string>> = {
    "docs/tokens.md": catalogue,
    "README.md": readme,
  };

  it("names only real exports in every package import", () => {
    const broken = Object.entries(documents).flatMap(([name, text]) =>
      importedNames(text)
        .filter((imported) => !declared.has(imported))
        .map((imported) => `${name}: ${imported}`),
    );

    expect(broken).toEqual([]);
  });

  it("finds an import to check in both documents", () => {
    // A guard that reads no imports would pass by finding nothing.
    Object.entries(documents).forEach(([name, text]) => {
      expect(importedNames(text).length, name).toBeGreaterThan(5);
    });
  });
});
