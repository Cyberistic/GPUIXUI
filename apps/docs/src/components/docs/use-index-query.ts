import { useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  componentIndexSearch,
  indexQueryFromSearch,
} from "../../lib/component-index-query";

/**
 * A list filter carried in `?q=`.
 *
 * The component index and the icon gallery both narrow a generated list, and a
 * reader who found what they wanted is looking at a view worth linking: the
 * platform switch already writes its state to the address bar (`?platform=`),
 * and a filter follows the same rule. Reading happens in the state initializer
 * so the first paint is already the linked view; writing replaces the address
 * without navigating.
 */
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
    url.search = componentIndexSearch(next, url.search);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return { query, chooseQuery };
}
