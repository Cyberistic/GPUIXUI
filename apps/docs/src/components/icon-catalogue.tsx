import { useState } from "react";
import { iconCatalogue } from "@/lib/icon-catalogue.generated";

/**
 * The icon set's lookup table (plan 507). The Icons page names an `IconName`
 * type and, without this, listed none of the 48 names it admits — so a reader
 * could not get from "there is a `name` prop" to `chevrons-up-down`.
 *
 * Each tile draws the package's **own** markup, generated into
 * `icon-catalogue.generated.ts` at build time. It is a browser drawing of the
 * same strings the runtime paints, labelled as such on the page; the native
 * evidence stays the live scene and the runtime suite.
 */

/**
 * GPUix's `<svg source>` tints a monochrome icon with `style.color`; the markup
 * carries `#000` as the replaceable paint. The browser has no such pass, so the
 * catalogue performs the same documented substitution — otherwise every tile
 * would paint black in the dark theme. Exported for its test.
 */
export const browserMarkup = (markup: string): string =>
  markup.replaceAll("#000", "currentColor");

/** Names matching a filter query; an empty query matches every icon. */
export const filterIcons = (
  query: string,
): ReadonlyArray<(typeof iconCatalogue)[number]> => {
  const needle = query.trim().toLowerCase();
  return iconCatalogue.filter((icon) => icon.name.includes(needle));
};

export function IconCatalogue() {
  const [query, setQuery] = useState("");
  const visible = filterIcons(query);

  return (
    <div className="not-prose flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="icon-filter" className="text-sm font-medium">
          Filter icons
        </label>
        <input
          id="icon-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name…"
          autoComplete="off"
          aria-describedby="icon-filter-count"
          className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
        />
        <p
          id="icon-filter-count"
          aria-live="polite"
          className="text-sm text-fd-muted-foreground"
        >
          {visible.length} of {iconCatalogue.length} icons
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-fd-border p-4">
          <p className="text-sm">No icon is named “{query.trim()}”.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-md border border-fd-border px-2 py-1 text-sm hover:bg-fd-accent"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((icon) => (
            <li
              key={icon.name}
              className="flex items-center gap-2 rounded-lg border border-fd-border p-2 text-fd-muted-foreground [&_svg]:size-5 [&_svg]:shrink-0"
            >
              <span
                aria-hidden="true"
                className="flex"
                dangerouslySetInnerHTML={{ __html: browserMarkup(icon.markup) }}
              />
              <code className="text-xs">{icon.name}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
