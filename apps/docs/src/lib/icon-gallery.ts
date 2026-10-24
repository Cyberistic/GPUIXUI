import { ICON_NAMES, icons, type IconName } from "@gpuixui/icons";

/**
 * The icon gallery's data.
 *
 * The gallery draws the set's own geometry: `icons` is the record GPUix paints,
 * so a glyph on this page and a glyph in a window are one string. The only edit
 * is the paint — GPUix replaces a monochrome `<svg>`'s stroke with `style.color`
 * and ignores the markup's own value, while a browser honours it, so the gallery
 * asks for `currentColor` and the ink comes from the page it sits on.
 *
 * The set is read from the package's public entry, the same surface a consumer
 * imports. Every published `.tsx` in the package pins the GPUix JSX runtime, so
 * the root's `Icon` type-checks in this React program without pulling a host
 * element into a page that never mounts one.
 */

/** One icon as the gallery draws it. */
export interface GalleryIcon {
  readonly name: IconName;
  /** The shipped markup, painted in the surrounding ink. */
  readonly markup: string;
}

/** The paint the icon markup reserves for the host to replace. */
export const reservedPaint = 'stroke="#000"';

/** The markup a browser paints in the page's ink. */
export const galleryMarkup = (markup: string): string =>
  markup.replace(reservedPaint, 'stroke="currentColor"');

/** Every icon the set publishes, in the order the package lists them. */
export const galleryIcons: ReadonlyArray<GalleryIcon> = ICON_NAMES.map(
  (name) => ({ name, markup: galleryMarkup(icons[name]) }),
);

/**
 * The icons a query names.
 *
 * The filter narrows the list rather than searching it: an empty query is the
 * complete set, so the gallery never opens with an icon missing.
 */
export const filterIcons = (
  entries: ReadonlyArray<GalleryIcon>,
  query: string,
): ReadonlyArray<GalleryIcon> => {
  const needle = query.trim().toLowerCase();

  return needle === ""
    ? entries
    : entries.filter((entry) => entry.name.includes(needle));
};
