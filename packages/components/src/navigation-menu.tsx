/**
 * NavigationMenu: a horizontal nav whose items open one anchored panel.
 *
 * Exactly one panel is open at a time. Triggers form a roving group: Left/Right
 * move focus without opening, Home/End jump, Enter/Space or ArrowDown opens.
 * Escape closes the topmost overlay (the shared dismiss stack) and returns focus
 * to the trigger; an outside press closes.
 *
 * The pointer is a second way in: resting on a trigger opens its panel after
 * `openDelay`, moving across the row switches panels, and leaving the trigger
 * and the panel closes it after `closeDelay`. An explicit press or key wins
 * over a pending hover timer, so a panel closed by a press does not spring back.
 *
 * Measured gaps in 0.11.0: no anchor/href element, so `NavigationMenuLink` is a
 * button with `onSelect`; no `aria-haspopup`. ArrowDown opens and moves focus to
 * the panel surface, not straight to the first link.
 *
 * The panel enters with the house appearance — a fade plus 4px of travel out
 * from its trigger — and stays mounted for its exit tween, taking no presses
 * while it leaves (`internal/presence.tsx`).
 */

import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  resolveStyle,
} from "@gpuix/react/floating";
import {
  Button as PrimitiveButton,
  type ButtonProps as PrimitiveButtonProps,
} from "@gpuixui/primitives/button";
import {
  cn,
  NAVIGATION_MENU_CONTENT,
  NAVIGATION_MENU_ITEM,
  NAVIGATION_MENU_LINK,
  NAVIGATION_MENU_LIST,
  NAVIGATION_MENU_ROOT,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "./internal/button.js";
import { hoverDelay } from "./internal/clock.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import {
  isDismiss,
  isDown,
  isFirst,
  isLast,
  isLeft,
  isRight,
} from "./internal/key.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import {
  fadeFromAnchor,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";

/** The rules a nav part follows; throws outside a {@link NavigationMenu}. */
interface NavigationMenuContextValue {
  readonly open: string | null;
  readonly setOpen: (value: string | null) => void;
  readonly registerTrigger: (
    value: string,
    instance: PublicInstance | null,
  ) => void;
  readonly moveFocus: (value: string, delta: 1 | -1 | "first" | "last") => void;
  readonly focusTrigger: (value: string) => void;
  readonly panelFocus: string | null;
  readonly requestPanelFocus: (value: string) => void;
  readonly clearPanelFocus: () => void;
  /** The pointer entered a trigger: open it once `openDelay` passes. */
  readonly hoverOpen: (value: string) => void;
  /** The pointer left a trigger: close once both surfaces are left. */
  readonly hoverClose: (value: string) => void;
  /** The pointer entered or left the open panel. */
  readonly hoverPanel: (inside: boolean) => void;
  /** An explicit press or key wins: drop pending hover timers and forget the pointer. */
  readonly stopHover: () => void;
  /** Whether a window point falls on one of this nav's triggers. */
  readonly isTriggerPoint: (
    x: number | undefined,
    y: number | undefined,
  ) => boolean;
}

const NavigationMenuContext = createContext<
  NavigationMenuContextValue | undefined
>(undefined);

const ItemContext = createContext<
  { readonly value: string; readonly open: boolean } | undefined
>(undefined);

/** The nav a part belongs to. Throws when there is none. */
const useNavigationMenu = (): NavigationMenuContextValue => {
  const value = useContext(NavigationMenuContext);
  if (value === undefined) {
    throw new Error("NavigationMenu parts must be used inside NavigationMenu");
  }
  return value;
};

const useNavItem = (): { readonly value: string; readonly open: boolean } => {
  const value = useContext(ItemContext);
  if (value === undefined) {
    throw new Error(
      "NavigationMenu items must be used inside NavigationMenuItem",
    );
  }
  return value;
};

