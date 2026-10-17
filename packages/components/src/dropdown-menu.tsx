/**
 * DropdownMenu: a list of actions anchored to the control that opened it.
 *
 * The open state, the anchored positioning and the trigger's re-open guard live
 * here; the rows, the highlight rules and the surface are shared with the Context
 * menu (`menu/state.ts`, `menu/item.tsx`).
 *
 * Dismissal goes through `internal/dismiss-layer.ts`, so a menu inside a dialog
 * closes only the menu. The trigger records whether the menu was open at
 * **mouse-down**: pressing the open trigger is an outside press that closes the
 * menu, and the click that follows must not immediately re-open it.
 */

import { useGpuix } from "@gpuix/react";
import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
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
import { textStyle, useTheme } from "./internal/theme.js";
import { Button, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { claimEvent, isEventClaimed } from "./internal/event-claim.js";
import { useMergedRef } from "./internal/ref.js";
import { isActivation, isDown, isLeft, isRight, isUp } from "./internal/key.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  type MenuItemProps,
} from "./menu/item.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import {
  menuKeyHandler,
  menuSurfaceStyle,
  MenuSurface,
} from "./menu/surface.js";

/** The rules a {@link DropdownMenuContent} follows. */
interface DropdownContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
  /** Set by a dismissing outside press, consumed by the click that follows it. */
  readonly dismissedByOutsidePress: RefObject<boolean>;
  /** The row a keyboard open should focus once the rows have registered. */
  readonly pendingFocus: RefObject<"first" | "last" | null>;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(
  undefined,
);

/** The dropdown a part belongs to. Throws when there is none. */
const useDropdownContext = (): DropdownContextValue => {
  const value = useContext(DropdownContext);
  if (value === undefined) {
    throw new Error("DropdownMenu parts must be used inside DropdownMenu");
  }
  return value;
};

/** {@link DropdownMenu} props. */
export interface DropdownMenuProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: ReactNode;
}

/**
 * The menu's open state and dismiss layer. It paints a positioning root, which is
 * what the anchored content measures against.
 */
export const DropdownMenu = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const renderer = useGpuix().renderer;
  const trigger = useRef<PublicInstance | null>(null);
  const dismissedByOutsidePress = useRef(false);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(false);
  /** The edge a keyboard open should land on once the rows register. */
  const pendingFocus = useRef<"first" | "last" | null>(null);

  // A re-render must not re-push the layer: that would move this menu above an
  // overlay opened after it. The handler reads the latest setter through a ref.
  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });

  const close = useCallback((reason: MenuCloseReason) => {
    restoreFocus.current = reason === "activate" || reason === "dismiss";
    if (reason === "outside") {
      // The press that dismissed the menu owns the click that follows it.
      // Marking here (rather than in the dismiss handler) means a nested
      // submenu's outside press gets the same guard. The microtask clears the
      // mark before the next user gesture.
      dismissedByOutsidePress.current = true;
      queueMicrotask(() => {
        dismissedByOutsidePress.current = false;
      });
    }
    setOpenRef.current(false);
  }, []);

  const menu = useMenuState(close);

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      close(event.eventType === "keyDown" ? "dismiss" : "outside");
    });
  }, [close, open]);

  useLayoutEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (!restoreFocus.current) return;
    const target = trigger.current;
    if (target !== null) renderer?.focusElement?.(target.id);
  }, [open, renderer]);

  useLayoutEffect(() => {
    if (!open) pendingFocus.current = null;
  }, [open]);

  const context = useMemo<DropdownContextValue>(
    () => ({ open, setOpen, trigger, dismissedByOutsidePress, pendingFocus }),
    [open, setOpen],
  );

  return (
    <DropdownContext.Provider value={context}>
      <MenuContext.Provider value={menu}>
        <div style={floatingRootStyle()}>{children}</div>
      </MenuContext.Provider>
    </DropdownContext.Provider>
  );
};

/** Opens the menu it sits in. An ordinary button in every other respect. */
export const DropdownMenuTrigger = ({
  onClick,
  onKeyDown,
  ref,
  ...rest
}: ButtonProps) => {
  const { open, setOpen, trigger, dismissedByOutsidePress, pendingFocus } =
    useDropdownContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  const openAt = (edge: "first" | "last"): void => {
    pendingFocus.current = edge;
    setOpen(true);
  };

  return (
    <Button
      {...rest}
      ref={setTrigger}
      aria-expanded={open}
      onKeyDown={(event) => {
        // The local Button runs its activation click before this handler, so a
        // keyboard toggle has already opened the menu; record the edge anyway.
        if (!open) {
          if (isDown(event)) openAt("first");
          else if (isUp(event)) openAt("last");
          else if (isActivation(event)) openAt("first");
        }
        onKeyDown?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        // A pointer open keeps focus on the surface; only a keyboard open names
        // a row. Clearing here cannot undo the key handler: activation clicks
        // run before onKeyDown within the same render.
        pendingFocus.current = null;
        // The press that dismissed the menu owns this click: toggling here would
        // re-open what the same gesture just closed.
        if (dismissedByOutsidePress.current) {
          dismissedByOutsidePress.current = false;
          return;
        }
        setOpen(!open);
      }}
    />
  );
};

