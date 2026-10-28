import * as Arr from "effect/Array";

/**
 * A page's frontmatter description, and the one link it may carry.
 *
 * A description is frontmatter, so it is a string, and a cross-reference in it
 * ("prefer the accordion when prerendering is not too heavy") is only a
 * cross-reference if a reader can follow it. One inline link form is read here:
 * the page frame paints the runs, and the metadata tags — which take words, not
 * Markdown — print {@link descriptionText}.
 */

/** One run of a description: plain words, or a link's words and its target. */
export type DescriptionRun =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "link"; readonly text: string; readonly href: string };

/** `[words](/a/path)` — no whitespace in the target, so a full stop ends it. */
const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Where the scan has reached: the runs so far, and the index after them. */
interface Cursor {
  readonly runs: ReadonlyArray<DescriptionRun>;
  readonly at: number;
}

/** A description split into the runs a page frame prints. */
export const descriptionRuns = (
  description: string,
): ReadonlyArray<DescriptionRun> => {
  const found = Arr.fromIterable(description.matchAll(INLINE_LINK));
  const start: Cursor = { runs: [], at: 0 };
  const runs = Arr.reduce(found, start, (cursor, match) => {
    const gap = description.slice(cursor.at, match.index);
    const link: DescriptionRun = {
      kind: "link",
      text: match[1] ?? "",
      href: match[2] ?? "",
    };
    const added: ReadonlyArray<DescriptionRun> =
      gap === "" ? [link] : [{ kind: "text", text: gap }, link];
    return {
      runs: Arr.appendAll(cursor.runs, added),
      at: match.index + match[0].length,
    };
  });
  const tail = description.slice(runs.at);
  return tail === ""
    ? runs.runs
    : Arr.append(runs.runs, { kind: "text", text: tail });
};

/** The description as words, for the tags that carry plain text. */
export const descriptionText = (description: string): string =>
  Arr.join(
    Arr.map(descriptionRuns(description), (run) => run.text),
    "",
  );
