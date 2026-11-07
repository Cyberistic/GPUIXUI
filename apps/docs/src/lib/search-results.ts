import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Schema from "effect/Schema";

export const SearchResult = Schema.StructWithRest(
  Schema.Struct({ url: Schema.String }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

export type SearchResult = typeof SearchResult.Type;

export const SearchResults = Schema.Array(SearchResult);

const SearchBody = Schema.fromJsonString(SearchResults);

export const decodeSearchResults = Schema.decodeUnknownOption(SearchBody);

export const encodeSearchResults = Schema.encodeOption(SearchBody);

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
