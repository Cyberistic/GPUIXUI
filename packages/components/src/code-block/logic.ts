import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export interface CodeBlockHeader {
  readonly title: Option.Option<string>;

  readonly language: Option.Option<string>;
}

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

const named = (value: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(value),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
  );

export const languageOfPath = (path: string): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(path.split(".").at(-1)), (extension) =>
    extension === undefined || extension === path
      ? Option.none()
      : Option.fromNullishOr(LANGUAGE_BY_EXTENSION[Str.toLowerCase(extension)]),
  );

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

export const hasCode = (source: string): boolean =>
  Str.isNonEmpty(Str.trim(source));

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

export const codeBlockName = (header: CodeBlockHeader): string =>
  Option.getOrElse(header.title, () => "Code");

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
