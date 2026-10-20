/**
 * A component page's examples are copyable code, so the page guard compiles
 * them (plan 613). This module only reads the fences; the compiler lives in the
 * test, where `node:*` and `typescript` are boundary imports.
 *
 * The docs app forbids the Effect runtime outside tests (`architecture.test`),
 * so this parser is plain TypeScript like the rest of `src/lib`.
 */

/** One fenced `ts`/`tsx` block from a page. */
export interface ExampleSnippet {
  /** Page slug, e.g. `button`. */
  readonly page: string;
  /** 1-based fence ordinal on the page. */
  readonly index: number;
  readonly lang: "ts" | "tsx";
  /** 1-based line of the opening fence in the MDX file. */
  readonly line: number;
  /** The fence body, verbatim. */
  readonly code: string;
}

const OPENING = /^```(\S*)\s*$/;
const CLOSING = /^```\s*$/;

const isCode = (lang: string): lang is "ts" | "tsx" =>
  lang === "ts" || lang === "tsx";

/** The first closing fence after `from`, or the end of the page. */
const closingAt = (lines: ReadonlyArray<string>, from: number): number => {
  const found = lines.findIndex((line, at) => at > from && CLOSING.test(line));
  return found === -1 ? lines.length : found;
};

const scan = (
  lines: ReadonlyArray<string>,
  page: string,
  cursor: number,
  index: number,
  snippets: ReadonlyArray<ExampleSnippet>,
): ReadonlyArray<ExampleSnippet> => {
  if (cursor >= lines.length) return snippets;

  const opening = OPENING.exec(lines[cursor] ?? "");
  if (opening === null) return scan(lines, page, cursor + 1, index, snippets);

  const closing = closingAt(lines, cursor);
  const lang = opening[1] ?? "";
  const body = lines.slice(cursor + 1, closing).join("\n");
  const next = Math.min(closing + 1, lines.length);

  return isCode(lang)
    ? scan(lines, page, next, index + 1, [
        ...snippets,
        { page, index: index + 1, lang, line: cursor + 1, code: body },
      ])
    : scan(lines, page, next, index, snippets);
};

/**
 * Every `ts`/`tsx` fence in a page, in document order. A non-code fence (sh,
 * json) is skipped with its body; an unclosed fence yields the rest of the file
 * so the compiler names the page instead of the block disappearing.
 */
export const fencedExamples = (
  page: string,
  markdown: string,
): ReadonlyArray<ExampleSnippet> => scan(markdown.split("\n"), page, 0, 0, []);

/** Whether a snippet is a module rather than a script with leaked globals. */
export const isModule = (snippet: ExampleSnippet): boolean =>
  /(^|\n)\s*(import|export)[\s{*]/.test(snippet.code);
