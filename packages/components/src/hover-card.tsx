/** @jsxImportSource @gpuix/react */
/**
 * HoverCard: a rich surface previewed from a link or a name.
 *
 * The card opens after the hover delay shadcn uses (700 ms) and closes 300 ms
 * after the pointer and focus have left both the trigger and the surface, so the
 * pointer — or a Tab — can travel from one into the other without a flash. It
 * also opens the moment the trigger takes focus: a keyboard reader has no hover,
 * and the card is the only way to read what the trigger previews.
 *
 * Positioning, dismissal and motion are the popover's machinery, not a second
 * copy: the runtime's anchored layer places the card, `internal/placement.ts`
 * corrects the measured centre and flip, `internal/dismiss-layer.ts` closes only
 * the topmost overlay, and `internal/presence.tsx` fades it (there is no
 * `transform` in 0.11.0, so the card never scales).
 *
 * Focus leaving is the one rule a popover does not have: the card is hoverable
 * and may hold a link, so a Tab out of it is the keyboard's version of the
 * pointer leaving.
 */

import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
import { HOVER_CARD_CONTENT } from "@gpuixui/tw";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { Button, type ButtonProps } from "./internal/button.js";
import { hoverDelay } from "./internal/clock.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import { useHoverDelays } from "./internal/hover.js";
import { isDismiss } from "./internal/key.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFromAnchor,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** The open state and the waits every part shares. */
interface HoverCardContextValue {
  readonly open: boolean;
  readonly hover: ReturnType<typeof useHoverDelays>;
  readonly trigger: RefObject<PublicInstance | null>;
  /** Set by a dismissing outside press, consumed by the click that follows it. */
  readonly dismissedByOutsidePress: RefObject<boolean>;
}

const HoverCardContext = createContext<HoverCardContextValue | undefined>(
  undefined,
);

/** The card a part belongs to. Throws when there is none. */
const useHoverCard = (): HoverCardContextValue => {
  const value = useContext(HoverCardContext);
  if (value === undefined) {
    throw new Error("HoverCard parts must be used inside HoverCard");
  }
  return value;
};

/** {@link HoverCard} props. */
export interface HoverCardProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Milliseconds between hover and open. Default `700`. */
  readonly openDelay?: number;
  /** Milliseconds after the last hold leaves before closing. Default `300`. */
  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

/** shadcn's hover delays. */
const OPEN_DELAY_MS = 700;
const CLOSE_DELAY_MS = 300;

/** The waits, the trigger and the dismissal bookkeeping. */
export const HoverCard = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = OPEN_DELAY_MS,
  closeDelay = CLOSE_DELAY_MS,
  children,
}: HoverCardProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
  const dismissedByOutsidePress = useRef(false);
  const hover = useHoverDelays({
    open,
    setOpen,
    openDelay: hoverDelay(openDelay, OPEN_DELAY_MS),
    closeDelay: hoverDelay(closeDelay, CLOSE_DELAY_MS),
  });

  const context = useMemo<HoverCardContextValue>(
    () => ({ open, hover, trigger, dismissedByOutsidePress }),
    [hover, open],
  );

  assertParts(hoverCardRoot, children);

  return (
    <HoverCardContext.Provider value={context}>
      <div style={floatingRootStyle()}>{children}</div>
    </HoverCardContext.Provider>
  );
};

/** {@link HoverCardTrigger} props: the shared action, opening this card. */
export type HoverCardTriggerProps = ButtonProps;

/**
 * Opens the card on hover, on focus, or on a press. A ghost action by default:
 * shadcn's trigger is a link, and 0.11.0 has no HTML anchor.
 */
export const HoverCardTrigger = ({
  onClick,
  onFocus,
  onBlur,
  ref,
  disabled = false,
  variant = "ghost",
  ...rest
}: HoverCardTriggerProps) => {
  const { open, hover, trigger, dismissedByOutsidePress } = useHoverCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);
  /**
   * Whether a press is under way on the trigger.
   *
   * A press focuses the trigger before its click arrives, and focus opens the
   * card; the click that belongs to that same press would then read the card
   * as already open and toggle it shut. The press is the one focus path that
   * does not open on its own — its click is the open, and the marker keeps the
   * two from cancelling each other.
   */
  const pressed = useRef(false);

  // A trigger disabled while a hover open is waiting must not open when the
  // wait ends: the delay was the reader's pointer on an action that can no
  // longer take one.
  useLayoutEffect(() => {
    if (disabled) hover.cancelOpening();
  }, [disabled, hover]);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      variant={variant}
      aria-expanded={open}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (disabled) return;
        hover.pointer("trigger", true);
      }}
      onMouseDown={(event) => {
        rest.onMouseDown?.(event);
        pressed.current = true;
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        pressed.current = false;
        if (disabled) return;
        hover.pointer("trigger", false);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (disabled) return;
        if (pressed.current) return;
        hover.focus("trigger", true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        pressed.current = false;
        hover.focus("trigger", false);
      }}
      onClick={(event: EventPayload) => {
        pressed.current = false;
        onClick?.(event);
        // The press that dismissed the card owns this click: toggling here
        // would re-open what the same gesture just closed.
        if (dismissedByOutsidePress.current) {
          dismissedByOutsidePress.current = false;
          return;
        }
        hover.cancel();
        hover.request(!open);
      }}
      onKeyDown={(event: KeyEvent) => {
        rest.onKeyDown?.(event);
        if (isDismiss(event)) hover.request(false);
      }}
    />
  );
};

