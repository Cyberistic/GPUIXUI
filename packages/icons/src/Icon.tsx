import type { ReactElement } from "react";
import type { SvgProps } from "@gpuix/react";
import { icons } from "./registry.js";
import type { IconName } from "./names.js";
import { iconPixels, type IconSize } from "./sizes.js";

export interface IconProps {
  /** Which icon to paint. */
  name: IconName;
  /**
   * Tint. GPUix paints a monochrome `<svg>` in `style.color`, so the icon
   * always needs a colour from the surrounding design system — pass a theme
   * role such as `theme.color.mutedForeground`. Text and Button supply their
   * own tone; only a standalone icon needs this spelled out.
   */
  color: string;
  /** A name in the size scale, or a raw pixel count. Defaults to `"md"`. */
  size?: IconSize | number;
  /**
   * Accessible name. Give one when the icon is the only content of a control;
   * omit it for decoration, which takes the icon out of the accessibility tree.
   */
  label?: string;
  /** Stable locator for automation. */
  testId?: string;
}

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
}: IconProps): ReactElement<SvgProps> => {
  const pixels = iconPixels(size);
  const style: NonNullable<SvgProps["style"]> = {
    width: pixels,
    height: pixels,
    flexShrink: 0,
    color,
    // An icon inside a control must not steal the press from it.
    pointerEvents: "none",
  };
  return (
    <svg
      source={icons[name]}
      role={label === undefined ? "presentation" : "img"}
      aria-label={label}
      testId={testId}
      style={style}
    />
  );
};

export type { IconSize };