/** {@link NavigationMenu} props. */
export interface NavigationMenuProps extends Omit<Props, "children"> {
  /** The nav's accessible name. */
  readonly label: string;
  /** The controlled open item's value, or `null`. */
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  /** Milliseconds of rest on a trigger before its panel opens. Default `150`. */
  readonly openDelay?: number;
  /** Milliseconds after leaving the trigger and panel before closing. Default `150`. */
  readonly closeDelay?: number;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The waits a panel opens and closes after, when its props do not name one. */
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 150;

/** The nav root: one open item, the dismiss layer and the roving triggers. */
export const NavigationMenu = ({
  label,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  openDelay = OPEN_DELAY_MS,
  closeDelay = CLOSE_DELAY_MS,
  className,
  children,
  style,
  onKeyDown,
  ...rest
}: NavigationMenuProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const triggers = useRef(new Map<string, PublicInstance>());
  const [order, setOrder] = useState<ReadonlyArray<string>>([]);
  const [panelFocus, setPanelFocus] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The pointer policy is two refs, not state: mouse events must not re-render
  // the panel, and the timers read the latest position when they fire.
  const hovered = useRef<string | null>(null);
  const panelHovered = useRef(false);
  // An explicit press, key or Escape suspends the pointer policy until the
  // pointer next enters a trigger or panel: the runtime delivers the leave for
  // the trigger it was resting on *after* the key that opened another panel, and
  // that stale leave must not close the panel the caller just opened.
  const suspended = useRef(false);
  assertParts(navigationMenuRoot, children);

  const openMs = hoverDelay(openDelay, OPEN_DELAY_MS);
  const closeMs = hoverDelay(closeDelay, CLOSE_DELAY_MS);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current !== undefined) {
      clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const stopHover = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    hovered.current = null;
    panelHovered.current = false;
    suspended.current = true;
  }, [clearCloseTimer, clearOpenTimer]);

  useLayoutEffect(() => stopHover, [stopHover]);

  // A closed nav owns no panel, so the pointer cannot be inside one: drop a
  // stale flag from a panel that unmounted under the pointer (a chosen link).
  useLayoutEffect(() => {
    if (open === null) panelHovered.current = false;
  }, [open]);

  const hoverOpen = useCallback(
    (value: string) => {
      suspended.current = false;
      hovered.current = value;
      clearOpenTimer();
      clearCloseTimer();
      if (open === value) return;
      const show = () => {
        openTimer.current = undefined;
        setOpen(value);
      };
      if (openMs === 0) show();
      else openTimer.current = setTimeout(show, openMs);
    },
    [clearCloseTimer, clearOpenTimer, open, openMs, setOpen],
  );

  const scheduleClose = useCallback(() => {
    if (hovered.current !== null || panelHovered.current) return;
    if (open === null) return;
    clearCloseTimer();
    const hide = () => {
      closeTimer.current = undefined;
      setOpen(null);
    };
    if (closeMs === 0) hide();
    else closeTimer.current = setTimeout(hide, closeMs);
  }, [clearCloseTimer, closeMs, open, setOpen]);

  const hoverClose = useCallback(
    (value: string) => {
      if (suspended.current) return;
      if (hovered.current !== value) return;
      hovered.current = null;
      scheduleClose();
    },
    [scheduleClose],
  );

  const hoverPanel = useCallback(
    (inside: boolean) => {
      if (inside) {
        suspended.current = false;
        panelHovered.current = true;
        clearCloseTimer();
        return;
      }
      if (suspended.current) return;
      panelHovered.current = false;
      scheduleClose();
    },
    [clearCloseTimer, scheduleClose],
  );

  const registerTrigger = useCallback(
    (value: string, instance: PublicInstance | null) => {
      if (instance === null) {
        triggers.current.delete(value);
      } else {
        triggers.current.set(value, instance);
      }
      const keys = Array.from(triggers.current.keys());
      setOrder((current) =>
        current.length === keys.length &&
        keys.every((key, index) => key === current[index])
          ? current
          : keys,
      );
    },
    [],
  );

  const focusTrigger = useCallback(
    (value: string) => {
      const instance = triggers.current.get(value);
      if (instance !== undefined) renderer?.focusElement?.(instance.id);
    },
    [renderer],
  );

  // A press on a trigger is a mouse-down outside the open panel, but it is the
  // nav's own press: treating it as a dismissal closes the panel on mouse-down
  // and the trigger's click then reopens it, so an open panel could never be
  // toggled shut by pressing its trigger again.
  const isTriggerPoint = useCallback(
    (x: number | undefined, y: number | undefined): boolean => {
      if (x === undefined || y === undefined) return false;
      return Array.from(triggers.current.values()).some((instance) =>
        Option.match(
          Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
          {
            onNone: () => false,
            onSome: (bounds) =>
              x >= bounds.x &&
              x <= bounds.x + bounds.width &&
              y >= bounds.y &&
              y <= bounds.y + bounds.height,
          },
        ),
      );
    },
    [renderer],
  );

  const moveFocus = useCallback(
    (value: string, delta: 1 | -1 | "first" | "last") => {
      if (order.length === 0) return;
      const index = order.indexOf(value);
      const next =
        delta === "first"
          ? 0
          : delta === "last"
            ? order.length - 1
            : (((index + delta) % order.length) + order.length) % order.length;
      const target = order[next];
      if (target !== undefined) focusTrigger(target);
    },
    [focusTrigger, order],
  );

  // One dismiss layer for the whole nav: Escape closes only this panel when the
  // nav sits over a dialog, and focus returns to the open item's trigger.
  const dismiss = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    dismiss.current = () => {
      const current = open;
      stopHover();
      setOpen(null);
      if (current !== null) focusTrigger(current);
    };
  });
  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (open === null) return;
    return pushDismissLayer((event) => {
      if (event.eventType === "keyDown") {
        dismiss.current();
        return;
      }
      stopHover();
      setOpen(null);
    }, depth);
  }, [depth, open, setOpen, stopHover]);

  const context = useMemo<NavigationMenuContextValue>(
    () => ({
      open,
      setOpen,
      registerTrigger,
      moveFocus,
      focusTrigger,
      panelFocus,
      requestPanelFocus: setPanelFocus,
      clearPanelFocus: () => setPanelFocus(null),
      hoverOpen,
      hoverClose,
      hoverPanel,
      stopHover,
      isTriggerPoint,
    }),
    [
      focusTrigger,
      hoverClose,
      hoverOpen,
      hoverPanel,
      isTriggerPoint,
      moveFocus,
      open,
      panelFocus,
      registerTrigger,
      setOpen,
      stopHover,
    ],
  );

  return (
    <NavigationMenuContext.Provider value={context}>
      <div style={floatingRootStyle()}>
        <div
          role="navigation"
          aria-label={label}
          {...rest}
          onKeyDown={(event: KeyEvent) => {
            onKeyDown?.(event);
            if (isDismiss(event)) dismissTopLayer(event);
          }}
          style={mergeStyles(
            recipeStyle(cn(NAVIGATION_MENU_ROOT, className), theme),
            style,
          )}
        >
          {children}
        </div>
      </div>
    </NavigationMenuContext.Provider>
  );
};

