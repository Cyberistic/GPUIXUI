/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { MotionProps, StyleDesc, SvgProps } from "@gpuix/react";
import { rotatedIconMarkup } from "./registry.js";
import type { IconName } from "./names.js";
import { iconPixels, type IconSize } from "./sizes.js";

export interface IconProps {
  readonly name: IconName;

  readonly color: string;

  size?: IconSize | number;

  label?: string;

  testId?: string;

  readonly rotation?: number;

  readonly motion?: MotionProps;

  readonly style?: StyleDesc;
}

const iconLabel = (label: string | undefined): string | undefined => {
  const trimmed = label?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

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
