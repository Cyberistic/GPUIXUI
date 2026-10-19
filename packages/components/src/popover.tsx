/**
 * Popover: a floating panel anchored to the control that opened it.
 *
 * Positioning is GPUix's own `FloatingLayer` (`<anchored>` with collision
 * handling), so this component owns only the parts 0.10.0 leaves to the library:
 * the open state, the dismissal rules and the measured placement correction (the
 * runtime snaps but does not flip, and its `center` centres on the containing
 * block; plan 323).
 *
 * Dismissal rules (all measured — plan 112 §1c):
 *
 * - Escape closes the topmost overlay and returns focus to this popover's
 *   trigger;
 * - Tab walks the surface's own tab stops and closes only when it leaves, then
 *   focus continues with the app control after the trigger (plan 521). A
 *   popover is not modal, so trapping would be wrong; a close without moving
 *   focus would strand the user on an unmounted surface;
 * - an outside press closes it without moving focus, because the press already
 *   gave focus to whatever was pressed. A press on this popover's own trigger is
 *   not an outside press: the trigger's click closes it, in a later task than the
 *   press (plan 583).
 *
 * A press outside fires before the click that follows it, so closing on the press
 * would let that same click toggle the trigger open again. That is why the layer
 * reads the press position and leaves its own trigger's gesture alone, instead of
 * marking the click.
 */

import type { PublicInstance } from "@gpuix/react";
import {
  AnimatePresence,
  motion,
  useGpuix,
  type NativeRenderer,
} from "@gpuix/react";
import * as Arr from "effect/Array";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { motionFromClasses } from "@gpuixui/tw";
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
import { isDismiss, isTab } from "./internal/key.js";
import { motionProps } from "./internal/motion.js";
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

/** The rules a {@link PopoverContent} follows; throws outside a {@link Popover}. */
interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
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

/** Opens the popover it sits in. An ordinary button in every other respect. */
export const PopoverTrigger = ({ onClick, ref, ...rest }: ButtonProps) => {
  const { open, setOpen, trigger } = usePopoverContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
    />
  );
};

/** {@link PopoverContent} props: a floating surface, side and alignment. */
export interface PopoverContentProps extends FloatingContentProps {
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

/** Whether `innerId`'s centre lies inside `outerId`: the renderer exposes bounds, not ancestry. */
const inside = (
  renderer: NativeRenderer | null,
  outerId: number,
  innerId: number,
): boolean => {
  const outer = renderer?.getElementBounds?.(outerId) ?? null;
  const inner = renderer?.getElementBounds?.(innerId) ?? null;
  if (outer === null || inner === null) return false;
  const x = inner.x + inner.width / 2;
  const y = inner.y + inner.height / 2;
  return (
    x >= outer.x &&
    x <= outer.x + outer.width &&
    y >= outer.y &&
    y <= outer.y + outer.height
  );
};

/**
 * The surface's first tab stop. A hidden probe would fire the control's
 * `onFocus` (measured), so the only probe is the one that moves focus in on
 * open — the focus move the popover wants anyway. `focusNextWithin` keeps focus
 * on the surface when it has no tab stops.
 */
const firstTabStopOf = (
  renderer: NativeRenderer | null,
  surfaceId: number,
): number | null => {
  renderer?.focusNextWithin?.(surfaceId);
  const focused = renderer?.getFocusedElementId?.() ?? null;
  return focused !== null &&
    focused !== surfaceId &&
    inside(renderer, surfaceId, focused)
    ? focused
    : null;
};

/** The side-specific shadcn slide class (the zoom is unsupported by GPUI). */
const SLIDE: Readonly<Record<"top" | "right" | "bottom" | "left", string>> = {
  bottom: "data-open:slide-in-from-top-2",
  top: "data-open:slide-in-from-bottom-2",
  left: "data-open:slide-in-from-right-2",
  right: "data-open:slide-in-from-left-2",
};

/**
 * The floating surface, rendered while the popover is open. Focus moves to its
 * first tab stop on open; Tab walks those stops and leaves at either end, where
 * focus continues with the app control after the trigger. The exit is animated
 * by `AnimatePresence`; the surface is inert until it unmounts (plan 525).
 */
export const PopoverContent = (props: PopoverContentProps) => {
  const { open } = usePopoverContext();
  return (
    <AnimatePresence initial={false}>
      {open ? <PopoverSurface key="popover" {...props} /> : null}
    </AnimatePresence>
  );
};

/** The surface itself; mounted while open and through its exit motion. */
const PopoverSurface = ({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset = 0,
  collisionPadding = 8,
  autoFocus = true,
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
  /** The first tab stop measured when the surface opened, and the stops visited. */
  const firstTabStop = useRef<number | null>(null);
  const visitedForward = useRef<ReadonlyArray<number>>([]);
  const visitedBackward = useRef<ReadonlyArray<number>>([]);
  const placement = usePlacement({
    // The surface exists only while open or exiting, so a close must not reset
    // the measured placement and make the exit ghost jump (plan 525).
    open: true,
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

  // Focus enters the surface: the first tab stop when it has one, the surface
  // itself otherwise. `autoFocus={false}` leaves the caller's focus alone.
  useLayoutEffect(() => {
    firstTabStop.current = null;
    visitedForward.current = [];
    visitedBackward.current = [];
    const element = surface.current;
    if (!open || element === null || !autoFocus) return;
    const first = firstTabStopOf(renderer, element.id);
    if (first === null) {
      renderer?.focusElement?.(element.id);
      return;
    }
    firstTabStop.current = first;
    visitedForward.current = [first];
  }, [autoFocus, open, renderer]);

  // A popover is a dismiss layer so a dialog underneath does not also close on
  // the same event. Escape restores focus to the trigger; an outside press must
  // not, because it already moved focus to whatever was pressed. A press on the
  // trigger itself is that trigger's gesture: claim it (so an enclosing dialog
  // stays open) and let the click close the popover, because the press and the
  // click arrive in separate tasks (plan 583).
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
      if (event.eventType === "keyDown") {
        const target = trigger.current;
        if (target !== null) renderer?.focusElement?.(target.id);
      }
    });
  }, [open, renderer, trigger]);

