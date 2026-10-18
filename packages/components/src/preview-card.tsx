/**
 * PreviewCard: a rich card shown on hover or focus.
 *
 * Positioning is GPUix's `FloatingLayer` (as in Popover) and dismissal shares
 * the package's dismiss stack, so Escape closes only the topmost overlay.
 *
 * The card is **hoverable**: it may contain a link or a small action, which is
 * what separates it from a tooltip. The pointer may travel from the trigger into
 * the content; leaving both schedules the close. Keyboard focus opens it
 * immediately (no delay). The delays are props so tests need no 300 ms sleep.
 */

import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
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
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { elevationShadow, textStyle, useTheme } from "./internal/theme.js";

/** The rules a card part follows; throws outside a {@link PreviewCard}. */
interface PreviewCardContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly scheduleOpen: () => void;
  readonly scheduleClose: () => void;
  readonly cancelTimers: () => void;
  readonly setInside: (surface: "trigger" | "content", inside: boolean) => void;
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

/** The open policy: hover/focus in, leave both to close. */
export const PreviewCard = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = 300,
  closeDelay = 150,
  children,
}: PreviewCardProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
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

  const scheduleOpen = useCallback(() => {
    cancelTimers();
    if (open) return;
    if (openDelay <= 0) {
      setOpen(true);
      return;
    }
    openTimer.current = setTimeout(() => setOpen(true), openDelay);
  }, [cancelTimers, open, openDelay, setOpen]);

  const scheduleClose = useCallback(() => {
    cancelTimers();
    if (!open || inside.current.trigger || inside.current.content) return;
    if (closeDelay <= 0) {
      setOpen(false);
      return;
    }
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [cancelTimers, closeDelay, open, setOpen]);

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

/** Opens the card on hover, focus or press. */
export const PreviewCardTrigger = ({ onClick, ref, ...rest }: ButtonProps) => {
  const {
    open,
    setOpen,
    trigger,
    scheduleOpen,
    scheduleClose,
    cancelTimers,
    setInside,
  } = usePreviewCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onMouseEnter={(event) => {
        setInside("trigger", true);
        scheduleOpen();
        rest.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setInside("trigger", false);
        scheduleClose();
        rest.onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        cancelTimers();
        setOpen(true);
        rest.onFocus?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (open) setOpen(false);
        else scheduleOpen();
      }}
      onKeyDown={(event: EventPayload) => {
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
}

/** The hoverable card, rendered while open. */
export const PreviewCardContent = ({
  label,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  collisionPadding = 8,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ...rest
}: PreviewCardContentProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger, scheduleClose, cancelTimers, setInside } =
    usePreviewCard();
  const renderer = useGpuix().renderer;

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => setOpen(false);
  });

  // One dismiss layer for the card, as Popover does: Escape closes the topmost
  // overlay only, and returns focus to the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      close.current();
      if (event.eventType === "keyDown") {
        const target = trigger.current;
        if (target !== null) renderer?.focusElement?.(target.id);
      }
    });
  }, [open, renderer, trigger]);

  if (!open) return null;

  return (
    <FloatingLayer
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
      onKeyDown={(event: EventPayload) => {
        onKeyDown?.(event);
        if (isDismiss(event)) dismissTopLayer(event);
      }}
      style={mergeStyles(
        {
          ...textStyle(theme, "body"),
          minWidth: 240,
          maxWidth: 360,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.popover,
          color: theme.colors.popoverForeground,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          boxShadow: elevationShadow(theme, "md"),
          pointerEvents: "auto",
        },
        style,
      )}
    >
      {children}
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
    "open/close delays are component timers; 0.10.0 has no pointer-type signal, so touch has no hover and uses press",
    "the card is not auto-focused on hover open (that would steal focus from typing); Tab reaches its links",
    "no anchor arrow and no `aria-haspopup` in 0.10.0",
  ],
  docs: "docs/preview-card.mdx",
  example: "examples/preview-card.example.tsx",
  testFile: "src/behaviour/preview-card.test.tsx",
} as const;
