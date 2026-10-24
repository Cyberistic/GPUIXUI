/**
 * Every dock page's `## API` table against the props its type declares.
 *
 * The gap guarded: the docking pages were written as prose plus a table kept by
 * hand, so a prop added to `DockLayoutProps`/`PanelGroupProps`/`SplitPaneProps`
 * later was documented nowhere, and a row naming a renamed prop kept teaching a
 * name the component no longer takes. The check is exact in both directions.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

interface PageContract {
  readonly page: string;
  readonly source: string;
  readonly type: string;
  readonly floor: number;
}

const PAGES: ReadonlyArray<PageContract> = [
  {
    page: "../docs/dock-layout.mdx",
    source: "./dock-layout.tsx",
    type: "DockLayoutProps",
    floor: 4,
  },
  {
    page: "../docs/panel-group.mdx",
    source: "./panel-group.tsx",
    type: "PanelGroupProps",
    floor: 4,
  },
  {
    page: "../docs/split-pane.mdx",
    source: "./split-pane.tsx",
    type: "SplitPaneProps",
    floor: 4,
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
    Arr.fromIterable(
      source.slice(open, end).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );
};

/** The surface a part may inherit rather than declare. */
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
