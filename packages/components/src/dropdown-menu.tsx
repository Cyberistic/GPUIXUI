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
import type { PublicInstance } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { textStyle, useTheme } from "./internal/theme.js";
import { Button, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useMergedRef } from "./internal/ref.js";
import { isActivation, isDown, isUp } from "./internal/key.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "./menu/item.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { menuKeyHandler, menuSurfaceStyle } from "./menu/surface.js";

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
    setOpenRef.current(false);
  }, []);

  const menu = useMenuState(close);

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      if (event.eventType === "keyDown") {
        close("dismiss");
        return;
      }
      // Mark the press so the click it belongs to cannot toggle the menu back
      // open. The microtask clears the mark before the next user gesture.
      dismissedByOutsidePress.current = true;
      queueMicrotask(() => {
        dismissedByOutsidePress.current = false;
      });
      close("outside");
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
    "type-ahead is a case-insensitive 500 ms prefix search with no fuzzy scoring; a composed label needs textValue",
    "no submenus in v1",
    "the checkbox row uses aria-selected and a text ✓ because 0.10.0 has no aria-checked and no icon set",
  ],
  docs: "docs/dropdown-menu.mdx",
  example: "examples/dropdown-menu.example.tsx",
  testFile: "src/behaviour/dropdown-menu.test.tsx",
} as const;
