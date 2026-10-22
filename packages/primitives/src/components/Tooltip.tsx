/**
 * `Tooltip` — a short label on hover or keyboard focus.
 *
 * GPUix 0.11.0 ships the whole mechanism — the anchored layer, the open delay,
 * the dismiss-on-escape and the provider defaults (see `docs/gpuix-capabilities.md`) — so this is
 * a themed wrapper, not a reimplementation. Its job is that a tooltip cannot
 * drift from the rest of the system: the content wears the popover surface and
 * the caption type, and the trigger is `asChild`, because a tooltip describes
 * whatever element it wraps rather than introducing one of its own.
 *
 * The trigger also carries the tip as its `aria-description` (GPUix 0.11.0 has
 * no `aria-describedby`), cloned onto the element the caller supplies. A host
 * element publishes it directly; this package's `Button`/`IconButton` forward
 * it from their own `TooltipTriggerProps`, so an icon action is a trigger.
 *
 * **Limitation:** the runtime dispatches a hover to the element carrying the
 * listener, so the trigger's host element must be the focusable one — a
 * component that forwards neither the trigger handlers nor `tabIndex` cannot
 * open the tip. The runtime reports focus without saying how it arrived, so a
 * tooltip opened by a mouse press looks the same as one opened by Tab.
 *
 * The resting appearance is a Tailwind recipe (`recipe/tooltipClass`), compiled
 * through `@gpuixui/tw`.
 */

import {
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import {
  Tooltip as GpuixTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gpuix/react/tooltip";
import { accessibleName } from "../core/a11y.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { tooltipClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { useTheme } from "./ThemeProvider.js";

export interface TooltipProps {
  /** The label. Keep it short — the runtime does not wrap overlay content. */
  readonly content: ReactNode;
  /**
   * The trigger's accessible description. Defaults to `content` when it is a
   * string; a non-text tip has no description to derive, so pass one here.
   */
  readonly description?: string;
  /**
   * A focusable host element, or a control that forwards
   * `TooltipTriggerProps` (`Button`, `IconButton`).
   */
  readonly children: ReactNode;
  /** Defaults to `top`, the runtime's own default. */
  readonly side?: FloatingSide;
  readonly align?: FloatingAlign;
  /** Milliseconds before the tip opens on hover. Defaults to the provider's. */
  readonly delay?: number;
  readonly testId?: string;
}

/** The tip: the popover surface, the caption type, no wrapping. */
export const tooltipStyle = (theme: PrimitiveTheme): StyleDesc =>
  recipeTw.classesToStyle(tooltipClass, theme).style;

/** The trigger with its description attached. */
const describedTrigger = (
  children: ReactNode,
  text: string | undefined,
): ReactNode => {
  const name = accessibleName(text);
  return name === undefined ||
    !isValidElement<Record<string, unknown>>(children) ||
    children.type === Fragment
    ? children
    : cloneElement(children, { "aria-description": name });
};

/** The element tree `Tooltip` renders. Pure in its arguments. */
export const renderTooltip = (
  { content, description, children, side, align, delay, testId }: TooltipProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <GpuixTooltip delayDuration={delay}>
    <TooltipTrigger asChild>
      {describedTrigger(
        children,
        description ?? (typeof content === "string" ? content : undefined),
      )}
    </TooltipTrigger>
    <TooltipContent
      side={side}
      align={align}
      style={tooltipStyle(theme)}
      testId={testId}
    >
      {content}
    </TooltipContent>
  </GpuixTooltip>
);

/** A short label shown when its trigger is hovered or focused. */
export const Tooltip = (props: TooltipProps): ReactElement =>
  renderTooltip(props, useTheme());
