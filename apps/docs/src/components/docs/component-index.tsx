import { useEffect, useState } from "react";
import {
  filterEntries,
  otherLaneMatches,
  verdictMark,
  type ComponentEntry,
} from "../../lib/component-index";
import { componentIndex, componentPages } from "../../lib/component-index-data";
import { demos } from "./demos";
import { PreviewSurface } from "./preview-surface";
import { useIndexQuery } from "./use-index-query";

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

export function ComponentIndexView({
  query,
  onQueryChange,
  previews = false,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;

  readonly previews?: boolean;
}) {
  const matches = filterEntries(componentPages, query);
  const elsewhere = otherLaneMatches(componentIndex, query);

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
        <div
          className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground"
          data-other-lane={elsewhere.length === 0 ? "false" : "true"}
        >
          <p className="m-0">No composed component matches “{query.trim()}”.</p>
          {elsewhere.length === 0 ? (
            <p className="m-0 mt-2">
              Try a shorter word, or the search box at the top of the page.
            </p>
          ) : (
            <>
              <p className="m-0 mt-2">
                {elsewhere.length === 1
                  ? "One lower lane holds it:"
                  : "The lower lanes hold it:"}
              </p>
              <ul className="m-0 mt-2 list-none space-y-1 p-0">
                {elsewhere.map((group) => (
                  <li key={group.lane}>
                    <span className="text-foreground">{group.lane}</span>
                    {" · "}
                    {group.entries.map((entry, position) => (
                      <span key={entry.url}>
                        {position > 0 ? ", " : ""}
                        <a className="underline" href={entry.url}>
                          {entry.title}
                        </a>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
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

const Nothing = () => null;

function ComponentTile({
  entry,
  previews,
}: {
  readonly entry: ComponentEntry;
  readonly previews: boolean;
}) {
  const demo = entry.demo === undefined ? undefined : demos[entry.demo];

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
          <PreviewSurface
            className="gx-grid-preview h-full w-full"
            interactive={false}
          >
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
