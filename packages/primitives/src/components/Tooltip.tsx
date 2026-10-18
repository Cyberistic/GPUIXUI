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
 * behaviour to work, and GPUix has no `focusVisible` (plan 020 §1.2), so a
 * tooltip opened by a mouse press looks the same as one opened by Tab.
 *
 * The root hugs the trigger (`tooltipRootStyle`) because `<anchored>` measures
 * its parent: without it the tip opens at the layout's edge, not the trigger's
 * (plan 060). That root is also what the wrapper measures to choose a side: the
 * runtime's layer is `fit="snap"`, which clamps without flipping, so a tooltip
 * at the window's top edge opened over its trigger (plan 067).
 *
 * The two corrections meet on the layer's own axis: a `left`/`right` side aligns
 * **vertically**, so the wrapper measures the tip's height too and centres on
 * heights, not widths (plan 098).
 */

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { readWindowSize, useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import {
  Tooltip as GpuixTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gpuix/react/tooltip";
import {
  decideVerticalSide,
  FLOATING_MARGIN,
  resolveAlign,
} from "../core/floating.js";
import { surfaceStyle } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { useTheme } from "./ThemeProvider.js";

export interface TooltipProps {
  /** The label. Keep it short — the runtime does not wrap overlay content. */
  readonly content: ReactNode;
  /** The element the tooltip describes. It must be focusable. */
  readonly children: ReactNode;
  /**
   * Defaults to `top`, flipped to `bottom` when the tip does not fit above.
   * An explicit value skips the decision.
   */
  readonly side?: FloatingSide;
  /**
   * Defaults to `start`, which is the value the runtime places exactly.
   * `center` is off by half the panel (plan 060 §0) and `end` is exact; the
   * wrapper corrects it on the layer's own axis, so a `left`/`right` tip is
   * centred vertically (plan 098).
   */
  readonly align?: FloatingAlign;
  /** Milliseconds before the tip opens on hover. Defaults to the provider's. */
  readonly delay?: number;
  readonly testId?: string;
}

/**
 * The tooltip root hugs its trigger.
 *
 * `<anchored>` positions its layer against this root, and a block-level flex
 * root stretches on its parent's cross axis: without this the tip opens at the
 * surrounding container's edge or centre (measured: plan 060 §0).
 */
export const tooltipRootStyle: StyleDesc = { alignSelf: "flex-start" };

/** The tip: the popover surface, the caption type, no wrapping. */
export const tooltipStyle = (theme: PrimitiveTheme): StyleDesc => ({
  ...surfaceStyle(
    { tone: "popover", radius: "sm", border: true, elevation: "overlay" },
    theme,
  ),
  paddingLeft: theme.spacing.sm,
  paddingRight: theme.spacing.sm,
  paddingTop: theme.spacing.xs,
  paddingBottom: theme.spacing.xs,
  fontSize: theme.typography.caption.fontSize,
  lineHeight: theme.typography.caption.lineHeight,
  whiteSpace: "nowrap",
});

/**
 * The height the tip will paint, from the values `tooltipStyle` uses.
 *
 * The side must be chosen before the tip exists, so the height is derived: the
 * vertical padding, one caption line and the border. A test pins the two
 * together, so a restyle that forgets this estimate fails (plan 067).
 */
export const tooltipHeight = (theme: PrimitiveTheme): number =>
  2 * theme.spacing.xs +
  theme.typography.caption.lineHeight +
  2 * theme.borderWidth.thin;

/** The impure glue the wrapper owns; the renderer below stays pure. */
export interface TooltipHandlers {
  /** The root div, so the wrapper can measure the trigger's box. */
  readonly ref?: Ref<PublicInstance>;
  /** When the tip opens, so the side is decided from a fresh measurement. */
  readonly onOpenChange?: (open: boolean) => void;
  /** The tip itself, so the wrapper can measure its box for `center`. */
  readonly contentRef?: Ref<PublicInstance>;
  /**
   * The alignment the wrapper resolved from its measurements. Absent in the
   * element tree, where the caller's `align` is passed through unchanged.
   */
  readonly placement?: {
    readonly align: FloatingAlign;
    readonly offset: number;
  };
}

/**
 * The element tree `Tooltip` renders. Pure in its arguments.
 *
 * A string tip is also the trigger's **description**: the runtime has no
 * `aria-describedby`, but it does expose `aria-description` and maps
 * `role="tooltip"`, so a screen-reader user hears the explanation on focus and
 * can reach the open tip as its own node (plan `071`). Non-string content is
 * painted and made a `tooltip` node, but is not given an invented name.
 */
export const renderTooltip = (
  { content, children, side, align = "start", delay, testId }: TooltipProps,
  theme: PrimitiveTheme,
  handlers: TooltipHandlers = {},
): ReactElement => {
  const description = P.isString(content) ? content : undefined;
  const placed = handlers.placement ?? { align, offset: 0 };
  return (
    <GpuixTooltip
      delayDuration={delay}
      style={tooltipRootStyle}
      ref={handlers.ref}
      onOpenChange={handlers.onOpenChange}
    >
      <TooltipTrigger asChild aria-description={description}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        ref={handlers.contentRef}
        role="tooltip"
        aria-label={description}
        side={side}
        align={placed.align}
        alignOffset={placed.offset}
        collisionPadding={FLOATING_MARGIN}
        style={tooltipStyle(theme)}
        testId={testId}
      >
        {content}
      </TooltipContent>
    </GpuixTooltip>
  );
};

/** The trigger's measured box, and the tip's box once it is painted. */
interface TooltipBox {
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly tipWidth?: number;
  readonly tipHeight?: number;
}

/** A short label shown when its trigger is hovered or focused. */
export const Tooltip = (props: TooltipProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const root = useRef<PublicInstance | null>(null);
  const tip = useRef<PublicInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<TooltipBox | undefined>(undefined);
  useLayoutEffect(() => {
    const rootId = root.current?.id;
    if (rootId === undefined) return;
    const bounds = renderer?.getElementBounds?.(rootId);
    if (
      bounds === null ||
      bounds === undefined ||
      bounds.width <= 0 ||
      bounds.height <= 0
    )
      return;
    const tipId = open ? tip.current?.id : undefined;
    const tipBounds =
      tipId === undefined ? undefined : renderer?.getElementBounds?.(tipId);
    setBox({
      top: bounds.y,
      bottom: bounds.y + bounds.height,
      width: bounds.width,
      height: bounds.height,
      tipWidth:
        tipBounds === null || tipBounds === undefined || tipBounds.width <= 0
          ? undefined
          : tipBounds.width,
      tipHeight:
        tipBounds === null || tipBounds === undefined || tipBounds.height <= 0
          ? undefined
          : tipBounds.height,
    });
  }, [renderer, open]);
  const side = Option.match(Option.fromNullishOr(box), {
    onNone: () => props.side ?? "top",
    onSome: (measured) =>
      props.side ??
      decideVerticalSide({
        triggerTop: measured.top,
        triggerBottom: measured.bottom,
        layerHeight: tooltipHeight(theme),
        viewportHeight: readWindowSize(renderer).height,
        margin: FLOATING_MARGIN,
        preferred: "top",
      }),
  });
  const requested = props.align ?? "start";
  // The runtime's own `center` is never passed through: until the tip is
  // measurable it paints from the exact `start`, then shifts to true centre.
  const unmeasured = {
    align: requested === "center" ? ("start" as const) : requested,
    offset: 0,
  };
  const placement = Option.match(Option.fromNullishOr(box), {
    onNone: () => unmeasured,
    onSome: (measured) =>
      measured.tipWidth === undefined || measured.tipHeight === undefined
        ? unmeasured
        : resolveAlign({
            side,
            align: requested,
            triggerWidth: measured.width,
            triggerHeight: measured.height,
            layerWidth: measured.tipWidth,
            layerHeight: measured.tipHeight,
          }),
  });
  return renderTooltip({ ...props, side }, theme, {
    ref: root,
    contentRef: tip,
    placement,
    onOpenChange: setOpen,
  });
};
