/** @jsxImportSource @gpuix/react */
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingAlign,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { POPOVER_CONTENT } from "@gpuixui/tw";
import {
  Button,
  type ButtonProps as PrimitiveButtonProps,
} from "@gpuixui/primitives/button";
import { Match } from "effect";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import { isDismiss, isTab } from "./internal/key.js";
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
import { isDismissalClick } from "./internal/dismiss-layer.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

const popoverAlign = (align: unknown): FloatingAlign =>
  isAlign(align) ? align : "center";

interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
}

const PopoverContext = createContext<PopoverContextValue | undefined>(
  undefined,
);

const usePopoverContext = (): PopoverContextValue => {
  const value = useContext(PopoverContext);
  if (value === undefined) {
    throw new Error("Popover parts must be used inside Popover");
  }
  return value;
};

export interface PopoverProps {
  readonly open?: boolean;

  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

export const Popover = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);

  const context = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, trigger }),
    [open, setOpen],
  );

  assertParts(popoverRoot, children);

  return (
    <PopoverContext.Provider value={context}>
      <div style={floatingRootStyle()}>{children}</div>
    </PopoverContext.Provider>
  );
};

export interface PopoverTriggerProps extends PrimitiveButtonProps {
  readonly onClick?: (event: EventPayload) => void;
}

export const PopoverTrigger = ({
  onClick,
  onActivate,
  ref,
  variant = "secondary",
  ...rest
}: PopoverTriggerProps) => {
  const { open, setOpen, trigger } = usePopoverContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      variant={variant}
      aria-expanded={open}
      onActivate={(event) => {
        (onActivate ?? onClick)?.(event);

        if (isDismissalClick(event)) return;
        setOpen(!open);
      }}
    />
  );
};

export interface PopoverContentProps extends FloatingContentProps {
  readonly className?: string;

  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly collisionPadding?: number;

  readonly alignOffset?: number;
}

export const PopoverContent = ({
  className,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  alignOffset = 0,
  collisionPadding = 8,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: PopoverContentProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger } = usePopoverContext();
  const renderer = useGpuix().renderer;
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);
  const placement = usePlacement({
    open: presence.mounted,
    side,
    align: popoverAlign(align),
    margin: collisionPadding,
    trigger,
    surface,
  });

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => setOpen(false);
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
    }, depth);
  }, [depth, open, renderer, trigger]);

  if (!presence.mounted) return null;

  return (
    <FloatingLayer
      motion={presenceMotion(fadeFromAnchor(placement.side, 8), presence)}
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      tabIndex={-1}
      autoFocus
      ref={setSurface}
      {...rest}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        Match.value(event).pipe(
          Match.when(isDismiss, (value) => {
            dismissTopLayer(value);
          }),

          Match.when(isTab, () => setOpen(false)),
          Match.orElse(() => undefined),
        );
      }}
      style={mergeStyles(
        mergeStyles(
          overlaySurfaceStyle(POPOVER_CONTENT, className, theme, "lg"),

          {
            minWidth: 200,
            position: "relative",
            ...presenceStyle(presence.present),
          },
        ),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
      <PresenceShield present={presence.present} />
    </FloatingLayer>
  );
};

const popoverParts: ReadonlyArray<PartComponent> = [
  Popover,
  PopoverTrigger,
  PopoverContent,
];

const popoverRoot: PartsContract = {
  parent: "Popover",
  family: popoverParts,
  accepts: [PopoverTrigger, PopoverContent],
  hint: "Put PopoverTrigger and PopoverContent directly inside Popover.",
};

export const popoverMeta = {
  name: "Popovers",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "positioning is GPUix's anchored layer: it snaps but does not flip, so the component flips once when the snapped surface would cover its trigger; no arrow or custom anchor element",
    'the runtime\'s `align="center"` centres on the containing block, so the component maps it to a measured `start` offset; the snap margin wins near a window edge',
    "an outside press gives focus to whatever was pressed, so focus is not returned to the trigger (Escape is)",
  ],
  docs: "docs/popover.mdx",
  example: "examples/popover.example.tsx",
  testFile: "src/behaviour/popover.test.tsx",
} as const;
