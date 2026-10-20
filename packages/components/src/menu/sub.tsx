/**
 * The shared submenu parts: one secondary level behind a menu row.
 *
 * The Dropdown and Context menus both compose these; their public part names
 * differ, the behaviour does not. A submenu owns its open state and its own
 * dismiss layer, so `Escape` closes one level at a time.
 *
 * A press on the submenu surface is **outside the parent surface** (the runtime
 * compares geometry), so the parent's outside handler offers it to this layer
 * first. The layer must ignore that press: closing would unmount the row before
 * the click lands on it. {@link MenuSubContent} therefore checks every enclosing
 * menu surface before treating a mouse-down as a dismissal — a press on a row of
 * an enclosing submenu is not an outside press on the deeper level.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { pushDismissLayer } from "../internal/dismiss-layer.js";
import {
  OverlayHostProvider,
  useOverlayHost,
} from "../internal/overlay-host.js";
import { claimEvent } from "../internal/event-claim.js";
import { useHoverTravel, type HoverTravel } from "../internal/hover.js";
import { isDown, isLeft, isRight, isUp } from "../internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "../internal/parts.js";
import { useMergedRef } from "../internal/ref.js";
import { useTheme } from "../internal/theme.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  type MenuItemProps,
} from "./item.js";
import { MenuRadioGroup, MenuRadioItem } from "./radio.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type LeaveDirection,
  type MenuCloseReason,
} from "./state.js";
import { resolveSubmenuPoint } from "./sub-placement.js";
import { MenuSurface, MenuSurfaceStack } from "./surface.js";

/** The rules a {@link MenuSubContent} follows; throws outside a sub. */
interface SubContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** The SubTrigger row: it positions the surface and receives returned focus. */
  readonly trigger: RefObject<PublicInstance | null>;
  /** Set by the content while mounted: focus the submenu's first or last row. */
  readonly focusEdge: RefObject<((edge: "first" | "last") => void) | null>;
  /** The pointer policy: hover opens at once, a leave closes after the delay. */
  readonly hover: HoverTravel;
  /** Set by the content: its own close, so a hover leave returns focus. */
  readonly hoverClose: RefObject<(() => void) | null>;
}

const SubContext = createContext<SubContextValue | undefined>(undefined);

/** The submenu a part belongs to. Throws when there is none (plan 110 §8.6). */
const useSubContext = (): SubContextValue => {
  const value = useContext(SubContext);
  if (value === undefined) {
    throw new Error("Submenu parts must be used inside a Submenu");
  }
  return value;
};

/** {@link MenuSub} props. */
export interface MenuSubProps {
  /** Milliseconds after leaving the row and its panel before closing. Default `150`. */
  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

/**
 * A group of actions behind one secondary level. It owns its open state; only
 * one submenu per menu is open at a time.
 */
export const MenuSub = ({ closeDelay = 150, children }: MenuSubProps) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);
  const focusEdge = useRef<((edge: "first" | "last") => void) | null>(null);
  // The content registers its own close: `close("dismiss")` closes one level
  // and returns focus to the row, so a hover leave cannot strand focus.
  const hoverClose = useRef<(() => void) | null>(null);
  const hover = useHoverTravel({
    isOpen: () => open,
    close: () => {
      const closeContent = hoverClose.current;
      if (closeContent === null) setOpen(false);
      else closeContent();
    },
    // Hover opens at once (the documented submenu rule); only the leave waits,
    // so the pointer can cross the gap into the panel.
    openDelay: 0,
    closeDelay,
  });
  const value = useMemo<SubContextValue>(
    () => ({ open, setOpen, trigger, focusEdge, hover, hoverClose }),
    [hover, open],
  );

  // A close from Escape, a row or an outside press unmounts the panel without
  // a `mouseLeave`; forget the pointer so the next open starts clean.
  useLayoutEffect(() => {
    if (!open) hover.reset();
  }, [hover, open]);

  assertParts(menuSub, children);

  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

/** {@link MenuSubTrigger} props: an ordinary row that opens a submenu. */
export interface MenuSubTriggerProps extends Omit<
  MenuItemProps,
  "onSelect" | "closeOnSelect" | "tone"
> {}

/**
 * The row that opens its submenu. It is a normal menu row: arrow keys and
 * type-ahead treat it like an action, and clicking, Enter, Space, `ArrowRight`
 * or hover opens the secondary level.
 */
