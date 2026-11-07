import * as Arr from "effect/Array";

export type TokenKind = "plain" | "keyword" | "string" | "number" | "comment";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

const PATTERN =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?:^|\b)(const|let|function|return|import|from|export|type|interface|new|await|async|if|else|readonly|true|false|null|undefined)(?=\b)|\b(\d+(?:\.\d+)?)\b/g;

const kindOf = (match: RegExpMatchArray): TokenKind => {
  if (match[1] !== undefined) return "comment";
  if (match[2] !== undefined) return "string";
  if (match[3] !== undefined) return "keyword";
  return "number";
};

interface Scan {
  readonly tokens: ReadonlyArray<Token>;

  readonly end: number;
}

const empty: Scan = { tokens: [], end: 0 };

const plain = (text: string): Token => ({ kind: "plain", text });

export const tokenize = (line: string): ReadonlyArray<Token> => {
  const scan = Arr.reduce(
    Arr.fromIterable(line.matchAll(PATTERN)),
    empty,
    (held, match): Scan => {
      const index = match.index;
      const gap = index > held.end ? [plain(line.slice(held.end, index))] : [];
      return {
        tokens: [
          ...held.tokens,
          ...gap,
          { kind: kindOf(match), text: match[0] } satisfies Token,
        ],
        end: index + match[0].length,
      };
    },
  );
  return scan.end < line.length
    ? [...scan.tokens, plain(line.slice(scan.end))]
    : scan.tokens;
};
