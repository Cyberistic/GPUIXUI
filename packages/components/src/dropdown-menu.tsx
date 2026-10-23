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
  type RefObject,
} from "react";
import { Button, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { DismissScope, useDismissDepth } from "./internal/dismiss-scope.js";
import { isActivation, isDown, isUp, swallowsDefault } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFromAnchor,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
} from "./menu/item.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { MenuSub, MenuSubContent, MenuSubTrigger } from "./menu/sub.js";
import { menuKeyHandlers, menuSurfaceStyle } from "./menu/surface.js";

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

  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      close(event.eventType === "keyDown" ? "dismiss" : "outside");
    }, depth);
  }, [close, depth, open]);

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
  onKeyUp,
  ref,
  disabled = false,
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
      disabled={disabled}
      aria-expanded={open}
      onKeyDown={(event) => {
        // The local Button keeps a disabled control's key handler observable, so
        // the trigger refuses the open itself rather than relying on the press.
        if (!disabled && !open) {
          if (isDown(event)) openAt("first");
          else if (isUp(event)) openAt("last");
          else if (swallowsDefault(event, "down")) event.preventDefault();
          else if (isActivation(event, "down")) openAt("first");
        }
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        // Space's release is an activation, so a keyboard open lands on the
        // first row exactly like Enter's press does.
        if (!disabled && !open && isActivation(event, "up")) openAt("first");
        onKeyUp?.(event);
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  children,
  onKeyDown,
  onKeyUp,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: DropdownMenuContentProps) => {
  const theme = useTheme();
  const { open, trigger, pendingFocus } = useDropdownContext();
  const menu = useMenuContext();
  const keys = menuKeyHandlers(menu);
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);
  const placement = usePlacement({
    // The exit tween keeps the measured side, so a flipped menu does not jump
    // back while it fades out.
    open: presence.mounted,
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

  if (!presence.mounted) return null;

  return (
    <FloatingLayer
      motion={presenceMotion(fadeFromAnchor(placement.side, 4), presence)}
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
        keys.onKeyDown(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        keys.onKeyUp(event);
        onKeyUp?.(event);
      }}
      style={mergeStyles(
        mergeStyles(
          menuSurfaceStyle(theme, className),
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
  MenuRadioGroupProps as DropdownMenuRadioGroupProps,
  MenuRadioItemProps as DropdownMenuRadioItemProps,
} from "./menu/item.js";

/** Every part of the dropdown menu, so a misplaced sibling is named. */
const dropdownParts: ReadonlyArray<PartComponent> = [
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
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
    MenuRadioGroup,
    MenuGroup,
    MenuLabel,
    MenuSeparator,
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
  limitations: [
    "one level of submenus is tested; deeper nesting follows the same rule but is untested",
    'the root surface flips once when snapping would cover its trigger, and align="center" is measured from the trigger; the snap margin wins near a window edge',
    'submenus open to the right and are clamped by fit="snap"; there is no left-side flip',
    "no aria-haspopup in 0.11.0; a submenu trigger announces aria-expanded only",
    "type-ahead is a case-insensitive 500 ms prefix search with no fuzzy scoring; a composed label needs textValue",
    "the checkbox and radio rows use aria-selected and a check icon because 0.11.0 has no aria-checked",
    "a radio group is controlled: the popup unmounts when it closes, so the caller owns the choice",
  ],
  docs: "docs/dropdown-menu.mdx",
  example: "examples/dropdown-menu.example.tsx",
  testFile: "src/behaviour/dropdown-menu.test.tsx",
} as const;