export const MenuSubTrigger = ({
  children,
  trailing,
  textValue,
  disabled = false,
  onKeyDown,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  ref,
  ...rest
}: MenuSubTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger, focusEdge, hover } = useSubContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <MenuItem
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      closeOnSelect={false}
      aria-expanded={open}
      textValue={textValue}
      onSelect={() => setOpen(true)}
      onFocus={(event) => {
        // A pointer press focuses the row after React has opened the submenu
        // and moved focus to its first row; the row's own focus event is the
        // last word, so hand focus back into the submenu.
        if (open) focusEdge.current?.("first");
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        // A disabled row never opens, by any path (plan 393); the pointer may
        // still cross it on the way to another row.
        if (!disabled) hover.enter("trigger", () => setOpen(true));
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hover.leave("trigger");
        onMouseLeave?.(event);
      }}
      onKeyDown={(event) => {
        if (!disabled) {
          if (!open) {
            if (isRight(event)) setOpen(true);
          } else if (isDown(event) || isUp(event)) {
            // Focus is still on the trigger (a pointer open): Down/Up enter the
            // submenu instead of moving the parent highlight past it.
            claimEvent(event);
            focusEdge.current?.(isDown(event) ? "first" : "last");
          } else if (isLeft(event)) {
            setOpen(false);
          }
        }
        onKeyDown?.(event);
      }}
      trailing={
        trailing ?? (
          <Icon
            name="chevron-right"
            color={theme.colors.mutedForeground}
            size="sm"
          />
        )
      }
    >
      {children}
    </MenuItem>
  );
};

/** The gap between the trigger row and its submenu surface, in pixels. */
const SUBMENU_GAP = 4;

/** The margin the submenu keeps from the window edge, matching `snapMargin`. */
const SUBMENU_MARGIN = 8;

