import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Match } from "effect";
import type { CodeFile } from "./data.js";

export type Tone =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "fn"
  | "punctuation";

export interface Token {
  readonly text: string;
  readonly tone: Tone;
}

const KEYWORDS: ReadonlySet<string> = new Set([
  "import",
  "from",
  "export",
  "const",
  "return",
  "function",
  "default",
  "await",
  "async",
  "let",
  "if",
  "else",
  "new",
  "true",
  "false",
]);

const PIECES =
  /(\s+|[(){}[\],.;:=<>+\-*/]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/;

/** The line's code and its `//` tail, as two parts. */
export const splitComment = (
  line: string,
): readonly [string, string | undefined] => {
  const at = line.indexOf("//");
  return at < 0 ? [line, undefined] : [line.slice(0, at), line.slice(at)];
};

const toneOf = (piece: string): Tone =>
  Match.value(piece).pipe(
    Match.when(
      (p) => p.startsWith('"') || p.startsWith("'"),
      () => "string" as const,
    ),
    Match.when(
      (p) => KEYWORDS.has(p),
      () => "keyword" as const,
    ),
    Match.when(
      (p) => p.endsWith("("),
      () => "fn" as const,
    ),
    Match.when(
      (p) => /^[(){}[\],.;:=<>+\-*/]$/.test(p),
      () => "punctuation" as const,
    ),
    Match.orElse(() => "plain" as const),
  );

/** One line's tokens, spaces preserved so they join back to the line. */
export const highlight = (line: string): ReadonlyArray<Token> => {
  const [code, comment] = splitComment(line);
  const tokens: ReadonlyArray<Token> = Arr.map(
    Arr.filter(Str.split(PIECES)(code), Str.isNonEmpty),
    (piece) => ({ text: piece, tone: toneOf(piece) }),
  );
  return comment === undefined
    ? tokens
    : Arr.append(tokens, { text: comment, tone: "comment" });
};

/** The file a press opens; an unknown name keeps the first file. */
export const openFile = (
  files: ReadonlyArray<CodeFile>,
  name: string,
): Option.Option<CodeFile> =>
  Option.orElse(
    Arr.findFirst(files, (file) => file.name === name),
    () => Arr.head(files),
  );
