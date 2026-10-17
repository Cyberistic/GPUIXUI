import { useEffect, useState } from "react";
import { Link } from "fumadocs-core/link";
import {
  components,
  groups,
  tierGroupTitle,
  type ComponentGroup,
} from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";

const card =
  "flex flex-col gap-1 rounded-lg border border-fd-border bg-fd-card p-3";

/**
 * Whether a component matches a filter query. Case-insensitive and whitespace
 * trimmed; an empty query matches everything because every string contains "".
 * Exported for the test: server-rendered markup can only prove the initial
 * state.
 */
export const matchesComponent = (
  component: ComponentMetaInput,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  return (
    component.title.toLowerCase().includes(needle) ||
    component.summary.toLowerCase().includes(needle)
  );
};

/** The registry groups that survive a query; empty groups are dropped. */
export const filterGroups = (query: string): ReadonlyArray<ComponentGroup> =>
  groups.flatMap((group) => {
    const items = group.items.filter((item) => matchesComponent(item, query));
    return items.length === 0 ? [] : [{ ...group, items }];
  });

/** The filter a search result arrives with (`/docs/components?q=Dialogs`). */
export const filterQueryFromSearch = (search: string): string =>
  new URLSearchParams(search).get("q")?.trim() ?? "";

/** Mirrors the filter into `?q=`, keeping unrelated parameters (e.g. platform). */
export const withFilterQuery = (search: string, query: string): string => {
  const params = new URLSearchParams(search);
  const trimmed = query.trim();
  if (trimmed === "") params.delete("q");
  else params.set("q", trimmed);
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};

function Card({ component }: { component: ComponentMetaInput }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{component.title}</span>
        <span className="flex shrink-0 gap-1">
          <span
            className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
            data-status={component.status}
          >
            {component.status}
          </span>
          <span
            className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
            data-gpuix={component.gpuix}
          >
            {component.gpuix}
          </span>
        </span>
      </span>
      <span className="text-sm text-fd-muted-foreground">
        {component.summary}
      </span>
    </>
  );
}

/**
 * The component index, generated from the registry (plans 411 and 417). Only a
 * record that has left `planned` has a page (`registry.test.ts` enforces that
 * pairing), so a planned entry renders as plain text — the index must never
 * offer a link to a page that does not exist.
 *
 * The filter searches titles and summaries. It is local because the registry is
 * small and Fumadocs' full-text index never sees these rendered records.
 */
export function ComponentIndex() {
  const [query, setQuery] = useState("");
  const visible = filterGroups(query);
  const visibleCount = visible.reduce(
    (count, group) => count + group.items.length,
    0,
  );

  // The search result already carried the filter in `?q=`; apply it after
  // mount so the server render stays deterministic.
  useEffect(() => {
    setQuery(filterQueryFromSearch(window.location.search));
  }, []);

  const updateQuery = (next: string) => {
    setQuery(next);
    const search = withFilterQuery(window.location.search, next);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search}${window.location.hash}`,
    );
  };

  return (
    <div className="not-prose flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="component-filter" className="text-sm font-medium">
          Filter components
        </label>
        <input
          id="component-filter"
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Filter by name or summary…"
          autoComplete="off"
          aria-describedby="component-filter-count"
          className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
        />
        <p
          id="component-filter-count"
          aria-live="polite"
          className="text-sm text-fd-muted-foreground"
        >
          {visibleCount} of {components.length} components
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-fd-border p-4">
          <p className="text-sm">No component matches “{query.trim()}”.</p>
          <button
            type="button"
            onClick={() => updateQuery("")}
            className="rounded-md border border-fd-border px-2 py-1 text-sm hover:bg-fd-accent"
          >
            Clear filter
          </button>
        </div>
      ) : (
        visible.map((group) => (
          <section key={`${group.tier}-${group.group}`}>
            <h3 className="mb-3 text-lg font-medium">
              {tierGroupTitle(group.tier, group.group)}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((component) => (
                <li key={component.slug}>
                  {component.status === "planned" ? (
                    <div className={card}>
                      <Card component={component} />
                    </div>
                  ) : (
                    <Link
                      href={`/docs/components/${component.slug}`}
                      className={`${card} hover:bg-fd-accent`}
                    >
                      <Card component={component} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
