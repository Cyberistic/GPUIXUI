/**
 * `Tooltip` — a short label on hover or keyboard focus.
 *
 * GPUix 0.11.0 ships the whole mechanism — the anchored layer, the open delay,
 * the dismiss-on-escape and the provider defaults (plan 020 §1.5) — so this is
 * a themed wrapper, not a reimplementation. Its job is that a tooltip cannot
 * drift from the rest of the system: the content wears the popover surface and
 * the caption type, and the trigger is `asChild`, because a tooltip describes
 * whatever element it wraps rather than introducing one of its own.
 *
 * The trigger also carries the tip as its `aria-description` (GPUix 0.11.0 has
 * no `aria-describedby`), cloned onto the host element the caller supplies.
 *
 * **Limitation:** the trigger must be a focusable host element for the keyboard
 * behaviour to work, and the runtime reports focus without saying how it arrived,
 * so a tooltip opened by a mouse press looks the same as one opened by Tab.
 *
 * The resting appearance is a Tailwind recipe (`recipe/tooltipClass`), compiled
 * through `@gpuixui/tw`.
 */

import {
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
  /** The element the tooltip describes. It must be focusable. */
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

/**
 * The trigger with its description attached.
 *
 * GPUix 0.11.0 has `aria-description` but no `aria-describedby`, so the tip is
 * published by cloning the host trigger. A component trigger that does not
 * forward the prop cannot carry it — the documented contract is a host element.
 */
const describedTrigger = (
  children: ReactNode,
  text: string | undefined,
): ReactNode =>
  text === undefined ||
  !isValidElement<Record<string, unknown>>(children) ||
  typeof children.type !== "string"
    ? children
    : cloneElement(children, { "aria-description": text });

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
