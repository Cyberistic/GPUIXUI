/**
 * The `MarkdownEditor` page's API table against the props the type declares.
 *
 * The bug guarded: a page that lists the props its author remembered, so a
 * prop added to `MarkdownEditorProps` later is documented nowhere and a reader
 * cannot discover `testId` — the address an automation host locates the editor
 * by. The page was pruned to its example, API and limits; the count it used to
 * print is gone, so the table is what is left to hold.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** The props the component's own interface declares. */
const declaredProps = (): ReadonlyArray<string> => {
  const source = read("./markdown/markdown-editor.tsx");
  const start = source.indexOf("export interface MarkdownEditorProps {");
  const end = source.indexOf("\n}", start);
  if (start < 0 || end < 0) return [];
  return Arr.map(
    Arr.fromIterable(
      source.slice(start, end).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );
};

/** The first backticked name in each row of the page's `## API` table. */
const documentedProps = (): ReadonlyArray<string> => {
  const page = read("../docs/markdown-editor.mdx");
  const start = page.indexOf("## API");
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Arr.fromIterable(section.split("\n")), (line) => {
    if (!line.startsWith("| `")) return [];
    const name = /^\| `([^`]+)`/.exec(line)?.[1];
    return name === undefined ? [] : [name];
  });
};

describe("the MarkdownEditor page", () => {
  it("documents every prop its type declares, and nothing else", () => {
    const declared = declaredProps();
    const documented = documentedProps();

    // A floor so a reader that resolved nothing cannot pass vacuously.
    expect(declared.length).toBeGreaterThan(10);
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(Arr.filter(documented, (name) => !declared.includes(name))).toEqual(
      [],
    );
  });
});
