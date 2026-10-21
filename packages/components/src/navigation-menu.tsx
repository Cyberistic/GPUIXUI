/**
 * NavigationMenu: a horizontal nav whose items open one anchored panel.
 *
 * Exactly one panel is open at a time. Triggers form a roving group: Left/Right
 * move focus without opening, Home/End jump, Enter/Space or ArrowDown opens.
 * Escape closes the topmost overlay (the shared dismiss stack) and returns focus
 * to the trigger; an outside press closes.
 *
 * Measured gaps in 0.10.0: no anchor/href element, so `NavigationMenuLink` is a
 * button with `onSelect`; no `aria-haspopup`; hover does not open (a second,
 * untested policy). ArrowDown opens and moves focus to the panel surface, not
 * straight to the first link.
 */

import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
import {
  cn,
  NAVIGATION_MENU_CONTENT,
  NAVIGATION_MENU_ITEM,
  NAVIGATION_MENU_LINK,
  NAVIGATION_MENU_LIST,
  NAVIGATION_MENU_ROOT,
} from "@gpuixui/tw";
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The nav root: one open item, the dismiss layer and the roving triggers. */
export const NavigationMenu = ({
  label,
  value: valueProp,
  defaultValue = null,
  onValueChange,
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
  assertParts(navigationMenuRoot, children);

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
      panelFocus,
      requestPanelFocus: setPanelFocus,
      clearPanelFocus: () => setPanelFocus(null),
    }),
    [focusTrigger, moveFocus, open, panelFocus, registerTrigger, setOpen],
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
  ...rest
}: ButtonProps) => {
  const { open, setOpen, registerTrigger, moveFocus, requestPanelFocus } =
    useNavigationMenu();
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
      onClick={(event) => {
        onClick?.(event);
        setOpen(expanded ? null : value);
      }}
      onKeyDown={(event: KeyEvent) => {
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The anchored panel for its item, rendered only while that item is open. */
export const NavigationMenuContent = ({
  children,
  className,
  style,
  onMouseDownOutside,
  ...rest
}: NavigationMenuContentProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { value, open } = useNavItem();
  const { panelFocus, clearPanelFocus } = useNavigationMenu();
  const [panel, setPanel] = useState<PublicInstance | undefined>(undefined);
  const panelId = panel?.id;
  assertParts(navigationMenuContent, children);

  useLayoutEffect(() => {
    if (!open || panelFocus !== value || panelId === undefined) return;
    renderer?.focusElement?.(panelId);
    clearPanelFocus();
  }, [clearPanelFocus, open, panelFocus, panelId, renderer, value]);

  if (!open) return null;

  return (
    <FloatingLayer
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={8}
      role="group"
      aria-label={value}
      tabIndex={-1}
      {...rest}
      ref={(instance) => setPanel(instance ?? undefined)}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      style={mergeStyles(
        overlaySurfaceStyle(NAVIGATION_MENU_CONTENT, className, theme),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A navigation row. 0.10.0 has no anchor/href, so this is a button. */
export const NavigationMenuLink = ({
  onSelect,
  onClick,
  className,
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
        mergeStyles(recipeStyle(cn(NAVIGATION_MENU_LINK, className), theme), {
          hover: {
            backgroundColor: theme.colors.accent,
            color: theme.colors.accentForeground,
          },
        }),
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
    "hover does not open (a second untested policy); press, Enter/Space or ArrowDown do",
    "ArrowDown moves focus to the panel surface, not straight to the first link",
    "no aria-haspopup in 0.10.0",
  ],
  docs: "docs/navigation-menu.mdx",
  example: "examples/navigation-menu.example.tsx",
  testFile: "src/behaviour/navigation-menu.test.tsx",
} as const;
