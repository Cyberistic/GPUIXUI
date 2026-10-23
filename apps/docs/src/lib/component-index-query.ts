/**
 * The component index's filter, carried on the page URL.
 *
 * The filter narrows a hundred-odd generated rows, so a reader who searched for
 * a part, a prop or a verdict is looking at a view worth linking: the platform
 * switch already puts its state in the address bar (`?platform=win32`), and the
 * index follows the same rule with `?q=…`. The page documented the query but a
 * reload or a shared link dropped it, because the input held React state alone.
 *
 * Reading and writing are pure so the rule can be tested without a router: the
 * `q` parameter is set beside every other parameter, and an empty filter
 * removes it rather than writing `?q=`.
 */

/** The query parameter the component index filter travels in. */
export const componentIndexParam = "q";

/** The filter a docs URL carries; a URL with none opens unfiltered. */
export const indexQueryFromSearch = (search: string): string =>
  new URLSearchParams(search).get(componentIndexParam) ?? "";

/** The filter a typed value carries: surrounding space is not part of it. */
export const indexQueryValue = (query: string): string => query.trim();

/**
 * The search string a filter produces, keeping every other parameter.
 *
 * The empty filter deletes the parameter, so an index page that has never been
 * typed in keeps the clean URL it was published with.
 */
export const componentIndexSearch = (query: string, search = ""): string => {
  const params = new URLSearchParams(search);
  const value = indexQueryValue(query);

  if (value.length === 0) params.delete(componentIndexParam);
  else params.set(componentIndexParam, value);

  const next = params.toString();
  return next.length === 0 ? "" : `?${next}`;
};
