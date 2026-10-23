import { useEffect, useState } from "react";
import {
  filterEntries,
  verdictMark,
  type ComponentEntry,
} from "../../lib/component-index";
import { componentPages } from "../../lib/component-index-data";
import { demos } from "./demos";
import { PreviewSurface } from "./preview-surface";
import { useIndexQuery } from "./use-index-query";

/**
 * The component index: one tile per component, three across on a desktop.
 *
 * The rows are generated (`component-index-data.ts`), so the grid cannot list a
 * page that does not exist or miss one that does. Each tile is the component's
 * first registered demo, clipped to the card, with its name above it and the
 * whole tile linking to the page. A component with no demo gets a labelled
 * static tile instead of an empty frame.
 *
 * The query only narrows what is already rendered: the unfiltered grid is the
 * complete lane. It matches a page's name, its purpose, the parts it documents,
 * the props and prop types its API table declares, the limits it records and
 * its inventory verdict.
 *
 * The filter travels in the URL (`?q=…`): a view worth sharing is the view a
 * link opens, and a reload keeps it. The mount reads the route's search string
 * so a shared link opens filtered rather than painting the whole grid first.
 *
 * The demos mount after hydration, not during the server render: they carry
 * seeded drawings and live timers, and painting a placeholder first keeps the
 * server markup identical to the client's first pass.
 */
export function ComponentIndex() {
  const { query, chooseQuery } = useIndexQuery();
  const [previews, setPreviews] = useState(false);

  useEffect(() => setPreviews(true), []);

  return (
    <ComponentIndexView
      onQueryChange={chooseQuery}
      previews={previews}
      query={query}
    />
  );
}

/** The index's markup, with the filter the mount read off the URL. */
export function ComponentIndexView({
  query,
  onQueryChange,
  previews = false,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** Whether the demo scenes may mount; false until after hydration. */
  readonly previews?: boolean;
}) {
  const matches = filterEntries(componentPages, query);

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
        {`${matches.length} of ${componentPages.length} components`}
      </p>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No component matches “{query.trim()}”. Try a shorter word, or the
          search box at the top of the page.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-px border border-border bg-border p-0 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((entry) => (
            <ComponentTile entry={entry} key={entry.url} previews={previews} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A tile that has no demo still needs a stable component type. */
const Nothing = () => null;

/** One card: the name above its demo, both inside the link. */
function ComponentTile({
  entry,
  previews,
}: {
  readonly entry: ComponentEntry;
  readonly previews: boolean;
}) {
  const demo = entry.demo === undefined ? undefined : demos[entry.demo];
  // Rendered as its own component: a demo owns hooks, and calling it inline
  // would attribute them to the tile that mounts it conditionally.
  const Scene = demo?.render ?? Nothing;
  const mark = verdictMark(entry.verdict);

  return (
    <li
      className="relative m-0 flex min-w-0 flex-col bg-background"
      data-component={entry.url}
      data-preview={demo === undefined ? "none" : "demo"}
    >
      <a
        className="z-10 flex items-baseline justify-between gap-2 p-3 text-sm font-medium text-foreground no-underline after:absolute after:inset-0 after:content-[''] hover:underline"
        href={entry.url}
      >
        <span>{entry.title}</span>
        {mark === undefined ? null : (
          <span
            className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] font-normal text-muted-foreground"
            title={mark.detail}
          >
            {mark.label}
          </span>
        )}
      </a>
      {demo === undefined ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 border-t border-border p-4 text-center">
          <span className="line-clamp-3 text-xs text-muted-foreground">
            {entry.description}
          </span>
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            No browser preview
          </span>
        </div>
      ) : previews ? (
        <div
          aria-hidden="true"
          className="pointer-events-none flex aspect-[4/3] items-center justify-center overflow-hidden border-t border-border"
          inert
        >
          <PreviewSurface className="gx-grid-preview h-full w-full">
            <Scene />
          </PreviewSurface>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-[4/3] items-center justify-center border-t border-border"
        >
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            Preview
          </span>
        </div>
      )}
    </li>
  );
}