/** {@link HoverCardContent} props: a floating surface, side and alignment. */
export interface HoverCardContentProps {
  /** The surface's accessible name. */
  readonly label?: string;
  /** Default `"bottom"`. Flipped once if the snapped surface would cover the trigger. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"center"`, measured from the trigger rather than the runtime's `center`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between the trigger and the surface. Default `4`. */
  readonly sideOffset?: number;
  /** The margin a snapped surface keeps from the window edge. Default `8`. */
  readonly collisionPadding?: number;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, merged last. */
  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: PartChildren;
}

/** The hoverable surface, rendered while the card is open. */
export const HoverCardContent = ({
  label,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  collisionPadding = 8,
  className,
  style,
  testId,
  children,
}: HoverCardContentProps) => {
  const theme = useTheme();
  const { open, hover, trigger, dismissedByOutsidePress } = useHoverCard();
  const renderer = useGpuix().renderer;
  const surface = useRef<PublicInstance | null>(null);
  const timing = useSurfaceTiming("fast");
  const presence = useSurfacePresence(open, timing);
  const placement = usePlacement({
    // The surface is still painted while it leaves, so its measured side must
    // not reset under the exit tween.
    open: presence.mounted,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => hover.request(false);
  });

  // One dismiss layer for the card, as Popover does: Escape closes the topmost
  // overlay only, and returns focus to the trigger.
  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      close.current();
      if (event.eventType === "keyDown") {
        const target = trigger.current;
        if (target !== null) renderer?.focusElement?.(target.id);
        return;
      }
      // Mark the press so the click it belongs to cannot re-open the card.
      dismissedByOutsidePress.current = true;
      queueMicrotask(() => {
        dismissedByOutsidePress.current = false;
      });
    }, depth);
  }, [depth, dismissedByOutsidePress, open, renderer, trigger]);

  if (!presence.mounted) return null;

  return (
    <FloatingLayer
      motion={presenceMotion(fadeFromAnchor(placement.side, 4), presence)}
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset}
      collisionPadding={collisionPadding}
      role="group"
      aria-label={label}
      tabIndex={-1}
      ref={surface}
      testId={testId}
      onMouseEnter={() => hover.pointer("content", true)}
      onMouseLeave={() => hover.pointer("content", false)}
      onFocus={() => hover.focus("content", true)}
      onBlur={() => hover.focus("content", false)}
      onMouseDownOutside={(event) => dismissTopLayer(event)}
      onKeyDown={(event: KeyEvent) => {
        if (isDismiss(event)) dismissTopLayer(event);
      }}
      style={mergeStyles(
        mergeStyles(
          overlaySurfaceStyle(HOVER_CARD_CONTENT, className, theme),
          // A positioned box is what the leaving guard is inset against.
          { position: "relative", ...presenceStyle(presence.present) },
        ),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
      <PresenceShield present={presence.present} />
    </FloatingLayer>
  );
};

/** Every part of HoverCard, so a misplaced sibling is named. */
const hoverCardParts: ReadonlyArray<PartComponent> = [
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
];

const hoverCardRoot: PartsContract = {
  parent: "HoverCard",
  family: hoverCardParts,
  accepts: [HoverCardTrigger, HoverCardContent],
  hint: "Put HoverCardTrigger and HoverCardContent directly inside HoverCard.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const hoverCardMeta = {
  name: "Hover card",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the trigger is a button, not an HTML anchor: 0.11.0 has no link host",
    "no per-trigger delay and no `aria-haspopup`; the waits are the card's",
    "focus opens the card at once, and a Tab out of it closes after the close delay; the runtime does not say how focus arrived",
    "Escape reaches the card through its trigger or its own content; a pointer-opened card with focus elsewhere cannot hear a window Escape, because 0.11.0 delivers window keys only at the application's render handler",
  ],
  docs: "docs/hover-card.mdx",
  example: "examples/hover-card.example.tsx",
  testFile: "src/behaviour/hover-card.test.tsx",
} as const;
