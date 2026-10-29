import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Schema from "effect/Schema";

/**
 * One row of the search response.
 *
 * Fumadocs answers with a JSON array it decides the shape of: a page row
 * (`type: "page"`) and one row per text chunk. The site only needs the address
 * to group them, so the rest of a row is carried through untouched instead of
 * being modelled and re-encoded.
 */
export const SearchResult = Schema.StructWithRest(
  Schema.Struct({ url: Schema.String }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

export type SearchResult = typeof SearchResult.Type;

/** The array the endpoint answers with. */
export const SearchResults = Schema.Array(SearchResult);

/** The endpoint's body, as the JSON string it arrives and leaves as. */
const SearchBody = Schema.fromJsonString(SearchResults);

/** Decode the endpoint's body; `None` means the answer is not the shape to edit. */
export const decodeSearchResults = Schema.decodeUnknownOption(SearchBody);

/** Encode the edited rows back to the body. */
export const encodeSearchResults = Schema.encodeOption(SearchBody);

/**
 * One row per address, keeping the best-ranked one.
 *
 * The index splits a long heading into several chunks and every chunk carries
 * the heading's own anchor, so a query for "button" answered with
 * `/components/button#api-reference` three times and
 * `#limitations` twice — the same destination under the same label. The rows
 * arrive ranked, so the first one is the one the dialog showed first; dropping
 * the repeats leaves each section once.
 */
export const dedupeSearchResults = (
  rows: ReadonlyArray<SearchResult>,
): ReadonlyArray<SearchResult> =>
  Arr.reduce(
    rows,
    [Arr.empty<SearchResult>(), HashSet.empty<string>()] as const,
    ([kept, seen], row) =>
      HashSet.has(seen, row.url)
        ? ([kept, seen] as const)
        : ([Arr.append(kept, row), HashSet.add(seen, row.url)] as const),
  )[0];
