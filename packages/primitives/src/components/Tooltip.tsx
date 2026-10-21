/**
 * `Tooltip` — a short label on hover or keyboard focus.
 *
 * GPUix 0.10.0 ships the whole mechanism — the anchored layer, the open delay,
 * the dismiss-on-escape and the provider defaults (plan 020 §1.5) — so this is
 * a themed wrapper, not a reimplementation. Its job is that a tooltip cannot
 * drift from the rest of the system: the content wears the popover surface and
 * the caption type, and the trigger is `asChild`, because a tooltip describes
 * whatever element it wraps rather than introducing one of its own.
 *
 * **Limitation:** the trigger must be a focusable element for the keyboard
 * behaviour to work, and the runtime reports focus without saying how it arrived,
 * so a tooltip opened by a mouse press looks the same as one opened by Tab.
 *
 * The resting appearance is a Tailwind recipe (`recipe/tooltipClass`), compiled
 * through `@gpuixui/tw`.
 */

import type { ReactElement, ReactNode } from "react";
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

/** The element tree `Tooltip` renders. Pure in its arguments. */
export const renderTooltip = (
  { content, children, side, align, delay, testId }: TooltipProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <GpuixTooltip delayDuration={delay}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
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
