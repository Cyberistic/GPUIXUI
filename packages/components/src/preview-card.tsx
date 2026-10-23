/**
 * PreviewCard: a rich card shown on hover, or on a press.
 *
 * Positioning is GPUix's `FloatingLayer` (as in Popover) and dismissal shares
 * the package's dismiss stack, so Escape closes only the topmost overlay.
 *
 * The card is **hoverable**: it may contain a link or a small action, which is
 * what separates it from a tooltip. The pointer may travel from the trigger into
 * the content; leaving both schedules the close. A press opens it at once and a
 * second press closes it. Focus does not open it: on 0.11.0 a `Tab` traversal
 * focuses the trigger without running its `onFocus` (`tabs-lifecycle` reads
 * `focuses=0`), and a preview under every traversal would be intrusive anyway;
 * the trigger's `Enter`/`Space` is the keyboard path. The delays are props so
 * tests need no 300 ms sleep.
 */

import type { KeyEvent, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { PREVIEW_CARD_CONTENT } from "@gpuixui/tw";
import {
  createContext,
  useCallback,
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

/** The rules a card part follows; throws outside a {@link PreviewCard}. */
interface PreviewCardContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly scheduleOpen: () => void;
  readonly scheduleClose: () => void;
  readonly cancelTimers: () => void;
  readonly setInside: (surface: "trigger" | "content", inside: boolean) => void;
  /** Set by a dismissing outside press, consumed by the click that follows it. */
  readonly dismissedByOutsidePress: RefObject<boolean>;
}

const PreviewCardContext = createContext<PreviewCardContextValue | undefined>(
  undefined,
);

/** The card a part belongs to. Throws when there is none. */
const usePreviewCard = (): PreviewCardContextValue => {
  const value = useContext(PreviewCardContext);
  if (value === undefined) {
    throw new Error("PreviewCard parts must be used inside PreviewCard");
  }
  return value;
};

/** {@link PreviewCard} props. */
export interface PreviewCardProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Milliseconds between hover and open. Default `300`. */
  readonly openDelay?: number;
  /** Milliseconds after leaving both surfaces before closing. Default `150`. */
  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

/** The waits a preview opens and closes after, when its props do not name one. */
const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

/** The open policy: hover/focus in, leave both to close. */
export const PreviewCard = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = OPEN_DELAY_MS,
  closeDelay = CLOSE_DELAY_MS,
  children,
}: PreviewCardProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
  const dismissedByOutsidePress = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The runtime delivers the new element's mouseEnter before the previous
  // element's mouseLeave, so a leave must not schedule a close while the other
  // surface still holds the pointer.
  const inside = useRef({ trigger: false, content: false });

  const cancelTimers = useCallback(() => {
    if (openTimer.current !== undefined) {
      clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  useLayoutEffect(() => cancelTimers, [cancelTimers]);

  const openMs = hoverDelay(openDelay, OPEN_DELAY_MS);
  const closeMs = hoverDelay(closeDelay, CLOSE_DELAY_MS);

  const scheduleOpen = useCallback(() => {
    cancelTimers();
    if (open) return;
    if (openMs === 0) {
      setOpen(true);
      return;
    }
    openTimer.current = setTimeout(() => setOpen(true), openMs);
  }, [cancelTimers, open, openMs, setOpen]);

  const scheduleClose = useCallback(() => {
    cancelTimers();
    if (!open || inside.current.trigger || inside.current.content) return;
    if (closeMs === 0) {
      setOpen(false);
      return;
    }
    closeTimer.current = setTimeout(() => setOpen(false), closeMs);
  }, [cancelTimers, closeMs, open, setOpen]);

  const setInside = useCallback(
    (surface: "trigger" | "content", value: boolean) => {
      inside.current = { ...inside.current, [surface]: value };
    },
    [],
  );

  const context = useMemo<PreviewCardContextValue>(
    () => ({
      open,
      setOpen,
      trigger,
      scheduleOpen,
      scheduleClose,
      cancelTimers,
      setInside,
      dismissedByOutsidePress,
    }),
    [cancelTimers, open, scheduleClose, scheduleOpen, setInside, setOpen],
  );

  assertParts(previewCardRoot, children);

  return (
    <PreviewCardContext.Provider value={context}>
      <div style={floatingRootStyle()}>{children}</div>
    </PreviewCardContext.Provider>
  );
};

/** Opens the card on hover, or on a press. */
export const PreviewCardTrigger = ({
  onClick,
  ref,
  disabled = false,
  ...rest
}: ButtonProps) => {
  const {
    open,
    setOpen,
    trigger,
    scheduleOpen,
    scheduleClose,
    cancelTimers,
    setInside,
    dismissedByOutsidePress,
  } = usePreviewCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      aria-expanded={open}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (disabled) return;
        setInside("trigger", true);
        scheduleOpen();
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        if (disabled) return;
        setInside("trigger", false);
        scheduleClose();
      }}
      onClick={(event) => {
        onClick?.(event);
        // The press that dismissed the card owns this click: toggling here
        // would re-open what the same gesture just closed. Any other press is
        // explicit, so it opens now rather than after the hover delay — the
        // trigger's `Enter`/`Space` is the keyboard path, and a focus event
        // does not open the card by policy.
        if (dismissedByOutsidePress.current) {
          dismissedByOutsidePress.current = false;
          return;
        }
        cancelTimers();
        setOpen(!open);
      }}
      onKeyDown={(event: KeyEvent) => {
        rest.onKeyDown?.(event);
        if (isDismiss(event) && open) setOpen(false);
      }}
    />
  );
};

