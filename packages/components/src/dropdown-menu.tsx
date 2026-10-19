/**
 * DropdownMenu: a list of actions anchored to the control that opened it.
 *
 * The open state, the anchored positioning and the trigger's press rule live
 * here; the rows, the highlight rules and the surface are shared with the Context
 * menu (`menu/state.ts`, `menu/item.tsx`).
 *
 * Dismissal goes through `internal/dismiss-layer.ts`, so a menu inside a dialog
 * closes only the menu. A press on the menu's own trigger is not an outside
 * press: the layer claims it and the click closes the menu, because the press and
 * the click arrive in separate tasks (plan 583).
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
  type RefObject,
} from "react";
import { Button, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { isEventClaimed } from "./internal/event-claim.js";
import { isDown, isEnter, isSpaceRelease, isUp } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { pressedOn } from "./internal/pointer.js";
import { useMergedRef } from "./internal/ref.js";
import { textStyle, useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "./menu/item.js";
import { MenuRadioGroup, MenuRadioItem } from "./menu/radio.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { MenuSub, MenuSubContent, MenuSubTrigger } from "./menu/sub.js";
import {
  MenuSurfaceStack,
  menuKeyHandler,
  menuSurfaceStyle,
} from "./menu/surface.js";

/** The rules a {@link DropdownMenuContent} follows. */
interface DropdownContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;
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
  readonly children?: PartChildren;
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

  // A press on the menu's own trigger is that trigger's gesture: claim the event
  // so an enclosing dialog stays open, but let the click close the menu, because
  // the press and the click arrive in separate tasks (plan 583).
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      if (
        event.eventType !== "keyDown" &&
        pressedOn(renderer, trigger.current, event)
      ) {
        return;
      }
      close(event.eventType === "keyDown" ? "dismiss" : "outside");
    });
  }, [close, open, renderer]);

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
    () => ({ open, setOpen, trigger, pendingFocus }),
    [open, setOpen],
  );

  assertParts(dropdownRoot, children);

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
  const { open, setOpen, trigger, pendingFocus } = useDropdownContext();
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
        // Arrow keys open without a click. Space is not handled here: the local
        // Button activates Space on key up, and opening on key down would let
        // that key-up click close the menu again.
        if (rest.disabled !== true && !open) {
          if (isDown(event)) openAt("first");
          else if (isUp(event)) openAt("last");
        }
        onKeyDown?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        // A button-shaped control synthesises this click on Enter (key down) or
        // Space (key up). A pointer open keeps focus on the surface; only a
        // keyboard open names a row.
        const fromKeyboard = isEnter(event) || isSpaceRelease(event);
        pendingFocus.current = fromKeyboard && !open ? "first" : null;
        setOpen(!open);
      }}
    />
  );
};

/** {@link DropdownMenuContent} props: a floating list of rows. */
export interface DropdownMenuContentProps extends FloatingContentProps {
  /** The menu's accessible name. */
  readonly label?: string;
  /** Default `"bottom"`. Flipped once if the snapped surface would cover the trigger. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. `"center"` is measured from the trigger, not the runtime's `center`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between trigger and surface. Default `4`. */
  readonly sideOffset?: number;
  /** Added on top of the measured centre correction. Default `0`. */
  readonly alignOffset?: number;
  readonly children?: PartChildren;
}

/** The menu surface, rendered while the menu is open. */
export const DropdownMenuContent = ({
  label,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: DropdownMenuContentProps) => {
  const theme = useTheme();
  const { open, trigger, pendingFocus } = useDropdownContext();
  const menu = useMenuContext();
  const keys = menuKeyHandler(menu);
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const surfaceStack = useMemo(() => [surface], [surface]);
  const placement = usePlacement({
    open,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });
  assertParts(dropdownContent, children);

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
    <MenuSurfaceStack.Provider value={surfaceStack}>
      <FloatingLayer
        side={placement.side}
        align={placement.align}
        sideOffset={sideOffset}
        alignOffset={placement.alignOffset + alignOffset}
        collisionPadding={collisionPadding}
        role="menu"
        {...(label === undefined ? {} : { "aria-label": label })}
        tabIndex={-1}
        autoFocus
        ref={setSurface}
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
    </MenuSurfaceStack.Provider>
  );
};

export {
  MenuSub as DropdownMenuSub,
  MenuSubContent as DropdownMenuSubContent,
  MenuSubTrigger as DropdownMenuSubTrigger,
} from "./menu/sub.js";

export type {
  MenuSubContentProps as DropdownMenuSubContentProps,
  MenuSubProps as DropdownMenuSubProps,
  MenuSubTriggerProps as DropdownMenuSubTriggerProps,
} from "./menu/sub.js";

export {
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuGroup as DropdownMenuGroup,
  MenuItem as DropdownMenuItem,
  MenuLabel as DropdownMenuLabel,
  MenuRadioGroup as DropdownMenuRadioGroup,
  MenuRadioItem as DropdownMenuRadioItem,
  MenuSeparator as DropdownMenuSeparator,
};

export type {
  MenuCheckboxItemProps as DropdownMenuCheckboxItemProps,
  MenuItemProps as DropdownMenuItemProps,
} from "./menu/item.js";

export type {
  MenuRadioGroupProps as DropdownMenuRadioGroupProps,
  MenuRadioItemProps as DropdownMenuRadioItemProps,
  MenuRadioItemState as DropdownMenuRadioItemState,
} from "./menu/radio.js";

/** Every part of the dropdown menu, so a misplaced sibling is named. */
const dropdownParts: ReadonlyArray<PartComponent> = [
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
];

const dropdownRoot: PartsContract = {
  parent: "DropdownMenu",
  family: dropdownParts,
  accepts: [DropdownMenuTrigger, DropdownMenuContent],
  hint: "Put DropdownMenuTrigger and DropdownMenuContent directly inside DropdownMenu.",
};

const dropdownContent: PartsContract = {
  parent: "DropdownMenuContent",
  family: dropdownParts,
  accepts: [
    MenuItem,
    MenuCheckboxItem,
    MenuGroup,
    MenuLabel,
    MenuSeparator,
    MenuRadioGroup,
    MenuSub,
  ],
  hint: "Put rows, groups, labels, separators and submenus directly inside DropdownMenuContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const dropdownMenuMeta = {
  name: "Dropdown menus",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    'the root surface flips once when snapping would cover its trigger, and align="center" is measured from the trigger; the snap margin wins near a window edge',
    'a submenu opens right when it fits and otherwise left of its row; a surface wider than both sides is still clamped by fit="snap"',
    "no aria-haspopup in 0.10.0; a submenu trigger announces aria-expanded only",
    "type-ahead is a case-insensitive 500 ms prefix search with no fuzzy scoring; a composed label needs textValue",
    "the checkbox row uses aria-selected and a check icon because 0.10.0 has no aria-checked",
    "the radio row uses aria-selected and a dot because 0.10.0 has no aria-checked",
  ],
  docs: "docs/dropdown-menu.mdx",
  example: "examples/dropdown-menu.example.tsx",
  testFile: "src/behaviour/dropdown-menu.test.tsx",
} as const;