  /** Close and hand focus to the app control after (or before) the trigger. */
  const leave = (backwards: boolean): void => {
    setOpen(false);
    const target = trigger.current;
    if (target === null) return;
    renderer?.focusElement?.(target.id);
    if (backwards) renderer?.focusPrevious?.();
    else renderer?.focusNext?.();
  };

  /**
   * Tab moves through the surface's tab stops. The cycle is bounded by the
   * stops visited since it opened: a wrap closes the popover. The visited list,
   * not a control's identity, is what keeps a content change from trapping the
   * user.
   */
  const handleTab = (backwards: boolean): void => {
    const element = surface.current;
    if (element === null) return;
    const current = renderer?.getFocusedElementId?.() ?? null;
    const first = firstTabStop.current;

    if (backwards) {
      if (first === null || current === first) {
        leave(true);
        return;
      }
      renderer?.focusPreviousWithin?.(element.id);
      const previous = renderer?.getFocusedElementId?.() ?? null;
      if (
        previous === null ||
        previous === element.id ||
        !inside(renderer, element.id, previous) ||
        Arr.contains(visitedBackward.current, previous)
      ) {
        leave(true);
        return;
      }
      visitedBackward.current = Arr.append(visitedBackward.current, previous);
      return;
    }

    renderer?.focusNextWithin?.(element.id);
    const next = renderer?.getFocusedElementId?.() ?? null;
    if (
      next === null ||
      next === element.id ||
      !inside(renderer, element.id, next)
    ) {
      leave(false);
      return;
    }
    if (first === null) {
      // Nothing was seeded (`autoFocus={false}`): only a move from the surface
      // can name the first stop; a control's own Tab leaves, as before.
      if (current !== element.id) {
        leave(false);
        return;
      }
      firstTabStop.current = next;
      visitedForward.current = [next];
      return;
    }
    if (next === first || Arr.contains(visitedForward.current, next)) {
      leave(false);
      return;
    }
    visitedForward.current = Arr.append(visitedForward.current, next);
  };

  const surfaceMotion = motionProps(
    motionFromClasses(
      `data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 ${SLIDE[placement.side]} duration-100`,
      theme,
    ),
  );

  // The anchored host is the position measured against the popover root, so the
  // motion wrapper must live *inside* it: wrapping the host moves the anchor.
  const motionSurface = (
    <motion.div {...surfaceMotion}>
      <div
        {...rest}
        ref={setSurface}
        tabIndex={rest.tabIndex ?? -1}
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
            Match.when(isTab, (value) => {
              handleTab(value.modifiers?.shift === true);
            }),
            Match.orElse(() => undefined),
          );
        }}
        style={mergeStyles(
          {
            ...textStyle(theme, "body"),
            minWidth: 200,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.popover,
            color: theme.colors.popoverForeground,
            borderRadius: theme.radius.lg,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            boxShadow: elevationShadow(theme, "md"),
            pointerEvents: open ? "auto" : "none",
          },
          style,
        )}
      >
        {children}
      </div>
    </motion.div>
  );

  return (
    <FloatingLayer
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      tabIndex={-1}
      autoFocus={false}
      style={{ backgroundColor: "transparent" }}
    >
      {motionSurface}
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
    "Tab walks the surface's tab stops; the first stop is measured once on open, and a first control removed while open makes Tab close instead of cycle",
    "zoom-in-95/zoom-out-95 are unsupported: GPUI has no transform, so the panel fades and slides on top/left instead of scaling",
  ],
  docs: "docs/popover.mdx",
  example: "examples/popover.example.tsx",
  testFile: "src/behaviour/popover.test.tsx",
} as const;
