import { useEffect, useState } from "react";
import { Link } from "fumadocs-core/link";
import {
  components,
  groups,
  tierGroupTitle,
  type ComponentGroup,
} from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { supportLegend, supportMeaning } from "@/component-meta/support";
import { aliasesFor } from "@/lib/component-aliases";

const card =
  "flex flex-col gap-1 rounded-lg border border-fd-border bg-fd-card p-3";

/**
 * Whether a component matches a filter query. Case-insensitive and whitespace
 * trimmed; an empty query matches everything because every string contains "".
 * The record's documented props types, exported part names, limitations and
 * reader vocabulary are searched too: a reader who knows `ButtonProps`,
 * `TabsList`, the `aria-checked` gap that decides their adoption, or the word
 * `textbox` finds the component without leaving the index (plans 454, 481 and
 * 566). Exported for the test: server-rendered markup can only prove the
 * initial state.
 */
export const matchesComponent = (
  component: ComponentMetaInput,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  return [
    component.title,
    component.summary,
    ...component.api,
    ...component.parts.map((part) => part.name),
    ...component.limitations,
    ...aliasesFor(component.slug),
  ].some((field) => field.toLowerCase().includes(needle));
};

/** The registry groups that survive a query; empty groups are dropped. */
export const filterGroups = (query: string): ReadonlyArray<ComponentGroup> =>
  groups.flatMap((group) => {
    const items = group.items.filter((item) => matchesComponent(item, query));
    return items.length === 0 ? [] : [{ ...group, items }];
  });

/** The facet the index can add beside its text filter. */
export type PreviewFilter = "all" | "live";

/** A record carries a live GPUix surface exactly when it declares a scene. */
export const isLiveComponent = (component: ComponentMetaInput): boolean =>
  component.liveScene !== null;

/**
 * Keeps the groups whose records carry a live scene (plan 570). `liveScene` is
 * the same field `<NativePreview>` reads, so the facet cannot drift from the
 * tier a page renders; an empty group is dropped like the text filter's.
 */
export const filterByPreview = (
  filtered: ReadonlyArray<ComponentGroup>,
  filter: PreviewFilter,
): ReadonlyArray<ComponentGroup> =>
  filter === "all"
    ? filtered
    : filtered.flatMap((group) => {
        const items = group.items.filter(isLiveComponent);
        return items.length === 0 ? [] : [{ ...group, items }];
      });

/** The facet a deep link carried (`/docs/components?preview=live`). */
export const previewQueryFromSearch = (search: string): PreviewFilter =>
  new URLSearchParams(search).get("preview") === "live" ? "live" : "all";

/** Mirrors the facet into `?preview=live`, keeping `q` and `platform`. */
export const withPreviewFilter = (
  search: string,
  filter: PreviewFilter,
): string => {
  const params = new URLSearchParams(search);
  if (filter === "all") params.delete("preview");
  else params.set("preview", "live");
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};

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
            title={supportMeaning[component.gpuix]}
          >
            {component.gpuix}
          </span>
          {isLiveComponent(component) ? (
            <span
              className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
              data-preview="live"
              title="This page carries a live GPUix surface: the real component code on the published WebAssembly renderer, not the desktop binary."
            >
              Live
            </span>
          ) : null}
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
 * The filter searches everything the record proves: title, summary, documented
 * props types and limitations. It is local because the registry is small and
 * Fumadocs' full-text index never sees these rendered records.
 */
export function ComponentIndex() {
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<PreviewFilter>("all");
  const visible = filterByPreview(filterGroups(query), preview);
  const visibleCount = visible.reduce(
    (count, group) => count + group.items.length,
    0,
  );
  const liveCount = components.filter(isLiveComponent).length;

  // A search result or a shared facet carries its state in the URL; apply it
  // after mount so the server render stays deterministic.
  useEffect(() => {
    setQuery(filterQueryFromSearch(window.location.search));
    setPreview(previewQueryFromSearch(window.location.search));
  }, []);

  const replaceSearch = (search: string) =>
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search}${window.location.hash}`,
    );

  const updateQuery = (next: string) => {
    setQuery(next);
    replaceSearch(withFilterQuery(window.location.search, next));
  };

  const updatePreview = (next: PreviewFilter) => {
    setPreview(next);
    replaceSearch(withPreviewFilter(window.location.search, next));
  };

  const chip = (active: boolean) =>
    `rounded-md border border-fd-border px-2 py-1 text-sm ${
      active ? "bg-fd-accent" : "hover:bg-fd-accent"
    }`;

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
          placeholder="Filter by name, summary, props type or limitation…"
          autoComplete="off"
          aria-describedby="component-filter-count"
          className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
        />
        <div role="group" aria-label="Preview" className="flex flex-wrap gap-2">
          <button
            type="button"
            data-preview-filter="all"
            aria-pressed={preview === "all"}
            onClick={() => updatePreview("all")}
            className={chip(preview === "all")}
          >
            All components ({components.length})
          </button>
          <button
            type="button"
            data-preview-filter="live"
            aria-pressed={preview === "live"}
            onClick={() => updatePreview("live")}
            className={chip(preview === "live")}
          >
            Live surface ({liveCount})
          </button>
        </div>
        <p
          id="component-filter-count"
          aria-live="polite"
          className="text-sm text-fd-muted-foreground"
        >
          {visibleCount} of {components.length} components
        </p>
        <p className="text-sm text-fd-muted-foreground">
          The second badge is the inventory's GPUix-support word:{" "}
          {supportLegend.map(({ value, meaning }, index) => (
            <span key={value}>
              <code>{value}</code> {meaning}
              {index < supportLegend.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-fd-border p-4">
          <p className="text-sm">No component matches “{query.trim()}”.</p>
          <button
            type="button"
            onClick={() => {
              updateQuery("");
              updatePreview("all");
            }}
            className="rounded-md border border-fd-border px-2 py-1 text-sm hover:bg-fd-accent"
          >
            Clear filter
          </button>
        </div>
      ) : (
        visible.map((group) => (
          <section key={`${group.tier}-${group.group}`}>
            <h2 className="mb-3 text-lg font-medium">
              {tierGroupTitle(group.tier, group.group)}
            </h2>
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
