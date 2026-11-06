export const indexQueryParam = "q";

export const indexQueryFromSearch = (search: string): string =>
  new URLSearchParams(search).get(indexQueryParam) ?? "";

export const indexQueryValue = (query: string): string => query.trim();

export const indexQuerySearch = (query: string, search = ""): string => {
  const params = new URLSearchParams(search);
  const value = indexQueryValue(query);

  if (value.length === 0) params.delete(indexQueryParam);
  else params.set(indexQueryParam, value);

  const next = params.toString();
  return next.length === 0 ? "" : `?${next}`;
};
