/**
 * Every files page's `## API` table against the props its type declares.
 *
 * The gap guarded: `packages/files` documented its surfaces in prose and a
 * table its author kept by hand, so a prop added to a `*Props` interface later
 * was documented nowhere, and a row naming a prop that had been renamed kept
 * teaching a name the component no longer takes. The check is exact in both
 * directions: every declared prop has a row, and every row names a declared
 * prop (or the host surface every part inherits).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** A page and the props type its source declares, with a floor for the reader. */
interface PageContract {
  readonly page: string;
  readonly source: string;
  readonly type: string;
  /** Minimum props a table must resolve, so a broken reader cannot pass. */
  readonly floor: number;
}

const PAGES: ReadonlyArray<PageContract> = [
  {
    page: "../docs/file-tree.mdx",
    source: "./tree/file-tree.tsx",
    type: "FileTreeProps",
    floor: 8,
  },
  {
    page: "../docs/log-viewer.mdx",
    source: "./log/log-viewer.tsx",
    type: "LogViewerProps",
    floor: 6,
  },
  {
    page: "../docs/property-panel.mdx",
    source: "./property/property-panel.tsx",
    type: "PropertyPanelProps",
    floor: 5,
  },
];

/** The props one interface declares, from its own body. */
const declaredProps = (source: string, type: string): ReadonlyArray<string> => {
  const start = source.indexOf(`export interface ${type}`);
  if (start < 0) return [];
  const open = source.indexOf("{", start);
  const end = source.indexOf("\n}", open);
  if (open < 0 || end < 0) return [];
  return Arr.map(
    Arr.fromIterable(source.slice(open, end).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm)),
    (match) => match[1] ?? "",
  );
};

/**
 * The surface a part may inherit rather than declare.
 *
 * A page may document these beside the props its interface declares, so a row
 * naming one is not reported as a phantom prop; every locally declared prop is
 * still required, which is what catches a real omission.
 */
const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "className",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

/** Every name a row's prop cell documents, in backticks. */
const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

/** The props a page's `## API` table documents. */
const documentedProps = (page: string): ReadonlyArray<string> => {
  const start = page.indexOf("## API");
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Str.split(section, "\n"), (line) =>
    Str.startsWith("| `")(line) ? namesIn(Str.split(line, "|")[1] ?? "") : [],
  );
};

describe.each(PAGES)("the $page page", (contract) => {
  it("documents every prop its type declares, and nothing else", () => {
    const declared = declaredProps(read(contract.source), contract.type);
    const documented = documentedProps(read(contract.page));

    // A floor so a reader that resolved nothing cannot pass vacuously.
    expect(declared.length).toBeGreaterThan(contract.floor - 1);
    expect(documented.length).toBeGreaterThan(contract.floor - 1);
    expect(
      Arr.filter(
        declared,
        (name) => !INHERITED.has(name) && !documented.includes(name),
      ),
    ).toEqual([]);
    expect(
      Arr.filter(
        documented,
        (name) => !declared.includes(name) && !INHERITED.has(name),
      ),
    ).toEqual([]);
  });
});
