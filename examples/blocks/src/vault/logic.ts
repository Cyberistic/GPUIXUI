/** The vault's rules: how a body splits into links, and what links to a note. */

import * as Arr from "effect/Array";
import type { VaultNote } from "./data.js";

export type Span =
  | { readonly _tag: "Text"; readonly text: string }
  | { readonly _tag: "Link"; readonly id: string };

/** A paragraph, in order, with each `[[id]]` as a link span. */
export const spans = (paragraph: string): ReadonlyArray<Span> =>
  Arr.flatMap(
    paragraph.split(/(\[\[[a-z-]+\]\])/),
    (part): ReadonlyArray<Span> => {
      const id = /^\[\[([a-z-]+)\]\]$/.exec(part)?.[1];
      if (id !== undefined) return [{ _tag: "Link", id }];
      return part === "" ? [] : [{ _tag: "Text", text: part }];
    },
  );

/** The notes a note links to, once each, in reading order. */
export const linksFrom = (note: VaultNote): ReadonlyArray<string> =>
  Arr.dedupe(
    Arr.flatMap(note.body, (paragraph) =>
      Arr.flatMap(spans(paragraph), (span) =>
        span._tag === "Link" ? [span.id] : [],
      ),
    ),
  );

/** The notes that link to `id`. */
export const backlinks = (
  all: ReadonlyArray<VaultNote>,
  id: string,
): ReadonlyArray<VaultNote> =>
  Arr.filter(all, (note) => Arr.contains(linksFrom(note), id));

/** Every link in the vault once, however many notes state it. */
export const edges = (
  all: ReadonlyArray<VaultNote>,
): ReadonlyArray<readonly [string, string]> =>
  Arr.dedupeWith(
    Arr.flatMap(all, (note) =>
      Arr.map(linksFrom(note), (id) =>
        note.id < id ? ([note.id, id] as const) : ([id, note.id] as const),
      ),
    ),
    (a, b) => a[0] === b[0] && a[1] === b[1],
  );
