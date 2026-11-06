/** @jsxImportSource @gpuix/react */
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

interface HoverCardContextValue {
  readonly open: boolean;
  readonly hover: ReturnType<typeof useHoverDelays>;
  readonly trigger: RefObject<PublicInstance | null>;

  readonly dismissedByOutsidePress: RefObject<boolean>;
}

const HoverCardContext = createContext<HoverCardContextValue | undefined>(
  undefined,
);

const useHoverCard = (): HoverCardContextValue => {
  const value = useContext(HoverCardContext);
  if (value === undefined) {
    throw new Error("HoverCard parts must be used inside HoverCard");
  }
  return value;
};

export interface HoverCardProps {
  readonly open?: boolean;

  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly openDelay?: number;

  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

const OPEN_DELAY_MS = 700;
const CLOSE_DELAY_MS = 300;

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

export type HoverCardTriggerProps = ButtonProps;

export const HoverCardTrigger = ({
  onClick,
  onFocus,
  onBlur,
  ref,
  disabled = false,
  variant = "link",
  ...rest
}: HoverCardTriggerProps) => {
  const { open, hover, trigger, dismissedByOutsidePress } = useHoverCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  const pressed = useRef(false);

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

export interface HoverCardContentProps {
  readonly label?: string;

  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly collisionPadding?: number;

  readonly className?: string;

  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: PartChildren;
}

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
