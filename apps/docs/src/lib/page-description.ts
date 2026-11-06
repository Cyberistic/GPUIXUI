import * as Arr from "effect/Array";

export type DescriptionRun =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "link"; readonly text: string; readonly href: string };

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

interface Cursor {
  readonly runs: ReadonlyArray<DescriptionRun>;
  readonly at: number;
}

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

export const descriptionText = (description: string): string =>
  Arr.join(
    Arr.map(descriptionRuns(description), (run) => run.text),
    "",
  );
