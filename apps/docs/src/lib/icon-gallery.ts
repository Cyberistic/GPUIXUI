import { ICON_NAMES } from "../../../../packages/icons/src/names";
import { icons } from "../../../../packages/icons/src/registry";
import type { IconName } from "../../../../packages/icons/src/names";

/**
 * The icon gallery's data.
 *
 * The gallery draws the set's own geometry: `icons` is the record GPUix paints,
 * so a glyph on this page and a glyph in a window are one string. The only edit
 * is the paint — GPUix replaces a monochrome `<svg>`'s stroke with `style.color`
 * and ignores the markup's own value, while a browser honours it, so the gallery
 * asks for `currentColor` and the ink comes from the page it sits on.
 *
 * The two modules are imported rather than the package root on purpose: the
 * root also exports `Icon`, a GPUix host element, and the site compiles with
 * React's JSX runtime — type-checking that component here reports a mismatch
 * between the two runtimes for a component the page never mounts. The data is
 * the package's; `icon-gallery.test.ts` holds these imports to the modules the
 * package's own index publishes.
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
