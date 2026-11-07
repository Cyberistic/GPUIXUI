import { ICON_NAMES, icons, type IconName } from "@gpuixui/icons";

export interface GalleryIcon {
  readonly name: IconName;

  readonly markup: string;
}

export const reservedPaint = 'stroke="#000"';

export const galleryMarkup = (markup: string): string =>
  markup.replace(reservedPaint, 'stroke="currentColor"');

export const galleryIcons: ReadonlyArray<GalleryIcon> = ICON_NAMES.map(
  (name) => ({ name, markup: galleryMarkup(icons[name]) }),
);

export const filterIcons = (
  entries: ReadonlyArray<GalleryIcon>,
  query: string,
): ReadonlyArray<GalleryIcon> => {
  const needle = query.trim().toLowerCase();

  return needle === ""
    ? entries
    : entries.filter((entry) => entry.name.includes(needle));
};
