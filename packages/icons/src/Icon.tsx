import type { ReactElement } from "react";
import type { StyleDesc, SvgProps } from "@gpuix/react";
import { icons } from "./registry.js";
import type { IconName } from "./names.js";
import { iconPixels, type IconSize } from "./sizes.js";

export interface IconProps {
  /** Which icon to paint. */
  name: IconName;
  /**
   * Tint. GPUix paints a monochrome `<svg>` in `style.color`, so the icon
   * always needs a colour from the surrounding design system — pass a theme
   * role such as `theme.colors.mutedForeground`. Text and Button supply their
   * own tone; only a standalone icon needs this spelled out.
   */
  color: string;
  /** A name in the size scale, or a raw pixel count. Defaults to `"md"`. */
  size?: IconSize | number;
  /**
   * Accessible name. Give one when the icon is the only content of a control;
   * omit it — or pass a blank string — for decoration, which takes the icon out
   * of the accessibility tree. A real name is trimmed.
   */
  label?: string;
  /** Stable locator for automation. */
  testId?: string;
  /**
   * Extra paint or layout, merged last — the same caller-style contract as
   * every primitive. Use it to nudge an icon onto a text baseline; overriding
   * only `width` stretches the mark, because `size` supplies both axes.
   */
  style?: StyleDesc;
}

/**
 * A single monochrome icon.
 *
 * GPUix renders `SvgProps.source` — raw markup — natively, so an icon is data
 * here, not a component tree: no `<path>` children, no icon font, no CSS. Size
 * comes from `style.width`/`height`; tint from `style.color`. A caller's
 * `style` is merged **last**, so an icon can be nudged onto a baseline without
 * a wrapper — and it cannot change the role or the name, which come from
 * `label` (a blank label leaves the icon decorative).
 */
export const Icon = ({
  name,
  color,
  size = "md",
  label,
  testId,
  style: override,
}: IconProps): ReactElement<SvgProps> => {
  const pixels = iconPixels(size);
  const accessibleName = label?.trim();
  const named = accessibleName !== undefined && accessibleName.length > 0;
  const style: NonNullable<SvgProps["style"]> = {
    width: pixels,
    height: pixels,
    flexShrink: 0,
    color,
    // An icon inside a control must not steal the press from it.
    pointerEvents: "none",
    ...override,
  };
  return (
    <svg
      source={icons[name]}
      role={named ? "img" : "presentation"}
      aria-label={named ? accessibleName : undefined}
      testId={testId}
      style={style}
    />
  );
};

export type { IconSize };
