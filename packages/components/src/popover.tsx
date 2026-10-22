/**
 * Popover: a floating panel anchored to the control that opened it.
 *
 * Positioning is GPUix's own `FloatingLayer` (`<anchored>` with collision
 * handling), so this component owns only the parts 0.11.0 leaves to the library:
 * the open state, the dismissal rules, the trigger's re-open guard and the
 * measured placement correction (the runtime snaps but does not flip, and its
 * `center` centres on the containing block; plan 323).
 *
 * Dismissal rules (all measured — plan 112 §1c):
 *
 * - Escape closes the topmost overlay and returns focus to this popover's
 *   trigger;
 * - Tab closes it and lets focus move on (a popover is not modal, so trapping
 *   would be wrong);
 * - an outside press closes it without moving focus, because the press already
 *   gave focus to whatever was pressed.
 *
 * A press outside fires before the click that follows it, so closing on the press
 * would let that same click toggle the trigger open again. The trigger therefore
 * remembers that it was pressed while open, and the close handler marks the next
 * click as already handled — the technique `@gpuix/react@0.11.0`'s Select uses.
 */

import type { PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { POPOVER_CONTENT } from "@gpuixui/tw";
import { Match } from "effect";
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
  presenceMotion,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** The rules a {@link PopoverContent} follows; throws outside a {@link Popover}. */
interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  /** Set by a dismissing outside press, consumed by the click that follows it. */
  readonly dismissedByOutsidePress: RefObject<boolean>;
}

const PopoverContext = createContext<PopoverContextValue | undefined>(
  undefined,
);

/** The popover a part belongs to. Throws when there is none (plan 110 §8.6). */
const usePopoverContext = (): PopoverContextValue => {
  const value = useContext(PopoverContext);
  if (value === undefined) {
    throw new Error("Popover parts must be used inside Popover");
  }
  return value;
};

/** {@link Popover} props. */
export interface PopoverProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

/**
 * The open state, the trigger's position and the dismissal bookkeeping. It paints
 * a positioning root, which is what GPUix's anchored layer measures against.
 */
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
  const dismissedByOutsidePress = useRef(false);

  const context = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, trigger, dismissedByOutsidePress }),
    [open, setOpen],
  );

  assertParts(popoverRoot, children);

  return (
    <PopoverContext.Provider value={context}>
      <div style={floatingRootStyle()}>{children}</div>
    </PopoverContext.Provider>
  );
};

/** Opens the popover it sits in. An ordinary button in every other respect. */
export const PopoverTrigger = ({ onClick, ref, ...rest }: ButtonProps) => {
  const { open, setOpen, trigger, dismissedByOutsidePress } =
    usePopoverContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        // The press that dismissed the popover owns this click: toggling here
        // would re-open what the same gesture just closed.
        if (dismissedByOutsidePress.current) {
          dismissedByOutsidePress.current = false;
          return;
        }
        setOpen(!open);
      }}
    />
  );
};

/** {@link PopoverContent} props: a floating surface, side and alignment. */
export interface PopoverContentProps extends FloatingContentProps {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Default `"bottom"`. Flipped once if the snapped surface would cover the trigger. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. `"center"` is measured from the trigger, not the runtime's `center`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between the trigger and the surface. Default `6`. */
  readonly sideOffset?: number;
  /** The margin a snapped surface keeps from the window edge. Default `8`. */
  readonly collisionPadding?: number;
  /** Added on top of the measured centre correction. Default `0`. */
  readonly alignOffset?: number;
}

/**
 * The floating surface, rendered while the popover is open. Focus moves into it
 * on open; Escape returns focus to the trigger, Tab and outside presses do not.
 */
export const PopoverContent = ({
  className,
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
}: PopoverContentProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger, dismissedByOutsidePress } =
    usePopoverContext();
  const renderer = useGpuix().renderer;
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const timing = useSurfaceTiming("normal");
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

  // A re-render must not re-push the layer: that would move the popover above an
  // overlay opened after it. The handler reads the latest setter through a ref.
  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => setOpen(false);
  });

  // A popover is a dismiss layer so a dialog underneath does not also close on
  // the same event. Escape restores focus to the trigger; an outside press must
  // not, because it already moved focus to whatever was pressed.
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
      // Mark the press so the click it belongs to cannot re-open the popover.
      dismissedByOutsidePress.current = true;
      queueMicrotask(() => {
        dismissedByOutsidePress.current = false;
      });
    }, depth);
  }, [depth, dismissedByOutsidePress, open, renderer, trigger]);

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
          // Tab is not a dismissal: close and let focus leave the popover.
          Match.when(isTab, () => setOpen(false)),
          Match.orElse(() => undefined),
        );
      }}
      style={mergeStyles(
        mergeStyles(overlaySurfaceStyle(POPOVER_CONTENT, className, theme), {
          minWidth: 200,
          pointerEvents: presence.present ? "auto" : "none",
        }),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
    </FloatingLayer>
  );
};

/** Every part of Popover, so a misplaced sibling is named. */
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
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
