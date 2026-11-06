/** @jsxImportSource @gpuix/react */
import type { EventPayload, KeyEvent, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingAlign,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { PREVIEW_CARD_CONTENT } from "@gpuixui/tw";
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
import { useHoverDelays, type HoverControls } from "./internal/hover.js";
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
import { isAlign } from "./internal/placement.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

const previewCardAlign = (align: unknown): FloatingAlign =>
  isAlign(align) ? align : "center";

interface PreviewCardContextValue {
  readonly open: boolean;
  readonly hover: HoverControls;
  readonly trigger: RefObject<PublicInstance | null>;

  readonly dismissedByOutsidePress: RefObject<boolean>;
}

const PreviewCardContext = createContext<PreviewCardContextValue | undefined>(
  undefined,
);

const usePreviewCard = (): PreviewCardContextValue => {
  const value = useContext(PreviewCardContext);
  if (value === undefined) {
    throw new Error("PreviewCard parts must be used inside PreviewCard");
  }
  return value;
};

export interface PreviewCardProps {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly openDelay?: number;

  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

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
  const hover = useHoverDelays({
    open,
    setOpen,
    openDelay: hoverDelay(openDelay, OPEN_DELAY_MS),
    closeDelay: hoverDelay(closeDelay, CLOSE_DELAY_MS),
  });

  const context = useMemo<PreviewCardContextValue>(
    () => ({ open, hover, trigger, dismissedByOutsidePress }),
    [hover, open],
  );

  assertParts(previewCardRoot, children);

  return (
    <PreviewCardContext.Provider value={context}>
      <div style={floatingRootStyle()}>{children}</div>
    </PreviewCardContext.Provider>
  );
};

export const PreviewCardTrigger = ({
  onClick,
  ref,
  disabled = false,
  ...rest
}: ButtonProps) => {
  const { open, hover, trigger, dismissedByOutsidePress } = usePreviewCard();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  useLayoutEffect(() => {
    if (disabled) hover.cancelOpening();
  }, [disabled, hover]);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      aria-expanded={open}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (disabled) return;
        hover.pointer("trigger", true);
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        if (disabled) return;
        hover.pointer("trigger", false);
      }}
      onClick={(event: EventPayload) => {
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
        if (isDismiss(event) && open) hover.request(false);
      }}
    />
  );
};

export interface PreviewCardContentProps extends FloatingContentProps {
  readonly label: string;

  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly collisionPadding?: number;

  readonly alignOffset?: number;

  readonly className?: string;
}

export const PreviewCardContent = ({
  label,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  collisionPadding = 8,
  alignOffset = 0,
  className,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: PreviewCardContentProps) => {
  const theme = useTheme();
  const { open, hover, trigger, dismissedByOutsidePress } = usePreviewCard();
  const renderer = useGpuix().renderer;
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);

  const timing = useSurfaceTiming("fast");
  const presence = useSurfacePresence(open, timing);
  const placement = usePlacement({
    open: presence.mounted,
    side,
    align: previewCardAlign(align),
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
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      role="group"
      aria-label={label}
      tabIndex={-1}
      ref={setSurface}
      {...rest}
      onMouseEnter={(event) => {
        hover.pointer("content", true);
        rest.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hover.pointer("content", false);
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
