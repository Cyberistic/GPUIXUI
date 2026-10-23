import { useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { componentIndex } from "../../lib/component-index-data";
import { filterEntries, verdictMark } from "../../lib/component-index";
import {
  componentIndexSearch,
  indexQueryFromSearch,
} from "../../lib/component-index-query";

/**
 * A filterable index of every component and primitive page.
 *
 * The rows are generated (`component-index-data.ts`), so the index cannot list
 * a page that does not exist or miss one that does. The query only narrows what
 * is already rendered: the unfiltered list is the complete section.
 *
 * The query matches a page's name, its purpose, its lane, the parts it
 * documents, the props and prop types its API table declares, the limits it
 * records and its inventory verdict — so a reader who knows the part, the prop,
 * the capability a component lacks or that it is only partly supported finds
 * the page from here.
 *
 * A row whose `COMPONENTS.md` verdict is not whole wears that verdict, because
 * the status strip is on the page the reader has not opened yet.
 *
 * The filter travels in the URL (`?q=…`): a view worth sharing is the view a
 * link opens, and a reload keeps it. The mount reads the route's search string
 * so a shared link opens filtered rather than painting the whole list first.
 */
export function ComponentIndex() {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  // Resolved in the initializer, the rule the platform switch follows: the
  // first render is already the linked view.
  const [query, setQuery] = useState(() => indexQueryFromSearch(search));

  const chooseQuery = useCallback((next: string) => {
    setQuery(next);

    const url = new URL(window.location.href);
    url.search = componentIndexSearch(next, url.search);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return <ComponentIndexView onQueryChange={chooseQuery} query={query} />;
}

/** The index's markup, with the filter the mount read off the URL. */
export function ComponentIndexView({
  query,
  onQueryChange,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}) {
  const matches = filterEntries(componentIndex, query);

  return (
    <div className="not-prose my-6">
      <label className="block">
        <span className="sr-only">
          Filter components by name, part, prop or purpose
        </span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by name, part, prop or limit — try “search”, “DialogFooter”, “onCheckedChange”"
          type="search"
          value={query}
        />
      </label>
      <p
        aria-live="polite"
        className="m-0 my-3 font-mono text-xs text-muted-foreground"
        role="status"
      >
        {`${matches.length} of ${componentIndex.length} pages`}
      </p>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No page matches “{query.trim()}”. Try a shorter word, or the search
          box at the top of the page.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
          {matches.map((entry) => {
            const mark = verdictMark(entry.verdict);
            return (
              <li className="m-0" key={entry.url}>
                <a
                  className="block h-full rounded-xl border border-border px-3 py-2 no-underline transition-colors hover:bg-muted/60"
                  href={entry.url}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {entry.title}
                      {entry.preview ? (
                        <span className="ml-2 rounded border border-border px-1.5 py-0.5 align-middle font-mono text-[0.65rem] font-normal text-muted-foreground">
                          Browser preview
                        </span>
                      ) : null}
                      {mark === undefined ? null : (
                        <span
                          className="ml-2 rounded border border-border px-1.5 py-0.5 align-middle font-mono text-[0.65rem] font-normal text-muted-foreground"
                          title={mark.detail}
                        >
                          {mark.label}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">
                      {entry.section}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {entry.description}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
