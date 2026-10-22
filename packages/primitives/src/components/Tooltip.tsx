/**
 * `Tooltip` — a short label on hover.
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
 * element publishes it directly; this package's `Button`/`IconButton`/`Toggle` forward
 * it from their own `TooltipTriggerProps`, so an action or a mode is a trigger.
 *
 * **Limitations:** the runtime dispatches a hover to the element carrying the
 * listener, so the trigger's host element must be the focusable one — a
 * component that forwards neither the trigger handlers nor `tabIndex` cannot
 * open the tip. The runtime opens a tip from the focus event, and a window's
 * `Tab` traversal moves the focus without running the trigger's `onFocus`
 * (measured three times on 0.11.0), so hover is the only open path a window
 * offers; the offscreen `TestRenderer` does dispatch the event. The runtime
 * reports focus without saying how it arrived, so a mouse-opened and a
 * keyboard-opened tip would look the same.
 *
 * The open state is the runtime's unless the caller takes it: `open` makes the
 * tip paint only while it is `true`, and `onOpenChange` reports every request
 * the trigger makes in both modes, so a guided hint can be held open or opened
 * from code.
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
import { cn } from "@gpuixui/tw";
import {
  Tooltip as GpuixTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gpuix/react/tooltip";
import { accessibleName } from "../core/a11y.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { tooltipClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
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
   * `TooltipTriggerProps` (`Button`, `IconButton`, `Toggle`).
   */
  readonly children: ReactNode;
  /** Defaults to `top`, the runtime's own default. */
  readonly side?: FloatingSide;
  readonly align?: FloatingAlign;
  /** Milliseconds before the tip opens on hover. Defaults to the provider's. */
  readonly delay?: number;
  /**
   * Take the open state. With it the tip paints only while this is `true`; the
   * trigger still asks to open and close (hover, focus, Escape, a press) and
   * every request reaches `onOpenChange`, but the caller decides.
   */
  readonly open?: boolean;
  /** Open on mount, before any interaction. Ignored while `open` is set. */
  readonly defaultOpen?: boolean;
  /** Called with the state the runtime asked for, controlled or not. */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Close as soon as the pointer leaves the trigger, so the tip itself cannot
   * be hovered. Defaults to the runtime's `false`, where the tip stays open
   * while the pointer crosses the gap onto it.
   */
  readonly disableHoverableContent?: boolean;
  /**
   * Extra style on the tip's surface, merged after the recipe and after
   * `className`, so a caller's value is the last word.
   */
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * The tip's surface: the popover role, the caption type and one spacing inset.
 *
 * The text is painted in `popoverForeground`, the role that surface carries —
 * `popoverForeground` on `popover` is one of the measured pairs — rather than
 * inherited from whatever element the anchored layer sits under, which is a
 * colour the wrapper cannot see and nothing checks.
 *
 * A caller's `className` is joined after the recipe and their `style` is merged
 * last, the same order every other primitive uses.
 */
export const tooltipStyle = (
  theme: PrimitiveTheme,
  className?: string,
  caller?: StyleDesc,
): StyleDesc =>
  mergeStyle(
    recipeTw.classesToStyle(cn(tooltipClass, className), theme).style,
    caller,
  );

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
  {
    content,
    description,
    children,
    side,
    align,
    delay,
    open,
    defaultOpen,
    onOpenChange,
    disableHoverableContent,
    style,
    className,
    testId,
  }: TooltipProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <GpuixTooltip
    delayDuration={delay}
    open={open}
    defaultOpen={defaultOpen}
    onOpenChange={onOpenChange}
    disableHoverableContent={disableHoverableContent}
  >
    <TooltipTrigger asChild>
      {describedTrigger(
        children,
        description ?? (typeof content === "string" ? content : undefined),
      )}
    </TooltipTrigger>
    <TooltipContent
      side={side}
      align={align}
      style={tooltipStyle(theme, className, style)}
      testId={testId}
    >
      {content}
    </TooltipContent>
  </GpuixTooltip>
);

/** A short label shown when its trigger is hovered. */
export const Tooltip = (props: TooltipProps): ReactElement =>
  renderTooltip(props, useTheme());
