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
 * the click lands on it. {@link MenuSubContent} therefore checks its own painted
 * bounds before treating a mouse-down as a dismissal.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { pushDismissLayer } from "../internal/dismiss-layer.js";
import { claimEvent } from "../internal/event-claim.js";
import { isDown, isLeft, isRight, isUp } from "../internal/key.js";
import { useMergedRef } from "../internal/ref.js";
import { textStyle, useTheme } from "../internal/theme.js";
import { MenuItem, type MenuItemProps } from "./item.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./state.js";
import { MenuSurface } from "./surface.js";

/** The rules a {@link MenuSubContent} follows; throws outside a sub. */
interface SubContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** The SubTrigger row: it positions the surface and receives returned focus. */
  readonly trigger: RefObject<PublicInstance | null>;
  /** Set by the content while mounted: focus the submenu's first or last row. */
  readonly focusEdge: RefObject<((edge: "first" | "last") => void) | null>;
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
  readonly children?: ReactNode;
}

/**
 * A group of actions behind one secondary level. It owns its open state; only
 * one submenu per menu is open at a time.
 */
export const MenuSub = ({ children }: MenuSubProps) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);
  const focusEdge = useRef<((edge: "first" | "last") => void) | null>(null);
  const value = useMemo<SubContextValue>(
    () => ({ open, setOpen, trigger, focusEdge }),
    [open],
  );

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
  onKeyDown,
  onFocus,
  onMouseEnter,
  ref,
  ...rest
}: MenuSubTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger, focusEdge } = useSubContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <MenuItem
      {...rest}
      ref={setTrigger}
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
        setOpen(true);
        onMouseEnter?.(event);
      }}
      onKeyDown={(event) => {
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
        onKeyDown?.(event);
      }}
      trailing={
        trailing ?? (
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            ▸
          </text>
        )
      }
    >
      {children}
    </MenuItem>
  );
};

/** The gap between the trigger row and its submenu surface, in pixels. */
const SUBMENU_GAP = 4;

/** {@link MenuSubContent} props: the secondary menu surface. */
export interface MenuSubContentProps extends Props {
  /** The submenu's accessible name. */
  readonly label?: string;
  readonly children?: ReactNode;
}

/**
 * The floating second level, rendered only while open. Its position is the
 * trigger row's right edge in window coordinates, clamped by the runtime's
 * `fit="snap"`; it owns its dismiss layer so Escape closes one level only.
 */
export const MenuSubContent = ({
  label,
  children,
  onKeyDown,
  style,
  testId,
  ...rest
}: MenuSubContentProps) => {
  const renderer = useGpuix().renderer;
  const { open, setOpen, trigger, focusEdge } = useSubContext();
  const parent = useMenuContext();
  const parentClose = parent.close;
  const parentClaim = parent.claimSubmenu;
  const restoreFocus = useRef(false);
  const surface = useRef<PublicInstance | null>(null);

  const close = useCallback(
    (reason: MenuCloseReason) => {
      restoreFocus.current = reason === "dismiss";
      setOpen(false);
      Match.value(reason).pipe(
        Match.when("activate", () => parentClose("activate")),
        Match.when("leave", () => parentClose("leave")),
        Match.when("outside", () => parentClose("outside")),
        Match.when("dismiss", () => undefined),
        Match.exhaustive,
      );
    },
    [parentClose, setOpen],
  );

  const menu = useMenuState(close);

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

  /** Whether a pointer event landed on this submenu's own surface. */
  const insideSurface = useCallback(
    (event: EventPayload): boolean => {
      const instance = surface.current;
      if (instance === null) return false;
      const bounds = renderer?.getElementBounds?.(instance.id);
      if (bounds === null || bounds === undefined) return false;
      const { x, y } = event;
      return (
        x !== undefined &&
        y !== undefined &&
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    },
    [renderer],
  );

  const setSurface = useCallback((next: PublicInstance | null) => {
    surface.current = next;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const release = parentClaim(() => setOpen(false));
    const pop = pushDismissLayer((event) => {
      if (event.eventType === "mouseDownOutside" && insideSurface(event))
        return;
      closeRef.current(event.eventType === "keyDown" ? "dismiss" : "outside");
    });
    return () => {
      pop();
      release();
    };
  }, [insideSurface, open, parentClaim, setOpen]);

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
      <anchored
        position={point}
        fit="snap"
        snapMargin={8}
        deferred
        priority={1}
        occlude
      >
        <MenuSurface
          ref={setSurface}
          testId={testId}
          label={label}
          {...rest}
          onKeyDown={(event) => {
            // Claim every key: the parent menu must not also move its highlight.
            claimEvent(event);
            if (isLeft(event)) close("dismiss");
            onKeyDown?.(event);
          }}
          style={mergeStyles({ maxHeight: 320, overflowY: "scroll" }, style)}
        >
          {children}
        </MenuSurface>
      </anchored>
    </MenuContext.Provider>
  );
};
