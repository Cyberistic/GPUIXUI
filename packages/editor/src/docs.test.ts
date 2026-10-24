/**
 * Every editor page's `## API` table against the props its type declares.
 *
 * The bug guarded: a page that lists the props its author remembered, so a prop
 * added to a `*Props` interface later is documented nowhere and a reader cannot
 * discover it. The address an automation host locates the surface by
 * (`testId`) was missing from three of the four pages while `MarkdownEditor`'s
 * page carried it, so the omission was invisible from any one page.
 *
 * The check is exact in both directions: a declared prop must have a row and a
 * row must name a declared prop. A row may document two props in one cell
 * (`minRows` / `maxRows`); its names are read as a set, not as its first span.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const repoRoot = new URL("../../../", import.meta.url);

const readRepo = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, repoRoot)), "utf8");

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
    page: "../docs/markdown-editor.mdx",
    source: "./markdown/markdown-editor.tsx",
    type: "MarkdownEditorProps",
    floor: 10,
  },
  {
    page: "../docs/code-editor.mdx",
    source: "./code-editor/code-editor.tsx",
    type: "CodeEditorProps",
    floor: 10,
  },
  {
    page: "../docs/diff-viewer.mdx",
    source: "./diff/diff-viewer.tsx",
    type: "DiffViewerProps",
    floor: 5,
  },
  {
    page: "../docs/search-replace.mdx",
    source: "./search/search-replace.tsx",
    type: "SearchReplaceProps",
    floor: 8,
  },
];

/** The props one interface declares, from its own body. */
const declaredProps = (source: string, type: string): ReadonlyArray<string> => {
  const start = source.indexOf(`export interface ${type} {`);
  const end = source.indexOf("\n}", start);
  if (start < 0 || end < 0) return [];
  return Arr.map(
    Arr.fromIterable(
      source.slice(start, end).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
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
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(
      Arr.filter(
        documented,
        (name) => !declared.includes(name) && !INHERITED.has(name),
      ),
    ).toEqual([]);
  });
});

/**
 * The Diff viewer's split-sizing record, held to the window's own reading.
 *
 * The bug guarded: `mode="split"` looks like two equal columns, so a reader
 * plans a narrow pane on that assumption — while the runtime sizes each cell by
 * its line first and clips what runs past the edge. The page said only "old line
 * left, replacement right", so nothing told a consumer that a long change cuts
 * its added side. The figures are read from the playground's fixture, so a probe
 * that re-measures the share cannot leave the page printing the old one.
 * `node:fs` is used here only because this is a test-time repository check.
 */
describe("the Diff viewer page's split sizing", () => {
  const page = read("../docs/diff-viewer.mdx");
  const fixture = readRepo("apps/playground/src/live/diff-viewer.ts");

  it("prints the share the window measured, from the fixture's own figure", () => {
    const gutter = /export const DIFF_SPLIT_GUTTER = ([\d.]+);/.exec(fixture);
    // A floor: a reader that found no figure cannot pass vacuously.
    expect(gutter).not.toBeNull();
    const share = Math.round(Number(gutter?.[1]) * 100);
    expect(share).toBeGreaterThan(50);

    expect(page).toContain(`**${share}%**`);
    // The second figure is the removed tint's end, which the fixture's note owns.
    expect(fixture).toContain("59% of the 418-point");
    expect(page).toContain("**59%**");
  });

  it("teaches the cut and the reading a narrow pane gets instead", () => {
    expect(page).toContain("sizes a row's cells by their content");
    expect(page).toContain("clips");
    expect(page).toContain("never wrap");
    expect(page).toContain("`unified` mode");
    // The row is one line: a page promising a wrap would contradict the paint.
    expect(page).not.toContain("wraps the line");
  });
});
