/**
 * `ScrollArea` — the one scroll container.
 *
 * The runtime paints the scrollbar from the platform theme and exposes no
 * `scrollbarColor` or `scrollbarWidth` (plan 020 §1.2), so this is only the
 * overflow axes and the caller's bounded size. It is deliberately a `<div>`:
 * the runtime has no separate scroller element.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { scrollStyle, type ScrollSpec } from "../core/style.js";
import { mergeStyle } from "./internal.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { useTheme } from "./ThemeProvider.js";

export interface ScrollAreaProps extends ScrollSpec {
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderScrollArea = (
  { axis = "vertical", style, children, testId }: ScrollAreaProps,
  _theme: PrimitiveTheme,
): ReactElement => (
  <div testId={testId} style={mergeStyle(scrollStyle({ axis }), style)}>
    {children}
  </div>
);

/** A container that scrolls on the chosen axes. Give it a bounded size. */
export const ScrollArea = (props: ScrollAreaProps): ReactElement =>
  renderScrollArea(props, useTheme());
