/**
 * PreviewCard: a rich card shown on hover or focus.
 *
 * Positioning is GPUix's `FloatingLayer` through the shared measured placement
 * rule (as in Popover), and dismissal shares the package's dismiss stack, so
 * Escape closes only the topmost overlay. A dismissal that restores focus to
 * the trigger must not re-open the card — the restored focus is not the user
 * focusing the trigger (plan 515).
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
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { Button, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useHoverTravel, type HoverTravel } from "./internal/hover.js";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { pressedOn } from "./internal/pointer.js";
import { useMergedRef } from "./internal/ref.js";
import { elevationShadow, textStyle, useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** The rules a card part follows; throws outside a {@link PreviewCard}. */
interface PreviewCardContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly hover: HoverTravel;
  /** Set while a dismissal restores focus, so that focus does not re-open. */
  readonly suppressFocusOpen: RefObject<boolean>;
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
  const suppressFocusOpen = useRef(false);
  const hover = useHoverTravel({
    isOpen: () => open,
    close: () => setOpen(false),
    openDelay,
    closeDelay,
  });

  const context = useMemo<PreviewCardContextValue>(
    () => ({ open, setOpen, trigger, hover, suppressFocusOpen }),
    [hover, open, setOpen],
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
  const { open, setOpen, trigger, hover, suppressFocusOpen } = usePreviewCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (rest.disabled === true) return;
        hover.enter("trigger", () => setOpen(true));
      }}
      onMouseLeave={(event) => {
        hover.leave("trigger");
        rest.onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        rest.onFocus?.(event);
        hover.cancel();
        if (rest.disabled === true) return;
        // A dismissal that restored focus must not re-open the card (plan 515).
        if (suppressFocusOpen.current) {
          suppressFocusOpen.current = false;
          return;
        }
        setOpen(true);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (open) setOpen(false);
        else hover.enter("trigger", () => setOpen(true));
      }}
      onKeyDown={(event: EventPayload) => {
        rest.onKeyDown?.(event);
        // Offer the key to the stack rather than closing locally, so the card's
        // layer claims it and an enclosing dialog stays open (plan 514).
        if (isDismiss(event) && open) dismissTopLayer(event);
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
  alignOffset = 0,
  collisionPadding = 8,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: PreviewCardContentProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger, hover, suppressFocusOpen } = usePreviewCard();
  const renderer = useGpuix().renderer;
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const placement = usePlacement({
    open,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => setOpen(false);
  });

  // One dismiss layer for the card, as Popover does: Escape closes the topmost
  // overlay only, and returns focus to the trigger. The restored focus is not
  // the user focusing the trigger, so it must not re-open the card (plan 515).
  // A press on the trigger is that trigger's gesture: claim it but let the click
  // close the card, because the press and the click arrive in separate tasks
  // (plan 583).
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      if (
        event.eventType !== "keyDown" &&
        pressedOn(renderer, trigger.current, event)
      ) {
        return;
      }
      close.current();
      if (event.eventType !== "keyDown") return;
      const target = trigger.current;
      if (target === null) return;
      if (renderer?.getFocusedElementId?.() !== target.id) {
        suppressFocusOpen.current = true;
      }
      renderer?.focusElement?.(target.id);
    });
  }, [open, renderer, suppressFocusOpen, trigger]);

  if (!open) return null;

  return (
    <FloatingLayer
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      role="group"
      aria-label={label}
      tabIndex={-1}
      ref={setSurface}
      {...rest}
      onMouseEnter={(event) => {
        hover.enter("content");
        rest.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hover.leave("content");
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
    'placement is measured once per open: `align="center"` is corrected from the panel\'s bounds and a snapped card near the window edge flips once instead of covering its trigger (0.10.0 snaps, it does not flip)',
  ],
  docs: "docs/preview-card.mdx",
  example: "examples/preview-card.example.tsx",
  testFile: "src/behaviour/preview-card.test.tsx",
} as const;
