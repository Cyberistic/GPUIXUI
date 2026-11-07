import { tokenize } from "@tanstack/highlight";
import type { HighlightTokenClass } from "@tanstack/highlight";
import * as Arr from "effect/Array";
import type { SyntaxRole } from "@gpuixui/tokens";

export interface HighlightRun {
  readonly text: string;

  readonly role?: SyntaxRole;
}

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

export const languageOf = (language: unknown): string =>
  typeof language === "string" ? language : "";

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

const LINE_ENDINGS = /\r\n?|\n/;

export const codeLines = (
  source: string,
  language: unknown,
): ReadonlyArray<ReadonlyArray<HighlightRun>> => {
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
