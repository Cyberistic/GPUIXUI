import { useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  indexQueryFromSearch,
  indexQuerySearch,
} from "../../lib/component-index-query";

export function useIndexQuery(): {
  readonly query: string;
  readonly chooseQuery: (query: string) => void;
} {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const [query, setQuery] = useState(() => indexQueryFromSearch(search));

  const chooseQuery = useCallback((next: string) => {
    setQuery(next);

    const url = new URL(window.location.href);
    url.search = indexQuerySearch(next, url.search);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return { query, chooseQuery };
}
