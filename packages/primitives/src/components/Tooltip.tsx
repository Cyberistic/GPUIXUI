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
 * The open state is the caller's, or the wrapper's mirror of the trigger's own
 * requests: `open` makes the tip paint only while it is `true`, and
 * `onOpenChange` reports every request the trigger makes in both modes, so a
 * guided hint can be held open or opened from code. The wrapper mirrors the
 * runtime's state because a dismissed tip is held for its exit tween (see
 * `core/presence.ts`); the mirror is not a second source of truth — it reports
 * what the trigger asked for and adds only the exit window. `TooltipProvider` is
 * the group timing: a toolbar gives one
 * `delay`/`skipDelay`/`disableHoverableContent` to every tip below it, and a
 * tip's own `delay` still wins.
 *
 * The resting appearance is a Tailwind recipe (`recipe/tooltipClass`), compiled
 * through `@gpuixui/tw`.
 */

import {
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { MotionProps, StyleDesc } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { useMotionPreference } from "@gpuixui/motion/react";
import { cn } from "@gpuixui/tw";
import {
  Tooltip as GpuixTooltip,
  TooltipContent,
  TooltipProvider as GpuixTooltipProvider,
  TooltipTrigger,
} from "@gpuix/react/tooltip";
import { accessibleName } from "../core/a11y.js";
import { reducedMotionOf } from "../core/motion.js";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceStyle,
  surfaceMotion,
  surfaceTiming,
  type AnchorSide,
  type SurfaceTiming,
} from "../core/presence.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { tooltipClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** Props for a group of tips that share one timing. */
export interface TooltipProviderProps {
  /**
   * Milliseconds before a tip opens. Defaults to the runtime's `0`, which opens
   * immediately; a toolbar usually wants a short delay so a pointer crossing it
   * does not flash every label.
   */
  readonly delay?: number;
  /**
   * The window after a tip closed in which the next one opens with no wait.
   * Defaults to the runtime's `300`. This is what makes adjacent tips feel like
   * one surface rather than a queue.
   */
  readonly skipDelay?: number;
  /**
   * Close as soon as the pointer leaves the trigger, for every tip below it, so
   * the tip itself cannot be hovered. Defaults to the runtime's `false`.
   */
  readonly disableHoverableContent?: boolean;
  readonly children: ReactNode;
}

/**
 * One timing for every tip below it.
 *
 * The runtime already reads a `delayDuration`, `skipDelayDuration` and
 * `disableHoverableContent` from its provider, but this package did not expose
 * the provider, so the only way to give a toolbar one delay was to import the
 * runtime's component directly and bypass the package's API. A tip's own
 * `delay` still wins; this is the default every other tip reads.
 */
export const renderTooltipProvider = ({
  delay,
  skipDelay,
  disableHoverableContent,
  children,
}: TooltipProviderProps): ReactElement => (
  <GpuixTooltipProvider
    delayDuration={delay}
    skipDelayDuration={skipDelay}
    disableHoverableContent={disableHoverableContent}
  >
    {children}
  </GpuixTooltipProvider>
);

/** One timing for every `Tooltip` below it. */
export const TooltipProvider = (props: TooltipProviderProps): ReactElement =>
  renderTooltipProvider(props);

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
   * The reader asked for less motion. Defaults to the motion provider's
   * preference (`MotionProvider`), and this prop is the per-tip override.
   *
   * The runtime exposes no preference of its own, so the application owns it,
   * exactly as it owns the theme mode: a reduced tip still paints every frame —
   * the resting one arrives without a journey, and a close unmounts at once
   * instead of holding the exit.
   */
  readonly reducedMotion?: boolean;
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

/**
 * The trigger with its description attached.
 *
 * A trigger that already announces help of its own keeps it: that text is the
 * control's permanent description (a field's validation hint, a setting's
 * explanation) and a short tip does not replace it just because the pointer
 * arrived. An explicit `description` is the caller naming the tip as the
 * trigger's description, so it wins.
 */
