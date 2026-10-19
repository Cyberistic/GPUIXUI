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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { useGpuix, useWindowSize } from "@gpuix/react";
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
import { paintedBox } from "../core/bounds.js";
import { surfaceStyle } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { ariaName, mergeStyle, useControlState } from "./internal.js";
import { isTrackedFocus, useNativeFocus } from "./native-focus.js";
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
   * The trigger host, so the wrapper can compare it with the focus tracker's
   * sample. `TooltipTrigger asChild` merges it into the child's `ref`, which a
   * primitive forwards under the slot contract (plan `596`).
   */
  readonly triggerRef?: Ref<PublicInstance>;
  /**
   * The runtime's open request. The wrapper routes it through its controlled
   * rule, so the value that places the tip is the value the caller sees
   * (plan 347).
   */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Pointer entry and exit, so a dismissed hover tip can reopen.
   *
   * A dismissal lasts while the pointer is over the trigger. The runtime closes
   * a hover tip 80 ms after leave, so the hover gate clears on that close (or
   * immediately when the runtime was already closed); entering only clears the
   * leave flag, because a one-gesture click can deliver the entry **after** the
   * press (measured, plan `605`).
   */
  readonly onEnter?: () => void;
  readonly onLeave?: () => void;
  /**
   * The trigger was pressed or Escape was pressed on it.
   *
   * The wrapper keeps a focus-opened tip open while the trigger still holds
   * focus, so an explicit dismissal has to be remembered until focus leaves
   * (plan `596`). A press reaches the slot as **`onMouseDown`** on a `div` host
   * and as **`onClick`** on a native text host, which receives no mouse-down
   * (measured). `onClick` on a button-shaped control is its public activation
   * callback, not part of `TriggerHandlers` (plan `605`).
   */
  readonly onDismiss?: () => void;
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
 *
 * A string that trims to nothing is **no tip** (plan `573`): the child renders
 * unchanged, so a computed blank translation cannot publish a blank description
 * or open an empty popover. A real string is trimmed for the accessibility tree
 * and painted exactly as the caller wrote it.
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
  const description = P.isString(content) ? ariaName(content) : undefined;
  if (P.isString(content) && description === undefined) {
    return <>{children}</>;
  }
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
      <TooltipTrigger
        asChild
        ref={handlers.triggerRef}
        aria-description={description}
        onMouseEnter={handlers.onEnter}
        onMouseLeave={handlers.onLeave}
        // The runtime closes on mousedown; remember the dismissal there so the
        // focused tip stays shut. A native text host receives no mouse-down, so
        // it dismisses through `onClick` instead (measured, plan `605`).
        onMouseDown={handlers.onDismiss}
        onClick={handlers.onDismiss}
        onKeyDown={(event) => {
          if (event.key === "escape") handlers.onDismiss?.();
        }}
      >
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
  const trigger = useRef<PublicInstance | null>(null);
  const openState = useControlState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const sample = useNativeFocus();
  const triggerFocused = isTrackedFocus(sample?.focused, trigger.current?.id);
  const [focusOpen, setFocusOpen] = useState(false);
  /**
   * An explicit dismissal, remembered separately for the two open sources.
   *
   * A focus-opened tip is not in `openState` (the runtime never reported the
   * open), so a dismissed ref would write nothing React can render and the tip
   * stayed painted until an unrelated update (measured, plan `605`). They are
   * separate because the pointer and the keyboard leave at different times: a
   * click dismisses both, while moving the pointer away may reopen the hover
   * tip without clearing the keyboard's dismissal.
   */
  const [focusDismissed, setFocusDismissed] = useState(false);
  const [hoverDismissed, setHoverDismissed] = useState(false);
  /** Whether a real leave has happened since the pointer arrived. */
  const pointerOutside = useRef(false);
  /**
   * Focus-open is the tracker's job on a runtime that dispatches no `onFocus`.
   *
   * The headless tooltip opens from that missing event; every single-root
   * primitive forwards the slot's `ref`, so the wrapper knows which host the
   * tracker names. A caller-controlled `open` wins: the tracker must not
   * override a value the caller owns (plan 347). `onDismiss` records a press or
   * Escape, because the trigger keeps focus after either and would otherwise
   * reopen on the next render; focus loss clears it (plans `596`, `605`).
   */
  useEffect(() => {
    if (triggerFocused) setFocusOpen(true);
    else {
      setFocusOpen(false);
      setFocusDismissed(false);
    }
  }, [triggerFocused]);
  /**
   * A controlled parent owns the value. Otherwise the runtime's open is gated
   * by a dismissal: the hover open and the dismiss can land in the same
   * dispatch, where the runtime's own close is computed from the previous
   * frame, so the wrapper must not trust that close alone (measured, plan
   * `605`).
   */
  const open =
    openState.value.mode === "controlled"
      ? openState.value.current
      : (openState.value.current && !hoverDismissed) ||
        (focusOpen && !focusDismissed);
  /**
   * The window size is **observed**, not sampled once per render.
   *
   * `<anchored fit="snap">` clamps a layer into the window without flipping it,
   * so the side and the width cap this wrapper chooses are the only protection
   * against a tip covering its trigger. A size read in render would leave a tip
   * on the side chosen for the old window (measured, plan `604`): a
   * `side="bottom"` tip stayed below a trigger that no longer had room, and a
   * 1 258 px tip ignored a 300 px window. `Select` already follows this signal.
   *
   * The subscription is live only while a tip is open; a closed tip has no
   * placement to correct. The runtime's observer dedupes equal sizes.
   */
  const viewport = useWindowSize({ intervalMs: open ? 100 : false });
  const [box, setBox] = useState<TooltipBox | undefined>(undefined);
  useLayoutEffect(() => {
    // The trigger is measured while the tip is closed too: a controlled tip can
    // open with no pointer or focus event, and its side must come from the
    // trigger's real box (plan 347).
    const rootId = root.current?.id;
    if (rootId === undefined) return;
    const rawRoot = renderer?.getElementBounds?.(rootId);
    if (
      rawRoot === null ||
      rawRoot === undefined ||
      rawRoot.width <= 0 ||
      rawRoot.height <= 0
    )
      return;
    // The runtime reports a plain `div` from its content origin; the tip's
    // padding and border are chrome the layout chose around it (plan `597`).
    const bounds = paintedBox(
      rawRoot,
      mergeStyle(tooltipRootStyle, props.style),
    );
    const tipId = open ? tip.current?.id : undefined;
    const rawTip =
      tipId === undefined ? undefined : renderer?.getElementBounds?.(tipId);
    const tipBounds =
      rawTip === null || rawTip === undefined
        ? undefined
        : paintedBox(rawTip, tooltipStyle(theme));
    setBox({
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y,
      bottom: bounds.y + bounds.height,
      width: bounds.width,
      height: bounds.height,
      tipWidth:
        tipBounds === undefined || tipBounds.width <= 0
          ? undefined
          : tipBounds.width,
      tipHeight:
        tipBounds === undefined || tipBounds.height <= 0
          ? undefined
          : tipBounds.height,
      tipLeft: tipBounds?.x,
    });
  }, [
    renderer,
    open,
    props.content,
    props.style,
    theme,
    // A resize re-wraps the tip when its width cap changes, so its height must
    // be measured again before the side decision uses it (plan `604`).
    viewport.height,
    viewport.width,
  ]);
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
    triggerRef: trigger,
    contentRef: tip,
    placement,
    maxWidth: cap > 0 ? cap : undefined,
    onOpenChange: (next) => {
      openState.set(next);
      // Only a close that follows a real leave re-opens the pointer path: the
      // runtime's own close in the dismissing gesture must not clear the gate,
      // or a one-gesture click (press, then the pointer enters) reopened it
      // (measured, plan `605`).
      if (!next && pointerOutside.current) setHoverDismissed(false);
    },
    onEnter: () => {
      pointerOutside.current = false;
    },
    onLeave: () => {
      pointerOutside.current = true;
      // A focus-opened tip never reached the runtime's open, so no close event
      // will follow this leave; clear the hover gate now. The focus gate is
      // separate and stays until focus actually leaves.
      if (!openState.value.current) setHoverDismissed(false);
    },
    onDismiss: () => {
      setFocusDismissed(true);
      setHoverDismissed(true);
    },
  });
};
