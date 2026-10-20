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
import { AnimatePresence, useGpuix, type NativeRenderer } from "@gpuix/react";
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
import { useCloseFocus } from "./internal/close-focus.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import {
  OverlayHostProvider,
  useOverlayHost,
} from "./internal/overlay-host.js";
import { claimEvent } from "./internal/event-claim.js";
import { isDismiss, isTab } from "./internal/key.js";
import { MotionSurface, motionProps } from "./internal/motion.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { offsetOf } from "./internal/placement.js";
import { ownsSurface, pressedOn } from "./internal/pointer.js";
import { useMergedRef } from "./internal/ref.js";
import { elevationShadow, textStyle, useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

/** Where focus goes when a close is accepted. */
type PopoverCloseFocus = "trigger" | "next" | "previous" | "none";

/** The rules a {@link PopoverContent} follows; throws outside a {@link Popover}. */
interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Request a close; focus moves only when the close is accepted. */
  readonly requestClose: (focus: PopoverCloseFocus) => void;
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
  const depth = useOverlayHost().depth + 1;
  const renderer = useGpuix().renderer;
  const trigger = useRef<PublicInstance | null>(null);
  // A close the caller refuses must leave the surface and the user's focus
  // alone, so the restore waits for the observed `open -> false` transition.
  const requestClose = useCloseFocus<PopoverCloseFocus>(
    open,
    () => setOpen(false),
    (focus) => {
      if (focus === "none") return;
      const target = trigger.current;
      if (target === null) return;
      renderer?.focusElement?.(target.id);
      if (focus === "next") renderer?.focusNext?.();
      if (focus === "previous") renderer?.focusPrevious?.();
    },
  );

  const context = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, requestClose, trigger }),
    [open, requestClose, setOpen],
  );

  assertParts(popoverRoot, children);

  return (
    <PopoverContext.Provider value={context}>
      <OverlayHostProvider depth={depth} contentId={undefined}>
        <div style={floatingRootStyle()}>{children}</div>
      </OverlayHostProvider>
    </PopoverContext.Provider>
  );
};

