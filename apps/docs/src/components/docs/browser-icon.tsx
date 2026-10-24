import { icons, type IconName } from "@gpuixui/icons";
import { galleryMarkup } from "@/lib/icon-gallery";

/**
 * An icon, painted by the browser.
 *
 * `@gpuixui/icons` ships markup, not a React component: GPUix paints the string
 * itself, and a preview borrows the same string rather than a second drawing of
 * the glyph. The ink is `currentColor`, so a tile, a row and a toolbar tint the
 * one shape from the colour of the box it sits in.
 *
 * `aria-hidden` is always set. An icon's name is the control's label, never the
 * glyph's, so a preview reads the label and skips the picture — the rule the
 * package's `Icon` applies when it is given no `label`.
 */

/** The markup for one icon, in the ink of the box it sits in. */
export const iconMarkup = (name: IconName): string =>
  galleryMarkup(icons[name]);

/** One glyph out of the accessibility tree, in the surrounding ink. */
export function BrowserIcon({
  name,
  className,
}: {
  readonly name: IconName;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className ?? "block size-4"}
      dangerouslySetInnerHTML={{ __html: iconMarkup(name) }}
    />
  );
}
