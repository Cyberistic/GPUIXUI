/**
 * `ScrollArea` — the one scroll container.
 *
 * The runtime paints the scrollbar from the platform theme and exposes no
 * `scrollbarColor` or `scrollbarWidth` (plan 020 §1.2), so this is only the
 * overflow axes and the caller's bounded size. It is deliberately a `<div>`:
 * the runtime has no separate scroller element.
 *
 * The resting appearance is a Tailwind recipe (`recipe/scrollClass`), compiled
 * through `@gpuixui/tw`; the caller's `className` is joined last so it wins
 * conflicts exactly as `cn` resolves them.
 */

import type { ReactElement, ReactNode } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { ScrollSpec } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { scrollClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface ScrollAreaProps extends ScrollSpec {
  /**
   * A wheel/trackpad scroll, as the runtime reports it: `deltaX`/`deltaY`,
   * `precise` and `touchPhase`. There is **no absolute offset** — a consumer
   * accumulates deltas itself.
   */
  readonly onScroll?: (event: EventPayload) => void;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderScrollArea = (
  {
    axis = "vertical",
    onScroll,
    style,
    className,
    children,
    testId,
  }: ScrollAreaProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(scrollClass(axis), className),
    theme,
  );
  return (
    <div
      testId={testId}
      onScroll={onScroll}
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </div>
  );
};

/** A container that scrolls on the chosen axes. Give it a bounded size. */
export const ScrollArea = (props: ScrollAreaProps): ReactElement =>
  renderScrollArea(props, useTheme());
