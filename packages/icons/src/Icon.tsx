/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { MotionProps, StyleDesc, SvgProps } from "@gpuix/react";
import { rotatedIconMarkup } from "./registry.js";
import type { IconName } from "./names.js";
import { iconPixels, type IconSize } from "./sizes.js";

export interface IconProps {
  /**
   * Which icon to paint. A name the set does not carry paints the `help` mark:
   * `name` is often a stored value, and a registry miss used to paint an empty
   * box inside a live `Image` node (see `iconMarkup`).
   */
  readonly name: IconName;
  /**
   * Tint. GPUix paints a monochrome `<svg>` in `style.color`, so the icon
   * always needs a colour from the surrounding design system — pass a theme
   * role such as `theme.colors.mutedForeground`. Text and Button supply their
   * own tone; only a standalone icon needs this spelled out.
   */
  readonly color: string;
  /** A name in the size scale, or a raw pixel count. Defaults to `"md"`. */
  size?: IconSize | number;
  /**
   * Accessible name. Give one when the icon is the only content of a control;
   * omit it for decoration, which takes the icon out of the accessibility tree.
   */
  label?: string;
  /** Stable locator for automation. */
  testId?: string;
  /**
   * Turn the icon clockwise by this many degrees, about the 24x24 centre.
   *
   * GPUix has no renderer transform and an `<svg>` host ignores one anyway, so
   * the turn is written into the document (`<g transform="rotate(...)">`) and
   * resvg resolves it. `90`, `180` and `270` are exact; any finite angle works.
   */
  readonly rotation?: number;
  /**
   * A tween for the icon's own box.
   *
   * GPUix has no `transform`, so a glyph that grows or turns inside a control
   * animates its **geometry**: `width`/`height` are the size the path scales
   * from and `left`/`top` the inset that keeps it centred. The resting
   * `width`/`height` in `style` stay the frame a reduced run lands on.
   */
  readonly motion?: MotionProps;
  /** Extra style, merged over the icon's own, last. */
  readonly style?: StyleDesc;
}

/**
 * A name worth publishing, or `undefined` for a decorative icon.
 *
 * An empty or whitespace-only label must not promote the icon: `role="img"`
 * with no name is an unnamed image in the tree — a worse announcement than
 * decoration. The primitives package owns the same rule (`accessibleName`), but
 * importing it here would invert the dependency — primitives is built on icons.
 */
const iconLabel = (label: string | undefined): string | undefined => {
  const trimmed = label?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

/**
 * A single monochrome icon.
 *
 * GPUix renders `SvgProps.source` — raw markup — natively, so an icon is data
 * here, not a component tree: no `<path>` children, no icon font, no CSS. Size
 * comes from `style.width`/`height`; tint from `style.color`.
 */
export const Icon = ({
  name,
  color,
  size = "md",
  label,
  testId,
  rotation = 0,
  motion,
  style: extra,
}: IconProps): ReactElement<SvgProps> => {
  const pixels = iconPixels(size);
  const named = iconLabel(label);
  const style: NonNullable<SvgProps["style"]> = {
    width: pixels,
    height: pixels,
    flexShrink: 0,
    color,
    // An icon inside a control must not steal the press from it.
    pointerEvents: "none",
    ...extra,
  };
  return (
    <svg
      source={rotatedIconMarkup(name, rotation)}
      role={named === undefined ? "presentation" : "img"}
      aria-label={named}
      testId={testId}
      motion={motion}
      style={style}
    />
  );
};

export type { IconSize };
