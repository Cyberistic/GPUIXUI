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
 * heights, not widths (plan 098). A requested side is a **preference on both
 * axes**: a tip that cannot fit where it was asked to open goes to the other
 * side, horizontal from its measured width (plan 335) and vertical from the
 * position the side decision estimates (plan 336).
 *
 * **Open state is the wrapper's**, through the package's one controlled rule
 * (plan 347): `open`/`defaultOpen`/`onOpenChange` reach GPUix as a controlled
 * value, so a tip opened from code (a tour, a one-time hint) is the same tip
 * the pointer opens and the one the measurements describe. The root is measured
 * on every open transition including mount with the tip closed, so a controlled
 * tip is placed from its trigger's real box before it is first painted.
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
  decideHorizontalSide,
  decideVerticalSide,
  FLOATING_MARGIN,
  isHorizontalSide,
  resolveAlign,
  tipWidthCap,
  type VerticalSide,
} from "../core/floating.js";
import { surfaceStyle } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useControlState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface TooltipProps {
  /**
   * The label. Long text wraps inside a measured cap; keep it short anyway,
   * because a tip is a hint, not a paragraph.
   */
  readonly content: ReactNode;
  /** The element the tooltip describes. It must be focusable. */
  readonly children: ReactNode;
  /**
   * Whether the tip is painted. Supplying it makes the tip **controlled**: a
   * request reaches `onOpenChange` and the tip changes only when this prop
   * changes (plan 347).
   */
  readonly open?: boolean;
  /** Initial open state when uncontrolled. Defaults to closed. */
  readonly defaultOpen?: boolean;
  /** Called when the tooltip asks to open or close. */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Close as soon as the pointer leaves the trigger, so the tip's own surface
   * cannot be hovered. Defaults to the provider's value (`false`).
   */
  readonly disableHoverableContent?: boolean;
  /**
   * Defaults to `top`. A requested side is a **preference**: when the tip
   * cannot fit there it opens on the other side — below instead of above, or
   * the other horizontal side — and on the roomier side when it fits on
   * neither (plans 335, 336).
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
  /**
   * Merged over the root's hugging style. The root hugs its trigger so the tip
   * anchors to it (plan 060), which collapses a child that asks for
   * `width: "100%"` — a Slider, or a `fullWidth` field. Give the root a width
   * here for those (measured, plan 345 §2.2).
   */
  readonly style?: StyleDesc;
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

/**
 * The tip: the popover surface, the caption type, and a measured width cap.
 *
 * `maxWidth` is the room the resolved side and alignment have, measured by the
 * wrapper. With a cap the text wraps into it; without one (the element-tree
 * caller has no viewport) the tip keeps the single-line form. Measured: a
 * 200-word tip without a cap painted 6 270 px wide in a 1 280 px window
 * (plan `391`).
 */
export const tooltipStyle = (
  theme: PrimitiveTheme,
  maxWidth?: number,
): StyleDesc => ({
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
  whiteSpace: maxWidth === undefined ? "nowrap" : "normal",
  // A tip is chrome, not content: a drag across it must not take the hint's
  // text (measured, plan `398`; the class plan `386` fixed for buttons and
  // selects). A caller can opt back in through `Tooltip.style`, merged last.
  userSelect: "none",
  ...(maxWidth === undefined ? {} : { maxWidth }),
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
  /**
   * The runtime's open request. The wrapper routes it through its controlled
   * rule, so the value that places the tip is the value the caller sees
   * (plan 347).
   */
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
  /**
   * The widest the tip may paint: the room the resolved side and alignment
   * have, measured by the wrapper. With it the content wraps; without it the
   * tip is one line.
   */
  readonly maxWidth?: number;
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
  {
    content,
    children,
    open,
    disableHoverableContent,
    side,
    align = "start",
    delay,
    style,
    testId,
  }: TooltipProps,
  theme: PrimitiveTheme,
  handlers: TooltipHandlers = {},
): ReactElement => {
  const description = P.isString(content) ? content : undefined;
  const placed = handlers.placement ?? { align, offset: 0 };
  return (
    <GpuixTooltip
      open={open}
      disableHoverableContent={disableHoverableContent}
      delayDuration={delay}
      style={mergeStyle(tooltipRootStyle, style)}
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
        style={tooltipStyle(theme, handlers.maxWidth)}
        testId={testId}
      >
        {content}
      </TooltipContent>
    </GpuixTooltip>
  );
};

/** The trigger's measured box, and the tip's box once it is painted. */
interface TooltipBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly tipWidth?: number;
  readonly tipHeight?: number;
  /** The painted tip's left edge, which is the true anchor once it exists. */
  readonly tipLeft?: number;
}

/** A short label shown when its trigger is hovered or focused. */
export const Tooltip = (props: TooltipProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const root = useRef<PublicInstance | null>(null);
  const tip = useRef<PublicInstance | null>(null);
  const openState = useControlState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const open = openState.value.current;
  const [box, setBox] = useState<TooltipBox | undefined>(undefined);
  useLayoutEffect(() => {
    // The trigger is measured while the tip is closed too: a controlled tip can
    // open with no pointer or focus event, and its side must come from the
    // trigger's real box (plan 347).
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
      left: bounds.x,
      right: bounds.x + bounds.width,
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
      tipLeft:
        tipBounds === null || tipBounds === undefined ? undefined : tipBounds.x,
    });
  }, [renderer, open, props.content]);
  const viewport = readWindowSize(renderer);
  const side = Option.match(Option.fromNullishOr(box), {
    onNone: () => props.side ?? "top",
    onSome: (measured) => {
      const vertical = (preferred: VerticalSide): VerticalSide =>
        decideVerticalSide({
          triggerTop: measured.top,
          triggerBottom: measured.bottom,
          // A wrapped tip is taller than the one-line estimate. The first frame
          // has no measurement, so it places by the estimate and the measured
          // height corrects the side on the frame after the tip is painted.
          layerHeight: measured.tipHeight ?? tooltipHeight(theme),
          viewportHeight: viewport.height,
          margin: FLOATING_MARGIN,
          preferred,
        });
      const requested = props.side;
      return requested === undefined
        ? vertical("top")
        : isHorizontalSide(requested)
          ? decideHorizontalSide({
              triggerLeft: measured.left,
              triggerRight: measured.right,
              layerWidth: measured.tipWidth ?? measured.width,
              viewportWidth: viewport.width,
              margin: FLOATING_MARGIN,
              preferred: requested,
            })
          : vertical(requested);
    },
  });
  const requested = props.align ?? "start";
  // The runtime keeps the layer's left edge inside the margin but never caps
  // its width (measured: a 200-word tip painted 6 270 px, plan `391`). The cap
  // is the room the resolved side and alignment actually have. A vertical side
  // measures from the painted tip's own box (its true anchor); a side beside
  // the trigger takes the trigger's edges, because the painted box of a clamped
  // layer would sit across the trigger (plan `393`).
  const cap = Option.match(Option.fromNullishOr(box), {
    onNone: () => Math.floor(viewport.width - 2 * FLOATING_MARGIN),
    onSome: (measured) => {
      // The tip's own box is the true anchor once it is painted; the wrapper's
      // root can sit a few pixels left of the trigger the layer anchors to.
      const anchorLeft = measured.tipLeft ?? measured.left;
      const anchorRight =
        measured.tipLeft === undefined || measured.tipWidth === undefined
          ? measured.right
          : measured.tipLeft + measured.tipWidth;
      return tipWidthCap({
        side,
        align: requested,
        anchorLeft,
        anchorRight,
        triggerLeft: measured.left,
        triggerRight: measured.right,
        viewportWidth: viewport.width,
        margin: FLOATING_MARGIN,
      });
    },
  });
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
  return renderTooltip({ ...props, side, open }, theme, {
    ref: root,
    contentRef: tip,
    placement,
    maxWidth: cap > 0 ? cap : undefined,
    onOpenChange: openState.set,
  });
};
