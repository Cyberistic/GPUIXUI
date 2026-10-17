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

  const context = useMemo<DropdownContextValue>(
    () => ({ open, setOpen, trigger, dismissedByOutsidePress }),
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
export const DropdownMenuTrigger = ({ onClick, ...rest }: ButtonProps) => {
  const { open, setOpen, trigger, dismissedByOutsidePress } =
    useDropdownContext();

  return (
    <Button
      {...rest}
      ref={trigger}
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
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
  const { open } = useDropdownContext();
  const menu = useMenuContext();
  const keys = menuKeyHandler(menu);

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
  gpuixSupport: "yes",
  limitations: [
    "no type-ahead: a correct one needs a timed buffer, which belongs to the Effect clock rule in plan 114 §2",
    "no submenus in v1",
    "the checkbox row uses aria-selected and a text ✓ because 0.10.0 has no aria-checked and no icon set",
  ],
  docs: "docs/dropdown-menu.mdx",
  example: "examples/dropdown-menu.example.tsx",
  testFile: "src/behaviour/dropdown-menu.test.tsx",
} as const;