/** {@link DropdownMenuContent} props: a floating list of rows. */
export interface DropdownMenuContentProps extends FloatingContentProps {
  /** The menu's accessible name. */
  readonly label?: string;
  /** Default `"bottom"`. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between trigger and surface. Default `4`. */
  readonly sideOffset?: number;
}

/** The menu surface, rendered while the menu is open. */
export const DropdownMenuContent = ({
  label,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ...rest
}: DropdownMenuContentProps) => {
  const theme = useTheme();
  const { open, pendingFocus } = useDropdownContext();
  const menu = useMenuContext();
  const keys = menuKeyHandler(menu);

  // Rows register in child layout effects, which run before this one. If the
  // root has not published them yet, the effect runs again when `rows` changes.
  useLayoutEffect(() => {
    if (!open) return;
    const edge = pendingFocus.current;
    if (edge === null || menu.rows.length === 0) return;
    pendingFocus.current = null;
    menu.step({ _tag: edge === "first" ? "First" : "Last" });
  }, [menu, open, pendingFocus]);

  if (!open) return null;

  return (
    <FloatingLayer
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      role="menu"
      {...(label === undefined ? {} : { "aria-label": label })}
      tabIndex={-1}
      autoFocus
      {...rest}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      onKeyDown={(event) => {
        if (isEventClaimed(event)) return;
        keys(event);
        onKeyDown?.(event);
      }}
      style={mergeStyles(
        { ...textStyle(theme, "body"), ...menuSurfaceStyle(theme) },
        style,
      )}
    >
      {children}
    </FloatingLayer>
  );
};

/** The rules a {@link DropdownMenuSubContent} follows; throws outside a sub. */
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
    throw new Error("Submenu parts must be used inside DropdownMenuSub");
  }
  return value;
};

/** {@link DropdownMenuSub} props. */
export interface DropdownMenuSubProps {
  readonly children?: ReactNode;
}

/**
 * A group of actions behind one secondary level. It owns its open state; only
 * one submenu per menu is open at a time.
 */
export const DropdownMenuSub = ({ children }: DropdownMenuSubProps) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);
  const focusEdge = useRef<((edge: "first" | "last") => void) | null>(null);
  const value = useMemo<SubContextValue>(
    () => ({ open, setOpen, trigger, focusEdge }),
    [open],
  );

  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

/** {@link DropdownMenuSubTrigger} props: an ordinary row that opens a submenu. */
export interface DropdownMenuSubTriggerProps extends Omit<
  MenuItemProps,
  "onSelect" | "closeOnSelect" | "tone"
> {}

/**
 * The row that opens its submenu. It is a normal menu row: arrow keys and
 * type-ahead treat it like an action, and clicking, Enter, Space, `ArrowRight`
 * or hover opens the secondary level.
 */
export const DropdownMenuSubTrigger = ({
  children,
  trailing,
  textValue,
  onKeyDown,
  onFocus,
  onMouseEnter,
  ref,
  ...rest
}: DropdownMenuSubTriggerProps) => {
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

/** {@link DropdownMenuSubContent} props: the secondary menu surface. */
export interface DropdownMenuSubContentProps extends Props {
  /** The submenu's accessible name. */
  readonly label?: string;
  readonly children?: ReactNode;
}

/**
 * The floating second level, rendered only while open. Its position is the
 * trigger row's right edge in window coordinates, clamped by the runtime's
 * `fit="snap"`; it owns its dismiss layer so Escape closes one level only.
 */
export const DropdownMenuSubContent = ({
  label,
  children,
  onKeyDown,
  style,
  testId,
  ...rest
}: DropdownMenuSubContentProps) => {
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
      // A press inside this surface is outside the parent surface, so the
      // parent's outside handler offers it here first. Closing would unmount
      // the row before its click lands; the press belongs to the submenu.
      if (event.eventType === "mouseDownOutside" && insideSurface(event)) return;
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

export {
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuGroup as DropdownMenuGroup,
  MenuItem as DropdownMenuItem,
  MenuLabel as DropdownMenuLabel,
  MenuSeparator as DropdownMenuSeparator,
};

export type {
  MenuCheckboxItemProps as DropdownMenuCheckboxItemProps,
  MenuItemProps as DropdownMenuItemProps,
} from "./menu/item.js";

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const dropdownMenuMeta = {
  name: "Dropdown menus",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "one level of submenus is tested; deeper nesting follows the same rule but is untested",
    'submenus open to the right and are clamped by fit="snap"; there is no left-side flip',
    "no aria-haspopup in 0.10.0; a submenu trigger announces aria-expanded only",
    "type-ahead is a case-insensitive 500 ms prefix search with no fuzzy scoring; a composed label needs textValue",
    "the checkbox row uses aria-selected and a text ✓ because 0.10.0 has no aria-checked and no icon set",
  ],
  docs: "docs/dropdown-menu.mdx",
  example: "examples/dropdown-menu.example.tsx",
  testFile: "src/behaviour/dropdown-menu.test.tsx",
} as const;