/** {@link NavigationMenuList} props. */
export interface NavigationMenuListProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The row of items. */
export const NavigationMenuList = ({
  children,
  className,
  style,
  ...rest
}: NavigationMenuListProps) => {
  const theme = useTheme();
  assertParts(navigationMenuList, children);
  return (
    <div
      role="list"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(NAVIGATION_MENU_LIST, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link NavigationMenuItem} props. */
export interface NavigationMenuItemProps extends Omit<Props, "children"> {
  /** The item's identity in the nav's `value`. */
  readonly value: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** One nav item: its trigger and the panel that trigger owns. */
export const NavigationMenuItem = ({
  value,
  className,
  children,
  style,
  ...rest
}: NavigationMenuItemProps) => {
  const theme = useTheme();
  const { open } = useNavigationMenu();
  assertParts(navigationMenuItem, children);
  return (
    <ItemContext.Provider value={{ value, open: open === value }}>
      <div
        role="listitem"
        {...rest}
        style={mergeStyles(
          recipeStyle(cn(NAVIGATION_MENU_ITEM, className), theme),
          style,
        )}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
};

/** Opens its item's panel. An ordinary button in every other respect. */
export const NavigationMenuTrigger = ({
  onClick,
  ref,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  disabled = false,
  ...rest
}: ButtonProps) => {
  const {
    open,
    setOpen,
    registerTrigger,
    moveFocus,
    requestPanelFocus,
    hoverOpen,
    hoverClose,
    stopHover,
  } = useNavigationMenu();
  const { value } = useNavItem();
  const expanded = open === value;
  const register = useCallback(
    (instance: PublicInstance | null) => registerTrigger(value, instance),
    [registerTrigger, value],
  );
  const setTrigger = useMergedRef<PublicInstance | null>(register, ref);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      aria-expanded={expanded}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!disabled) hoverOpen(value);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        if (!disabled) hoverClose(value);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (disabled) return;
        stopHover();
        setOpen(expanded ? null : value);
      }}
      onKeyDown={(event: KeyEvent) => {
        onKeyDown?.(event);
        if (disabled) return;
        if (isDown(event)) {
          stopHover();
          setOpen(value);
          requestPanelFocus(value);
        } else if (isLeft(event)) {
          moveFocus(value, -1);
        } else if (isRight(event)) {
          moveFocus(value, 1);
        } else if (isFirst(event)) {
          moveFocus(value, "first");
        } else if (isLast(event)) {
          moveFocus(value, "last");
        }
      }}
    />
  );
};

