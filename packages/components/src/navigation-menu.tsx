/** @jsxImportSource @gpuix/react */
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
import { FlipMark } from "./internal/flip-mark.js";
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

  readonly hoverOpen: (value: string) => void;

  readonly hoverClose: (value: string) => void;

  readonly hoverPanel: (inside: boolean) => void;

  readonly cancelOpening: () => void;

  readonly stopHover: () => void;

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

const PanelLeaving = createContext(false);

const usePanelLeaving = (): boolean => useContext(PanelLeaving);

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

export interface NavigationMenuProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;

  readonly openDelay?: number;

  readonly closeDelay?: number;

  readonly className?: string;
  readonly children?: PartChildren;
}

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 150;

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

  const hovered = useRef<string | null>(null);
  const panelHovered = useRef(false);

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

  const cancelOpening = useCallback(() => {
    clearOpenTimer();
    hovered.current = null;
  }, [clearOpenTimer]);

  useLayoutEffect(() => stopHover, [stopHover]);

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
      cancelOpening,
      stopHover,
      isTriggerPoint,
    }),
    [
      cancelOpening,
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

export interface NavigationMenuListProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface NavigationMenuItemProps extends Omit<Props, "children"> {
  readonly value: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export const NavigationMenuTrigger = ({
  onClick,
  ref,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  trailing,
  disabled = false,
  ...rest
}: ButtonProps) => {
  const theme = useTheme();
  const {
    open,
    setOpen,
    registerTrigger,
    moveFocus,
    requestPanelFocus,
    hoverOpen,
    hoverClose,
    cancelOpening,
    stopHover,
  } = useNavigationMenu();
  const { value } = useNavItem();
  const expanded = open === value;

  const chevronId = (mark: "up" | "down"): string | undefined =>
    rest.testId === undefined ? undefined : `${rest.testId}-chevron-${mark}`;
  const register = useCallback(
    (instance: PublicInstance | null) => registerTrigger(value, instance),
    [registerTrigger, value],
  );
  const setTrigger = useMergedRef<PublicInstance | null>(register, ref);

  useLayoutEffect(() => {
    if (disabled) cancelOpening();
  }, [cancelOpening, disabled]);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      aria-expanded={expanded}
      trailing={
        <>
          {trailing}
          <FlipMark
            off="chevron-down"
            on="chevron-up"
            shown={expanded}
            color={theme.colors.mutedForeground}
            testIdFor={(mark) => chevronId(mark === "on" ? "up" : "down")}
          />
        </>
      }
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

export interface NavigationMenuContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

          { position: "relative", ...presenceStyle(presence.present) },
        ),
        style,
      )}
    >
      <DismissScope>
        <PanelLeaving.Provider value={!presence.present}>
          {children}
        </PanelLeaving.Provider>
      </DismissScope>
      <PresenceShield present={presence.present} />
    </FloatingLayer>
  );
};

export interface NavigationMenuLinkProps extends Omit<
  PrimitiveButtonProps,
  "variant"
> {
  readonly onSelect?: () => void;

  readonly className?: string;

  readonly onClick?: (event: EventPayload) => void;
}

export const NavigationMenuLink = ({
  onSelect,
  onActivate,
  onClick,
  className,
  style,
  tabIndex,
  ...rest
}: NavigationMenuLinkProps) => {
  const theme = useTheme();
  const { setOpen, stopHover } = useNavigationMenu();

  const leaving = usePanelLeaving();
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
      tabIndex={leaving ? -1 : tabIndex}
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
