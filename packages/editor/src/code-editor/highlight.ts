/**
 * Source → runs, the tokenizer half of a code editor's highlight layer.
 *
 * `@tanstack/highlight@1.1.0` is a pure tokenizer: it takes a source and a
 * language id and returns a flat list of `{ className?, value }` tokens whose
 * values concatenate to the source exactly — no DOM, no HTML. The editor paints
 * those runs behind a transparent `<textarea>`, so the runs must never lose a
 * character: a reader's own text is the tokenized text.
 *
 * The tokenizer's **class name** (`keyword`, `string`, …) names a category of
 * token; the token package's **syntax role** names the colour a palette carries.
 * {@link tokenRole} translates one into the other, so a new class upstream is a
 * compile error here rather than a run the palette silently paints in the body
 * colour.
 *
 * A source is tokenized once and then split into lines for rendering, because a
 * token's value may cross a line ending (a block comment, a template literal).
 * The split never drops a character, only moves the newline to the boundary
 * between two rows.
 */

import { tokenize } from "@tanstack/highlight";
import type { HighlightTokenClass } from "@tanstack/highlight";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { SyntaxRole } from "@gpuixui/tokens";

/** One run of source: its exact text and, when it is a token, its syntax role. */
export interface HighlightRun {
  readonly text: string;
  /** The syntax role the run paints; `undefined` for plain (untokened) text. */
  readonly role?: SyntaxRole;
}

/**
 * Every token class the tokenizer emits, mapped to the syntax role that paints
 * it. The mapping is total: an unmapped class would silently paint in the body
 * colour, so a new class upstream is a compile error here rather than a run the
 * palette forgets.
 */
export const tokenRole: Readonly<Record<HighlightTokenClass, SyntaxRole>> = {
  attr: "attribute",
  "code-inline": "constant",
  command: "functionBuiltin",
  comment: "comment",
  deleted: "invalid",
  function: "function",
  heading: "typeName",
  inserted: "label",
  keyword: "keyword",
  link: "attribute",
  literal: "string",
  meta: "macroName",
  number: "number",
  operator: "operator",
  property: "property",
  selector: "typeName",
  string: "string",
  tag: "tag",
  type: "typeName",
  variable: "variable",
};

/**
 * The source as one run per token, in order. The runs' text concatenated is the
 * source itself, newlines included — the invariant the highlight layer paints
 * from, so a reader never sees a character the tokenizer ate.
 *
 * An unknown language id is the tokenizer's own fallback: it normalises to
 * `plaintext`, which emits one run of the whole source with no role.
 */
export const codeRuns = (
  source: string,
  language: string,
): ReadonlyArray<HighlightRun> =>
  Arr.map(tokenize(source, { lang: language }).tokens, ({ className, value }) =>
    className === undefined
      ? { text: value }
      : { text: value, role: tokenRole[className] },
  );

/** The line endings a code row splits on. */
const LINE_ENDINGS = /\r\n?|\n/;

/**
 * The source as one row per line, each row the runs that paint it.
 *
 * A run whose text crosses a line ending is split at the ending and its pieces
 * land in successive rows, each keeping the run's role. A trailing line ending
 * leaves no empty final row: `"a\n"` is one row.
 */
export const codeLines = (
  source: string,
  language: string,
): ReadonlyArray<ReadonlyArray<HighlightRun>> => {
  const rows: Array<Array<HighlightRun>> = [];
  let current: Array<HighlightRun> = [];

  const place = (text: string, role: SyntaxRole | undefined): void => {
    if (text.length > 0) current.push({ text, role });
  };

  for (const run of codeRuns(source, language)) {
    const pieces = run.text.split(LINE_ENDINGS);
    pieces.forEach((piece, index) => {
      if (index > 0) {
        rows.push(current);
        current = [];
      }
      place(piece, run.role);
    });
  }
  rows.push(current);

  return Option.match(Arr.last(rows), {
    onNone: () => [],
    onSome: (last) => (last.length === 0 ? Arr.dropRight(rows, 1) : rows),
  });
};