/** {@link MenuSubContent} props: the secondary menu surface. */
export interface MenuSubContentProps extends Omit<Props, "children"> {
  /** The submenu's accessible name. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/**
 * The floating second level, rendered only while open. Its position is measured
 * once per open: the row's right edge when the surface fits there, otherwise its
 * left edge; a surface taller than the room below is bottom-aligned to the row
 * (plan 382). It owns its dismiss layer so Escape closes one level only.
 */
export const MenuSubContent = ({
  label,
  children,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  style,
  testId,
  ref,
  ...rest
}: MenuSubContentProps) => {
  const depth = useOverlayHost().depth + 1;
  const renderer = useGpuix().renderer;
  const { open, setOpen, trigger, focusEdge, hover, hoverClose } =
    useSubContext();
  const parent = useMenuContext();
  assertParts(menuSubContent, children);
  const parentClose = parent.close;
  const parentLeave = parent.leave;
  const parentClaim = parent.claimSubmenu;
  const restoreFocus = useRef(false);
  const surface = useRef<PublicInstance | null>(null);
  const enclosing = useContext(MenuSurfaceStack);
  const stack = useMemo(
    () => Arr.append(enclosing, surface),
    [enclosing, surface],
  );

  const close = useCallback(
    (reason: MenuCloseReason) => {
      restoreFocus.current = reason === "dismiss";
      setOpen(false);
      Match.value(reason).pipe(
        Match.when("activate", () => parentClose("activate")),
        Match.when("outside", () => parentClose("outside")),
        Match.when("dismiss", () => undefined),
        Match.exhaustive,
      );
    },
    [parentClose, setOpen],
  );

  // Tab leaves the whole menu, not one level: a submenu is a detail of one
  // widget, and the root is the only part with a trigger to continue from.
  const leave = useCallback(
    (direction: LeaveDirection) => {
      setOpen(false);
      parentLeave(direction);
    },
    [parentLeave, setOpen],
  );

  // The hover policy lives in `MenuSub`; it closes through this level's own
  // `close("dismiss")`, so focus returns to the row and the parent stays open.
  useLayoutEffect(() => {
    hoverClose.current = () => close("dismiss");
    return () => {
      hoverClose.current = null;
    };
  }, [close, hoverClose]);

  const menu = useMenuState(close, leave);

  // The trigger stays focusable while its submenu is open. Down/Up and the
  // row's own focus event use this to enter the submenu at the right edge.
  useLayoutEffect(() => {
    focusEdge.current = (edge) =>
      menu.step({ _tag: edge === "first" ? "First" : "Last" });
  }, [focusEdge, menu]);

  useLayoutEffect(
    () => () => {
      focusEdge.current = null;
    },
    [focusEdge],
  );

  // The dismiss handler must keep reading the latest `close`, but the layer
  // itself must not be re-pushed on every render: that would move it above an
  // overlay opened after it.
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  /**
   * Whether a pointer event landed on this submenu or any surface enclosing it.
   * A press on an enclosing row must reach that row instead of closing the
   * parent before the click lands.
   */
  const insideSurface = useCallback(
    (event: EventPayload): boolean => {
      const { x, y } = event;
      if (x === undefined || y === undefined) return false;
      return Arr.some(stack, (ref) => {
        const instance = ref.current;
        if (instance === null) return false;
        const bounds = renderer?.getElementBounds?.(instance.id);
        if (bounds === null || bounds === undefined) return false;
        return (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        );
      });
    },
    [renderer, stack],
  );

  const attachSurface = useCallback((next: PublicInstance | null) => {
    surface.current = next;
  }, []);
  const setSurface = useMergedRef<PublicInstance | null>(attachSurface, ref);

  useLayoutEffect(() => {
    if (!open) return;
    const release = parentClaim(() => setOpen(false));
    const pop = pushDismissLayer((event) => {
      if (event.eventType === "mouseDownOutside" && insideSurface(event))
        return;
      closeRef.current(event.eventType === "keyDown" ? "dismiss" : "outside");
    }, depth);
    return () => {
      pop();
      release();
    };
  }, [depth, insideSurface, open, parentClaim, setOpen]);

  useLayoutEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    const instance = trigger.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  }, [open, renderer, trigger]);

  const [point, setPoint] = useState<{ x: number; y: number } | undefined>();

  useLayoutEffect(() => {
    if (!open) {
      setPoint(undefined);
      return;
    }
    const instance = trigger.current;
    if (instance === null) return;
    Option.match(
      Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
      {
        onNone: () => undefined,
        onSome: (bounds) =>
          setPoint({
            x: bounds.x + bounds.width + SUBMENU_GAP,
            y: bounds.y,
          }),
      },
    );
  }, [open, renderer, trigger]);

  // The side is decided once, after the surface has a size to measure: the
  // runtime snaps but never flips, so a right-edge submenu would be clamped
  // back over its row (plan 382).
  const settled = useRef(false);
  useLayoutEffect(() => {
    if (!open) {
      settled.current = false;
      return;
    }
    if (point === undefined || settled.current) return;
    const measured = Option.all({
      row: Option.flatMap(Option.fromNullishOr(trigger.current), (element) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
      ),
      surface: Option.flatMap(
        Option.fromNullishOr(surface.current),
        (element) =>
          Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
      ),
      window: Option.fromNullishOr(renderer?.getWindowSize?.()),
    });
    if (Option.isNone(measured)) return;
    settled.current = true;
    setPoint(
      resolveSubmenuPoint({
        ...measured.value,
        gap: SUBMENU_GAP,
        margin: SUBMENU_MARGIN,
      }),
    );
  }, [open, point, renderer, trigger]);

  // Focus the first row once the submenu's rows have registered. The ref keeps
  // the effect from re-running after its own focus move changes the highlight.
  const pendingFocus = useRef(true);
  useLayoutEffect(() => {
    if (!open) {
      pendingFocus.current = true;
      return;
    }
    if (!pendingFocus.current || menu.rows.length === 0) return;
    pendingFocus.current = false;
    menu.step({ _tag: "First" });
  }, [menu, open]);

  if (!open || point === undefined) return null;

  return (
    <MenuContext.Provider value={menu}>
      <MenuSurfaceStack.Provider value={stack}>
        <anchored
          position={point}
          fit="snap"
          snapMargin={SUBMENU_MARGIN}
          deferred
          priority={1}
          occlude
        >
          <MenuSurface
            ref={setSurface}
            testId={testId}
            label={label}
            {...rest}
            onMouseEnter={(event) => {
              // Entering the panel cancels the row's pending close, so the
              // pointer may cross the gap from the row into its surface.
              hover.enter("content");
              onMouseEnter?.(event);
            }}
            onMouseLeave={(event) => {
              hover.leave("content");
              onMouseLeave?.(event);
            }}
            onKeyDown={(event) => {
              // Claim every key: the parent menu must not also move its highlight.
              claimEvent(event);
              if (isLeft(event)) close("dismiss");
              onKeyDown?.(event);
            }}
            style={mergeStyles({ maxHeight: 320, overflowY: "scroll" }, style)}
          >
            <OverlayHostProvider depth={depth} contentId={undefined}>
              {children}
            </OverlayHostProvider>
          </MenuSurface>
        </anchored>
      </MenuSurfaceStack.Provider>
    </MenuContext.Provider>
  );
};

/** Every part of a submenu, so a misplaced sibling is named. */
const subParts: ReadonlyArray<PartComponent> = [
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuItem,
  MenuCheckboxItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
  MenuRadioGroup,
  MenuRadioItem,
];

const menuSub: PartsContract = {
  parent: "MenuSub",
  family: subParts,
  accepts: [MenuSubTrigger, MenuSubContent],
  hint: "Put the submenu trigger and its content directly inside MenuSub.",
};

const menuSubContent: PartsContract = {
  parent: "MenuSubContent",
  family: subParts,
  accepts: [
    MenuItem,
    MenuCheckboxItem,
    MenuGroup,
    MenuLabel,
    MenuSeparator,
    MenuRadioGroup,
    MenuSub,
  ],
  hint: "Put rows, groups, labels, separators and nested submenus directly inside MenuSubContent.",
};
