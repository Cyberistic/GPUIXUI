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

const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

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

describe("the Diff viewer page's split contract", () => {
  const page = read("../docs/diff-viewer.mdx").replace(/\s+/g, " ");

  it("teaches two equal columns, a divider and a per-column scroller", () => {
    expect(page).toContain("two equal columns");
    expect(page).toContain("divider");
    expect(page).toContain("own horizontal scroller");
    expect(page).toContain("share a row height");
  });

  it("retracts the content-sizing claim the rebuilt layout replaces", () => {
    expect(page).not.toContain("sizes a row's cells by their content");
    expect(page).not.toContain("removed tint ended");

    expect(page).toContain("`hunks(");
    expect(page).toContain("`rows(");
    expect(page).toContain("`pairs(");
    expect(page).toContain("`contextLines`");
  });
});