/** Opens the popover it sits in. An ordinary button in every other respect. */
export const PopoverTrigger = ({ onClick, ref, ...rest }: ButtonProps) => {
  const { open, setOpen, requestClose, trigger } = usePopoverContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        if (open) requestClose("none");
        else setOpen(true);
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
  const { open, requestClose, trigger } = usePopoverContext();
  const depth = useOverlayHost().depth;
  const renderer = useGpuix().renderer;
  const gap = offsetOf(sideOffset, 6);
  const extra = offsetOf(alignOffset, 0);
  const margin = offsetOf(collisionPadding, 8);
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  /** The first tab stop measured when the surface opened. */
  const firstTabStop = useRef<number | null>(null);
  /**
   * The stops walked since the walk last changed direction, and that direction.
   * Arriving at a stop this walk already passed is a wrap and closes the
   * popover; the list, not a control's identity, keeps a content change from
   * trapping the user. Turning round starts a new walk, so a stop the user
   * stepped back over is reachable again (plan 718).
   */
  const walk = useRef<{
    readonly backwards: boolean;
    readonly stops: ReadonlyArray<number>;
  }>({ backwards: false, stops: [] });
  const placement = usePlacement({
    // The surface exists only while open or exiting, so a close must not reset
    // the measured placement and make the exit ghost jump (plan 525).
    open: true,
    side,
    align,
    margin,
    trigger,
    surface,
  });

  // Focus enters the surface: the first tab stop when it has one, the surface
  // itself otherwise. `autoFocus={false}` leaves the caller's focus alone.
  useLayoutEffect(() => {
    firstTabStop.current = null;
    walk.current = { backwards: false, stops: [] };
    const element = surface.current;
    if (!open || element === null || !autoFocus) return;
    const first = firstTabStopOf(renderer, element.id);
    if (first === null) {
      renderer?.focusElement?.(element.id);
      return;
    }
    firstTabStop.current = first;
    walk.current = { backwards: false, stops: [first] };
  }, [autoFocus, open, renderer]);

  // A popover is a dismiss layer so a dialog underneath does not also close on
  // the same event. Escape restores focus to the trigger; an outside press must
  // not, because it already moved focus to whatever was pressed. A press on the
  // trigger itself is that trigger's gesture: claim it (so an enclosing dialog
  // stays open) and let the click close the popover, because the press and the
  // click arrive in separate tasks (plan 583).
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(
      (event) => {
        if (
          event.eventType !== "keyDown" &&
          pressedOn(renderer, trigger.current, event)
        ) {
          return;
        }
        requestClose(event.eventType === "keyDown" ? "trigger" : "none");
      },
      depth,
      ownsSurface(renderer, () => surface.current?.id),
    );
  }, [depth, open, renderer, requestClose, surface, trigger]);

  /** Close and, once accepted, hand focus to the app control after (or before) the trigger. */
  const leave = (backwards: boolean): void => {
    requestClose(backwards ? "previous" : "next");
  };

  /**
   * Tab moves through the surface's tab stops. A wrap — arriving at a stop this
   * walk already passed — closes the popover, as does leaving the surface. The
   * walk starts over when the user turns round, so stepping back over a control
   * does not end the walk (plan 718); the list, not a control's identity, is
   * what keeps a content change from trapping the user.
   */
  const handleTab = (backwards: boolean): void => {
    const element = surface.current;
    if (element === null) return;
    const current = renderer?.getFocusedElementId?.() ?? null;
    const first = firstTabStop.current;

    // A refused close must leave the user on the stop they were on, so undo the
    // inspecting move before asking; the accepted close moves focus itself.
    const stay = (): void => {
      if (current !== null) renderer?.focusElement?.(current);
    };

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
        (walk.current.backwards && Arr.contains(walk.current.stops, previous))
      ) {
        stay();
        leave(true);
        return;
      }
      walk.current = {
        backwards: true,
        stops: walk.current.backwards
          ? Arr.append(walk.current.stops, previous)
          : [previous],
      };
      return;
    }

    renderer?.focusNextWithin?.(element.id);
    const next = renderer?.getFocusedElementId?.() ?? null;
    if (
      next === null ||
      next === element.id ||
      !inside(renderer, element.id, next)
    ) {
      stay();
      leave(false);
      return;
    }
    if (first === null) {
      // Nothing was seeded (`autoFocus={false}`): only a move from the surface
      // can name the first stop; a control's own Tab leaves, as before.
      if (current !== element.id) {
        stay();
        leave(false);
        return;
      }
      firstTabStop.current = next;
      walk.current = { backwards: false, stops: [next] };
      return;
    }
    if (
      next === first ||
      (!walk.current.backwards && Arr.contains(walk.current.stops, next))
    ) {
      stay();
      leave(false);
      return;
    }
    walk.current = {
      backwards: false,
      stops: walk.current.backwards
        ? [next]
        : Arr.append(walk.current.stops, next),
    };
  };

  const surfaceMotion = motionProps(
    motionFromClasses(
      `data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 ${SLIDE[placement.side]} duration-100`,
      theme,
    ),
  );

  // The anchored host is the position measured against the popover root, so the
  // motion wrapper must live *inside* it: wrapping the host moves the anchor.
  const surfaceTestId =
    rest.testId === undefined ? undefined : `${rest.testId}-surface`;
  const motionSurface = (
    <MotionSurface testId={surfaceTestId} {...surfaceMotion}>
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
              // The walk moves focus itself, so an enclosing modal must not
              // trap the same event and move it again (plan 719).
              claimEvent(value);
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
    </MotionSurface>
  );

  return (
    <FloatingLayer
      side={placement.side}
      align={placement.align}
      sideOffset={gap}
      alignOffset={placement.alignOffset + extra}
      collisionPadding={margin}
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
  focusable: true,
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