/** {@link PreviewCardContent} props: a floating surface, side and alignment. */
export interface PreviewCardContentProps extends FloatingContentProps {
  /** The surface's accessible name. */
  readonly label: string;
  /** Default `"bottom"`. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. */
  readonly align?: "start" | "center" | "end";
  /** Default `6`. */
  readonly sideOffset?: number;
  /** Default `8`. */
  readonly collisionPadding?: number;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The hoverable card, rendered while open. */
export const PreviewCardContent = ({
  label,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  collisionPadding = 8,
  className,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ...rest
}: PreviewCardContentProps) => {
  const theme = useTheme();
  const {
    open,
    setOpen,
    trigger,
    scheduleClose,
    cancelTimers,
    setInside,
    dismissedByOutsidePress,
  } = usePreviewCard();
  const renderer = useGpuix().renderer;

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => setOpen(false);
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

  const timing = useSurfaceTiming("fast");
  const presence = useSurfacePresence(open, timing);

  if (!presence.mounted) return null;

  return (
    <FloatingLayer
      motion={presenceMotion(fadeFromAnchor(side, 4), presence)}
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      role="group"
      aria-label={label}
      tabIndex={-1}
      {...rest}
      onMouseEnter={(event) => {
        setInside("content", true);
        cancelTimers();
        rest.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setInside("content", false);
        scheduleClose();
        rest.onMouseLeave?.(event);
      }}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      onKeyDown={(event: KeyEvent) => {
        onKeyDown?.(event);
        if (isDismiss(event)) dismissTopLayer(event);
      }}
      style={mergeStyles(
        mergeStyles(
          overlaySurfaceStyle(PREVIEW_CARD_CONTENT, className, theme),
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

/** Every part, so a misplaced sibling is named. */
const previewCardParts: ReadonlyArray<PartComponent> = [
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardContent,
];

const previewCardRoot: PartsContract = {
  parent: "PreviewCard",
  family: previewCardParts,
  accepts: [PreviewCardTrigger, PreviewCardContent],
  hint: "Put PreviewCardTrigger and PreviewCardContent directly inside PreviewCard.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const previewCardMeta = {
  name: "Preview Card",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "open/close delays are component timers; 0.11.0 has no pointer-type signal, so touch has no hover and uses press",
    "the card is not auto-focused on hover open (that would steal focus from typing); Tab reaches its links",
    "no anchor arrow and no `aria-haspopup` in 0.11.0",
  ],
  docs: "docs/preview-card.mdx",
  example: "examples/preview-card.example.tsx",
  testFile: "src/behaviour/preview-card.test.tsx",
} as const;