const describedTrigger = (
  children: ReactNode,
  text: string | undefined,
  explicit: boolean,
): ReactNode => {
  const name = accessibleName(text);
  if (
    name === undefined ||
    !isValidElement<Record<string, unknown>>(children) ||
    children.type === Fragment
  ) {
    return children;
  }
  const own = children.props["aria-description"];
  const ownName = typeof own === "string" ? accessibleName(own) : undefined;
  return explicit || ownName === undefined
    ? cloneElement(children, { "aria-description": name })
    : children;
};

/**
 * What the stateful `Tooltip` decides and the pure tree paints.
 *
 * The presence is resolved by the component because it needs a clock and a
 * caller-owned preference; `renderTooltip` stays pure so a suite can read the
 * tree it produces.
 */
export interface TooltipView {
  /** What the runtime paints: true from the open request until the exit ends. */
  readonly mounted: boolean;
  /** The resting target: true while open, false while leaving. */
  readonly present: boolean;
  /** Where the tip sits: away from the edge it is anchored to. */
  readonly side: AnchorSide;
  readonly motion: MotionProps;
  /** Every open request the trigger makes, held or released. */
  readonly onOpenChange: (open: boolean) => void;
}

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
  view?: TooltipView,
): ReactElement => (
  <GpuixTooltip
    delayDuration={delay}
    open={view === undefined ? open : view.mounted}
    defaultOpen={defaultOpen}
    onOpenChange={view === undefined ? onOpenChange : view.onOpenChange}
    disableHoverableContent={disableHoverableContent}
  >
    <TooltipTrigger asChild>
      {describedTrigger(
        children,
        description ?? (typeof content === "string" ? content : undefined),
        description !== undefined,
      )}
    </TooltipTrigger>
    <TooltipContent
      side={view === undefined ? side : view.side}
      align={align}
      motion={view?.motion}
      style={mergeStyle(
        tooltipStyle(theme, className, style),
        view === undefined ? undefined : presenceStyle(view.present),
      )}
      testId={testId}
    >
      {content}
    </TooltipContent>
  </GpuixTooltip>
);

/**
 * How far the tip travels while it arrives, in pixels.
 *
 * A tip is the smallest floating surface, so its movement is the smallest: two
 * pixels read as "it came from the trigger", where the eight a popover uses
 * would read as a slide.
 */
const TOOLTIP_OFFSET = 2;

/**
 * Keep the runtime mounted for the tip's exit tween.
 *
 * `wanted` is the caller's or the trigger's intent. A close flips the resting
 * frame at once — the runtime tweens to it — and the box unmounts when the exit
 * window has run, so a leaving tip fades instead of disappearing. Re-opening
 * during the exit keeps the same instance and retargets it.
 */
const useHeldOpen = (wanted: boolean, timing: SurfaceTiming): boolean => {
  const [mounted, setMounted] = useState(wanted);
  const windowMs = exitWindowMs(timing);

  useLayoutEffect(() => {
    if (wanted) setMounted(true);
  }, [wanted]);

  useEffect(() => {
    if (wanted || !mounted) return;
    if (windowMs === 0) {
      setMounted(false);
      return;
    }
    const handle = setTimeout(() => setMounted(false), windowMs);
    return () => clearTimeout(handle);
  }, [mounted, wanted, windowMs]);

  return mounted;
};

/** A short label shown when its trigger is hovered. */
export const Tooltip = (props: TooltipProps): ReactElement => {
  const theme = useTheme();
  // The provider states the preference once; the prop is the per-tip answer.
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  const timing = surfaceTiming(reducedMotion);
  const [requested, setRequested] = useState(props.defaultOpen === true);
  const wanted = props.open ?? requested;
  const mounted = useHeldOpen(wanted, timing);
  const requestOpen = (next: boolean): void => {
    props.onOpenChange?.(next);
    if (props.open === undefined) setRequested(next);
  };
  const side = props.side ?? "top";
  return renderTooltip(props, theme, {
    mounted,
    present: wanted,
    side,
    motion: surfaceMotion(fadeFromAnchor(side, TOOLTIP_OFFSET), wanted, timing),
    onOpenChange: requestOpen,
  });
};
