/**
 * NavigationMenu: a horizontal nav whose items open one anchored panel.
 *
 * Exactly one panel is open at a time. Triggers form a roving group: Left/Right
 * move focus without opening, Home/End jump, Enter/Space or ArrowDown opens.
 * Escape closes the topmost overlay (the shared dismiss stack) and returns focus
 * to the trigger; an outside press closes.
 *
 * Hover follows the same travel rule as `PreviewCard`: entering a trigger opens
 * after `openDelay`, the pointer may cross into the panel, and leaving both
 * closes after `closeDelay`. Hover never takes focus and never opens a disabled
 * trigger; `openOnHover={false}` keeps press and keys as the only way in.
 *
 * Measured gaps in 0.10.0: no anchor/href element, so `NavigationMenuLink` is a
 * button with `onSelect`; no `aria-haspopup`; no pointer-type signal, so touch
 * has no hover. ArrowDown opens and moves focus to the panel surface, not
 * straight to the first link.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
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
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useHoverTravel, type HoverTravel } from "./internal/hover.js";
import {
  isDismiss,
  isDown,
  isFirst,
  isLast,
  isLeft,
  isRight,
} from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { elevationShadow, useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";

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
  /** The registered trigger instance for a value, once React has attached it. */
  readonly triggerFor: (value: string) => PublicInstance | undefined;
  readonly panelFocus: string | null;
  readonly requestPanelFocus: (value: string) => void;
  readonly clearPanelFocus: () => void;
  /** Whether entering a trigger opens its panel. */
  readonly openOnHover: boolean;
  /** Milliseconds of hover before opening. */
  readonly openDelay: number;
  /** Milliseconds after leaving both surfaces before closing. */
  readonly closeDelay: number;
  /** The one pointer policy; the root owns it so a switch cannot race. */
  readonly hover: HoverTravel;
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
  /** Open a panel when the pointer enters its trigger. Default `true`. */
  readonly openOnHover?: boolean;
  /** Milliseconds of hover before opening. Default `100`. */
  readonly openDelay?: number;
  /** Milliseconds after leaving both surfaces before closing. Default `150`. */
  readonly closeDelay?: number;
  readonly children?: PartChildren;
}

