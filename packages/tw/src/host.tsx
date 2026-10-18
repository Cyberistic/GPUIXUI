/**
 * The one host wrapper the JSX runtime inserts when an element carries
 * `className`. It reads the nearest theme, resolves the class string, and
 * renders the original GPUix host element with the merged `style`.
 */

import { createElement, type ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { classesToStyle, mergeTwStyle } from "./classes.js";

/** Props for the inserted wrapper. */
export interface TwHostProps {
  readonly as: string;
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly [key: string]: unknown;
}

/** The wrapper the runtime returns for a classed host element. */
export const TwHost = ({
  as,
  className,
  style,
  children,
  ...rest
}: TwHostProps) => {
  const theme = useTheme();
  const tw = classesToStyle(className, theme);
  return createElement(
    as,
    { ...rest, style: mergeTwStyle(tw.style, style ?? {}) },
    children,
  );
};