/** {@link NavigationMenuContent} props. */
export interface NavigationMenuContentProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The anchored panel for its item, mounted while open and through its exit. */
export const NavigationMenuContent = ({
  children,
  className,
  style,
  onMouseDownOutside,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: NavigationMenuContentProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { value, open } = useNavItem();
  const { panelFocus, clearPanelFocus, hoverPanel, isTriggerPoint } =
    useNavigationMenu();
  const [panel, setPanel] = useState<PublicInstance | undefined>(undefined);
  const panelId = panel?.id;
  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);
  assertParts(navigationMenuContent, children);

  useLayoutEffect(() => {
    if (!open || panelFocus !== value || panelId === undefined) return;
    renderer?.focusElement?.(panelId);
    clearPanelFocus();
  }, [clearPanelFocus, open, panelFocus, panelId, renderer, value]);

  if (!presence.mounted) return null;

  return (
    <FloatingLayer
      motion={presenceMotion(fadeFromAnchor("bottom", 4), presence)}
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={8}
      role="group"
      aria-label={value}
      tabIndex={-1}
      {...rest}
      ref={(instance) => setPanel(instance ?? undefined)}
      onMouseEnter={(event) => {
        hoverPanel(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hoverPanel(false);
        onMouseLeave?.(event);
      }}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        if (isTriggerPoint(event.x, event.y)) return;
        dismissTopLayer(event);
      }}
      style={mergeStyles(
        mergeStyles(
          overlaySurfaceStyle(NAVIGATION_MENU_CONTENT, className, theme),
          // A positioned box is what the leaving guard is inset against.
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

/** {@link NavigationMenuLink} props. */
export interface NavigationMenuLinkProps extends Omit<
  PrimitiveButtonProps,
  "variant"
> {
  /** Called when the link is chosen; the nav closes afterwards. */
  readonly onSelect?: () => void;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /**
   * Called for a click or an activating key, closing the panel afterwards.
   * @deprecated use `onActivate`; removed in the next release.
   */
  readonly onClick?: (event: EventPayload) => void;
}

/** A navigation row. 0.11.0 has no anchor/href, so this is a button. */
export const NavigationMenuLink = ({
  onSelect,
  onActivate,
  onClick,
  className,
  style,
  ...rest
}: NavigationMenuLinkProps) => {
  const theme = useTheme();
  const { setOpen, stopHover } = useNavigationMenu();
  const linkStyle = mergeStyles(
    recipeStyle(cn(NAVIGATION_MENU_LINK, className), theme),
    {
      hover: {
        backgroundColor: theme.colors.accent,
        color: theme.colors.accentForeground,
      },
    },
  );
  return (
    <PrimitiveButton
      {...rest}
      variant="ghost"
      onActivate={(event) => {
        (onActivate ?? onClick)?.(event);
        onSelect?.();
        stopHover();
        setOpen(null);
      }}
      style={(state) =>
        mergeStyles(linkStyle, resolveStyle(style, state)) ?? {}
      }
    />
  );
};

/** Every part, so a misplaced sibling is named. */
const navigationMenuParts: ReadonlyArray<PartComponent> = [
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
];

const navigationMenuRoot: PartsContract = {
  parent: "NavigationMenu",
  family: navigationMenuParts,
  accepts: [NavigationMenuList],
  hint: "Put NavigationMenuList directly inside NavigationMenu.",
};

const navigationMenuList: PartsContract = {
  parent: "NavigationMenuList",
  family: navigationMenuParts,
  accepts: [NavigationMenuItem],
  hint: "Put NavigationMenuItem directly inside NavigationMenuList.",
};

const navigationMenuItem: PartsContract = {
  parent: "NavigationMenuItem",
  family: navigationMenuParts,
  accepts: [NavigationMenuTrigger, NavigationMenuContent],
  hint: "Put NavigationMenuTrigger and NavigationMenuContent directly inside NavigationMenuItem.",
};

const navigationMenuContent: PartsContract = {
  parent: "NavigationMenuContent",
  family: navigationMenuParts,
  accepts: [NavigationMenuLink],
  hint: "Put NavigationMenuLink rows directly inside NavigationMenuContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const navigationMenuMeta = {
  name: "Navigation Menu",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no anchor/href in 0.11.0: NavigationMenuLink is a button with onSelect",
    "hover opens after `openDelay` and closes after `closeDelay`; 0.11.0 has no pointer-type signal, so touch opens by press",
    "ArrowDown moves focus to the panel surface, not straight to the first link",
    "no aria-haspopup in 0.11.0",
  ],
  docs: "docs/navigation-menu.mdx",
  example: "examples/navigation-menu.example.tsx",
  testFile: "src/behaviour/navigation-menu.test.tsx",
} as const;
