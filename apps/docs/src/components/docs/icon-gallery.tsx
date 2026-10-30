import { useIndexQuery } from "./use-index-query";
import {
  filterIcons,
  galleryIcons,
  type GalleryIcon,
} from "../../lib/icon-gallery";

/**
 * Every icon the set publishes, drawn from the markup the package ships.
 *
 * The gallery is the visual half of the icon set: the [Icons page](/icons/icon)
 * carries the API, the size scale and the accessibility rules, while this grid
 * answers "what does `git-branch` look like". The geometry is the package's own,
 * so a glyph cannot be redrawn from memory; the paint section of
 * `lib/icon-gallery.ts` explains the one edit.
 *
 * The filter travels in `?q=` like the component index's, so a narrowed set is
 * a view a reader can link.
 */
export function IconGallery() {
  const { query, chooseQuery } = useIndexQuery();

  return <IconGalleryView onQueryChange={chooseQuery} query={query} />;
}

/** The gallery's markup, with the filter the mount read off the URL. */
export function IconGalleryView({
  query,
  onQueryChange,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}) {
  const matches = filterIcons(galleryIcons, query);

  return (
    <div className="not-prose my-6">
      <label className="block">
        <span className="sr-only">Filter icons by name</span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by name — try “arrow”, “file”, “panel”"
          type="search"
          value={query}
        />
      </label>
      <p
        aria-live="polite"
        className="m-0 my-3 font-mono text-xs text-muted-foreground"
        role="status"
      >
        {`${matches.length} of ${galleryIcons.length} icons`}
      </p>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No icon matches “{query.trim()}”. Try a shorter word, or the search
          box at the top of the page.
        </p>
      ) : (
        <ul className="gx-icon-gallery grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4 md:grid-cols-6">
          {matches.map((icon) => (
            <IconTile icon={icon} key={icon.name} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One cell: the glyph, out of the accessibility tree, over its name. */
function IconTile({ icon }: { readonly icon: GalleryIcon }) {
  return (
    <li className="m-0">
      <figure className="m-0 flex flex-col items-center gap-2 rounded-xl border border-border px-2 py-3 text-foreground">
        <span
          aria-hidden="true"
          className="block size-6"
          dangerouslySetInnerHTML={{ __html: icon.markup }}
        />
        <figcaption className="max-w-full truncate font-mono text-[0.65rem] text-muted-foreground">
          {icon.name}
        </figcaption>
      </figure>
    </li>
  );
}
