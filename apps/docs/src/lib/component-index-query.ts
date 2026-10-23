/**
 * The docs indexes' filter, carried on the page URL.
 *
 * Three generated lists narrow under a reader's query — the component index, the
 * icon gallery and the API reference's symbol table — and a reader who found a
 * part, a prop, a glyph or a symbol is looking at a view worth linking: the
 * platform switch already puts its state in the address bar (`?platform=win32`),
 * and the indexes follow the same rule with `?q=…`. A component index that held
 * its query in React state alone made a shared link reopen the whole list.
 *
 * Reading and writing are pure so the rule can be tested without a router: the
 * `q` parameter is set beside every other parameter, and an empty filter
 * removes it rather than writing `?q=`.
 */

/** The query parameter every docs index filter travels in. */
export const indexQueryParam = "q";

/** The filter a docs URL carries; a URL with none opens unfiltered. */
export const indexQueryFromSearch = (search: string): string =>
  new URLSearchParams(search).get(indexQueryParam) ?? "";

/** The filter a typed value carries: surrounding space is not part of it. */
export const indexQueryValue = (query: string): string => query.trim();

/**
 * The search string a filter produces, keeping every other parameter.
 *
 * The empty filter deletes the parameter, so an index page that has never been
 * typed in keeps the clean URL it was published with.
 */
export const indexQuerySearch = (query: string, search = ""): string => {
  const params = new URLSearchParams(search);
  const value = indexQueryValue(query);

  if (value.length === 0) params.delete(indexQueryParam);
  else params.set(indexQueryParam, value);

  const next = params.toString();
  return next.length === 0 ? "" : `?${next}`;
};
