/**
 * What a code block decides before the renderer runs.
 *
 * The block paints its own text runs, tokenized by `@tanstack/highlight`. Three
 * decisions are left to this package: is there anything to paint (an empty block
 * shows a placeholder instead of a bare surface), what the header says (a file
 * path is the title when the caller names no title, and the path's extension
 * names the language when no language is given), and what an assistive reader
 * hears (a block name, and how many lines of what).
 *
 * The rows are counted here rather than in the renderer because a source ending
 * with a newline has no final row: `"a\n"` is one line, not two, and the count is
 * what the description claims.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The header a block paints: a title and a language label, each optional. */
export interface CodeBlockHeader {
  /** The file name or heading the header shows, `None` when the block has none. */
  readonly title: Option.Option<string>;
  /** The language label and the tokenizer's language id, `None` when unknown. */
  readonly language: Option.Option<string>;
}

/**
 * The extensions that name a language `@tanstack/highlight` ships. `c` maps to
 * the `cpp` grammar — the tokenizer has no C grammar of its own — and `bash` is
 * the `shell` grammar's alias; both resolve through the tokenizer's own alias
 * table.
 */
const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  bash: "bash",
  c: "cpp",
  cpp: "cpp",
  css: "css",
  go: "go",
  h: "cpp",
  hpp: "cpp",
  html: "html",
  java: "java",
  js: "js",
  json: "json",
  jsx: "jsx",
  kt: "kotlin",
  md: "markdown",
  mdx: "markdown",
  mjs: "js",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  sql: "sql",
  swift: "swift",
  toml: "toml",
  ts: "ts",
  tsx: "tsx",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

/** A caller's string with its surrounding space removed, or `None` when blank. */
const named = (value: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(value),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
  );

/**
 * The language a file path's extension names.
 *
 * Only the extensions the tokenizer is known to ship are mapped: a path is a
 * hint, not a promise, and an unknown extension returns `None` so the header
 * stays quiet rather than printing a label no grammar understands.
 */
export const languageOfPath = (path: string): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(path.split(".").at(-1)), (extension) =>
    extension === undefined || extension === path
      ? Option.none()
      : Option.fromNullishOr(LANGUAGE_BY_EXTENSION[Str.toLowerCase(extension)]),
  );

/**
 * The header a block paints.
 *
 * An explicit `title` wins over the path, and an explicit `language` over the
 * path's extension. Both are trimmed, and a blank value is the same as none, so a
 * caller that threads `""` through gets a header without that field rather than
 * an empty label.
 */
export const codeBlockHeader = (input: {
  readonly title?: string;
  readonly path?: string;
  readonly language?: string;
}): CodeBlockHeader => ({
  title: Option.orElse(named(input.title), () => named(input.path)),
  language: Option.orElse(named(input.language), () =>
    Option.flatMap(named(input.path), languageOfPath),
  ),
});

/** Whether a source has anything a reader can see. */
export const hasCode = (source: string): boolean =>
  Str.isNonEmpty(Str.trim(source));

/**
 * The rows a source paints.
 *
 * A trailing newline is the end of the last line, not a line of its own, so it
 * is dropped once; blank lines inside the source are rows and are kept. An empty
 * or whitespace-only source has no rows at all.
 */
export const codeRowCount = (source: string): number => {
  if (!hasCode(source)) return 0;
  const rows = Str.split(/\r\n?|\n/)(source);
  return pipe(
    Arr.last(rows),
    Option.match({
      onNone: () => 0,
      onSome: (last) =>
        Str.isEmpty(last)
          ? Arr.length(Arr.dropRight(rows, 1))
          : Arr.length(rows),
    }),
  );
};

/** The name a reader hears for a block: its title, or the generic name. */
export const codeBlockName = (header: CodeBlockHeader): string =>
  Option.getOrElse(header.title, () => "Code");

/**
 * What a reader hears after the name: how much code, and of what language.
 *
 * The runs are presentational and publish no accessible node, so the count and
 * the language are the only description of the source a reader gets.
 */
export const codeBlockDescription = (
  rows: number,
  language: Option.Option<string>,
): string =>
  rows === 0
    ? "Empty"
    : `${rows} ${rows === 1 ? "line" : "lines"}${Option.match(language, {
        onNone: () => "",
        onSome: (name) => ` of ${name}`,
      })}`;
