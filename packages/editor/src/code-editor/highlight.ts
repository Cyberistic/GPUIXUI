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
 * The language a stored value names.
 *
 * A language is a preference an app persists beside its draft, so it arrives
 * untyped like an indent or a value; the tokenizer reads the id through
 * `.trim()`, so a number or an object threw out of the render. An id that is
 * not text is the tokenizer's plain fallback — the paint an unknown id gets.
 */
export const languageOf = (language: unknown): string =>
  typeof language === "string" ? language : "";

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
  language: unknown,
): ReadonlyArray<HighlightRun> =>
  Arr.map(
    tokenize(source, { lang: languageOf(language) }).tokens,
    ({ className, value }) =>
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
 * land in successive rows, each keeping the run's role. The rows are **the
 * field's** lines, not a reader's idea of a document: a textarea shows one
 * (empty) line for an empty value and starts a new, empty line after a trailing
 * newline, and this layer is the only thing that sizes the editor — the field is
 * positioned absolutely over it. Reading the final row away painted an empty
 * editor as its two borders and put the caret's line, after Enter, outside a box
 * that ended on the newline.
 */
export const codeLines = (
  source: string,
  language: unknown,
): ReadonlyArray<ReadonlyArray<HighlightRun>> => {
  // A run's pieces carry one row boundary each: the first piece continues the
  // row the previous run ended on, and every later piece opens a new one. The
  // pieces are numbered by row first, because a group is the run of pieces that
  // share one.
  const [, pieces] = Arr.mapAccum(
    Arr.flatMap(codeRuns(source, language), (run) =>
      Arr.map(run.text.split(LINE_ENDINGS), (text, index) => ({
        text,
        role: run.role,
        opensRow: index > 0,
      })),
    ),
    0,
    (row, piece) => {
      const at = piece.opensRow ? row + 1 : row;
      return [at, { text: piece.text, role: piece.role, row: at }];
    },
  );
  return Arr.match(pieces, {
    onEmpty: () => [[]],
    onNonEmpty: (nonEmpty) =>
      Arr.map(
        Arr.groupWith(nonEmpty, (head, piece) => head.row === piece.row),
        (row) =>
          Arr.map(
            Arr.filter(row, (piece) => piece.text.length > 0),
            (piece) => ({ text: piece.text, role: piece.role }),
          ),
      ),
  });
};