/** The nav root: one open item, the dismiss layer and the roving triggers. */
export const NavigationMenu = ({
  label,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  openOnHover = true,
  openDelay = 100,
  closeDelay = 150,
  children,
  style,
  onKeyDown,
  ...rest
}: NavigationMenuProps) => {
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const triggers = useRef(new Map<string, PublicInstance>());
  const [order, setOrder] = useState<ReadonlyArray<string>>([]);
  const [panelFocus, setPanelFocus] = useState<string | null>(null);
  // The pointer policy is one instance for the whole nav so entering the next
  // trigger cancels the previous item's pending close in the same pointer move.
  // `openRef` mirrors the state during render: a close timer must read "is
  // anything open" without waiting for a commit.
  const openRef = useRef<string | null>(open);
  openRef.current = open;
  const hover = useHoverTravel({
    isOpen: () => openRef.current !== null,
    // Identity-aware: a panel opened by a key while the close timer runs must
    // survive; only the item that was open when the pointer left may close.
    close: () => {
      if (openRef.current === open) setOpen(null);
    },
    openDelay,
    closeDelay,
  });
  assertParts(navigationMenuRoot, children);

  // A panel unmounts without a `mouseLeave` when another opens or a key
  // dismisses it. Forget that content key; the trigger key still describes
  // where the pointer is. A disabled policy listens to nothing at all.
  useLayoutEffect(() => {
    hover.reset("content");
  }, [hover, open]);
  useLayoutEffect(() => {
    if (!openOnHover) hover.reset();
  }, [hover, openOnHover]);

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

  const triggerFor = useCallback(
    (value: string) => triggers.current.get(value),
    [],
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
      setOpen(null);
      if (current !== null) focusTrigger(current);
    };
  });
  useLayoutEffect(() => {
    if (open === null) return;
    return pushDismissLayer((event) => {
      if (event.eventType === "keyDown") {
        dismiss.current();
        return;
      }
      setOpen(null);
    });
  }, [open, setOpen]);

  const context = useMemo<NavigationMenuContextValue>(
    () => ({
      open,
      setOpen,
      registerTrigger,
      moveFocus,
      focusTrigger,
      triggerFor,
      panelFocus,
      requestPanelFocus: setPanelFocus,
      clearPanelFocus: () => setPanelFocus(null),
      openOnHover,
      openDelay,
      closeDelay,
      hover,
    }),
    [
      closeDelay,
      focusTrigger,
      hover,
      moveFocus,
      open,
      openDelay,
      openOnHover,
      panelFocus,
      registerTrigger,
      setOpen,
      triggerFor,
    ],
  );

  return (
    <NavigationMenuContext.Provider value={context}>
      <div style={floatingRootStyle()}>
        <div
          role="navigation"
          aria-label={label}
          {...rest}
          onKeyDown={(event: EventPayload) => {
            onKeyDown?.(event);
            if (isDismiss(event)) dismissTopLayer(event);
          }}
          style={mergeStyles(
            {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            },
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
  readonly children?: PartChildren;
}

/** The row of items. */
export const NavigationMenuList = ({
  children,
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
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
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
  readonly children?: PartChildren;
}

/** One nav item: its trigger and the panel that trigger owns. */
export const NavigationMenuItem = ({
  value,
  children,
  style,
  ...rest
}: NavigationMenuItemProps) => {
  const { open } = useNavigationMenu();
  const expanded = open === value;
  assertParts(navigationMenuItem, children);

  return (
    <ItemContext.Provider value={{ value, open: expanded }}>
      <div
        role="listitem"
        {...rest}
        style={mergeStyles(
          { display: "flex", flexDirection: "row", position: "relative" },
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
  ...rest
}: ButtonProps) => {
  const {
    open,
    setOpen,
    registerTrigger,
    moveFocus,
    requestPanelFocus,
    openOnHover,
    hover,
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
      aria-expanded={expanded}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (!openOnHover || rest.disabled === true) return;
        hover.enter("trigger", () => setOpen(value), value);
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        if (!openOnHover || rest.disabled === true) return;
        hover.leave("trigger", value);
      }}
      onClick={(event) => {
        onClick?.(event);
        setOpen(expanded ? null : value);
      }}
      onKeyDown={(event: EventPayload) => {
        onKeyDown?.(event);
        if (isDown(event)) {
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
  readonly children?: PartChildren;
}

/** The anchored panel for its item, rendered only while that item is open. */
export const NavigationMenuContent = ({
  children,
  style,
  onMouseDownOutside,
  ref,
  ...rest
}: NavigationMenuContentProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { value, open } = useNavItem();
  const { panelFocus, clearPanelFocus, openOnHover, hover, triggerFor } =
    useNavigationMenu();
  const [panel, setPanel] = useState<PublicInstance | undefined>(undefined);
  const panelId = panel?.id;
  const surface = useRef<PublicInstance | null>(null);
  const trigger = useRef<PublicInstance | null>(null);
  trigger.current = triggerFor(value) ?? null;
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const setLayer = useCallback(
    (instance: PublicInstance | null) => {
      setSurface(instance);
      setPanel(instance ?? undefined);
    },
    [setSurface],
  );
  const placement = usePlacement({
    open,
    side: "bottom",
    align: "start",
    margin: 8,
    trigger,
    surface,
  });
  assertParts(navigationMenuContent, children);

  useLayoutEffect(() => {
    if (!open || panelFocus !== value || panelId === undefined) return;
    renderer?.focusElement?.(panelId);
    clearPanelFocus();
  }, [clearPanelFocus, open, panelFocus, panelId, renderer, value]);

  if (!open) return null;

  return (
    <FloatingLayer
      side={placement.side}
      align={placement.align}
      sideOffset={4}
      alignOffset={placement.alignOffset}
      collisionPadding={8}
      role="group"
      aria-label={value}
      tabIndex={-1}
      {...rest}
      ref={setLayer}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (openOnHover) hover.enter("content", undefined, value);
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        if (openOnHover) hover.leave("content", value);
      }}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          minWidth: 220,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.popover,
          color: theme.colors.popoverForeground,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          boxShadow: elevationShadow(theme, "md"),
          pointerEvents: "auto",
        },
        style,
      )}
    >
      {children}
    </FloatingLayer>
  );
};

/** {@link NavigationMenuLink} props. */
export interface NavigationMenuLinkProps extends Omit<ButtonProps, "variant"> {
  /** Called when the link is chosen; the nav closes afterwards. */
  readonly onSelect?: () => void;
}

/** A navigation row. 0.10.0 has no anchor/href, so this is a button. */
export const NavigationMenuLink = ({
  onSelect,
  onClick,
  style,
  ...rest
}: NavigationMenuLinkProps) => {
  const theme = useTheme();
  const { setOpen } = useNavigationMenu();
  return (
    <Button
      {...rest}
      variant="ghost"
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
        setOpen(null);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          width: "100%",
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          hover: {
            backgroundColor: theme.colors.accent,
            color: theme.colors.accentForeground,
          },
        },
        style,
      )}
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
    "no anchor/href in 0.10.0: NavigationMenuLink is a button with onSelect",
    "hover opens after openDelay and closes after closeDelay once outside both surfaces; 0.10.0 has no pointer-type signal, so touch uses press",
    "hover never takes focus; the panel is not auto-focused on hover, so a keyboard user enters through ArrowDown",
    "ArrowDown moves focus to the panel surface, not straight to the first link",
    "no aria-haspopup in 0.10.0",
    "the panel is placed once per open: a bottom panel near the window edge flips above its trigger instead of being snapped over it",
  ],
  docs: "docs/navigation-menu.mdx",
  example: "examples/navigation-menu.example.tsx",
  testFile: "src/behaviour/navigation-menu.test.tsx",
} as const;
