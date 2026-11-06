import { tokenize } from "@tanstack/highlight";
import type { HighlightTokenClass } from "@tanstack/highlight";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { SyntaxRole } from "../internal/theme.js";

export interface CodeRun {
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

export const codeRuns = (
  source: string,
  language: string,
): ReadonlyArray<CodeRun> =>
  Arr.map(tokenize(source, { lang: language }).tokens, ({ className, value }) =>
    className === undefined
      ? { text: value }
      : { text: value, role: tokenRole[className] },
  );

const LINE_ENDINGS = /\r\n?|\n/;

export const codeLines = (
  source: string,
  language: string,
): ReadonlyArray<ReadonlyArray<CodeRun>> => {
  const rows: Array<Array<CodeRun>> = [];
  let current: Array<CodeRun> = [];

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
