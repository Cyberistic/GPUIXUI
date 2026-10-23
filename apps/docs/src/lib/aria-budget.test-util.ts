/**
 * The runtime's closed `aria-*` set, as the capability record and the curated
 * pages state it.
 *
 * Two guards read this: `/docs/accessibility` prints the budget as a table, and
 * every curated page's `## Limitations` repeats the part of it its control
 * depends on. Both read the record's one row, so the parser lives here rather
 * than twice.
 */

/** The capability record's row for the `role` and `aria-*` subset. */
const ARIA_ROW = "| `role` and the `aria-*` subset |";

/** Where a negation's clause ends: the consequence after it is not the claim. */
const CLAUSE_END = /[:;.—]|,\s(?:so|because|and|while|but)\b/;

/** Every `aria-*` name in a run of text, in declaration order. */
export const ariaNames = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/`(aria-[a-z]+)`/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

export interface AriaBudget {
  /** The attributes the runtime publishes. */
  readonly published: ReadonlyArray<string>;
  /** The attributes the record names it has none of. */
  readonly refused: ReadonlyArray<string>;
}

/**
 * The two halves of the record's row.
 *
 * The row reads "`role` plus exactly seven `aria-*` attributes: … . **No** …",
 * so `**No**` is the split. A row that loses either half answers an empty list
 * rather than throwing; the guards hold the sizes.
 */
export const readAriaBudget = (record: string): AriaBudget => {
  const row =
    record.split("\n").find((line) => line.startsWith(ARIA_ROW)) ?? "";
  const [, , , detail = ""] = row.split("|");
  const [published = "", refused = ""] = detail.split("**No**");
  return { published: ariaNames(published), refused: ariaNames(refused) };
};

/**
 * The `aria-*` names a page's `## Limitations` says the runtime has none of.
 *
 * A limitation states an absence in one clause — "**No `aria-current`** in
 * 0.11.0: the current step carries `aria-selected`" — and the clause ends where
 * the consequence starts, so a name the page *uses* afterwards is not read as a
 * claim of absence. A negated list ("No `aria-haspopup`, `aria-controls`, …")
 * yields one claim per name.
 */
export const absentAriaClaims = (page: string): ReadonlyArray<string> => {
  const limitations = page.split("## Limitations")[1]?.split(/\n## /)[0] ?? "";
  return limitations.split("\n").flatMap((line) =>
    [...line.matchAll(/\b(?:no|not|without|never)\b/gi)].flatMap((negation) => {
      const rest = line.slice((negation.index ?? 0) + negation[0].length);
      const end = rest.search(CLAUSE_END);
      return ariaNames(end === -1 ? rest : rest.slice(0, end));
    }),
  );
};
