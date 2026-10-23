import * as Arr from "effect/Array";

/**
 * The code editor preview's token layer.
 *
 * The native editor paints `@tanstack/highlight`'s tokens on a layer under the
 * runtime's textarea. The preview cannot import that layer into a DOM preview —
 * the highlight package is the component's — so this is the smallest tokenizer
 * that paints a `tsx` snippet the same way: keywords, strings, numbers,
 * comments and the rest as plain text. It is a browser approximation of the
 * paint; the Code tab shows the real component and its highlighter.
 */

export type TokenKind = "plain" | "keyword" | "string" | "number" | "comment";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

/**
 * The kinds one line can hold, in the order the grammar wins: a comment runs to
 * the end of the line, a string is one quoted run, a keyword is a whole word and
 * a number is one numeric literal. Everything between is plain text.
 */
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
  /** The index the last token ended at. */
  readonly end: number;
}

const empty: Scan = { tokens: [], end: 0 };

const plain = (text: string): Token => ({ kind: "plain", text });

/** The tokens of one line, in order, with every plain run kept. */
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
