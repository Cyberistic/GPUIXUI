/** @jsxImportSource @gpuix/react */
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
import {
  dismissTopLayer,
  isDismissalClick,
  pushDismissLayer,
} from "./internal/dismiss-layer.js";
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
  MenuLeaving,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { MenuSub, MenuSubContent, MenuSubTrigger } from "./menu/sub.js";
import { menuKeyHandlers, menuSurfaceStyle } from "./menu/surface.js";

interface DropdownContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly trigger: RefObject<PublicInstance | null>;

  readonly pendingFocus: RefObject<"first" | "last" | null>;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(
  undefined,
);

const useDropdownContext = (): DropdownContextValue => {
  const value = useContext(DropdownContext);
  if (value === undefined) {
    throw new Error("DropdownMenu parts must be used inside DropdownMenu");
  }
  return value;
};

export interface DropdownMenuProps {
  readonly open?: boolean;

  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

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

  const pendingFocus = useRef<"first" | "last" | null>(null);

  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });

  const close = useCallback((reason: MenuCloseReason) => {
    restoreFocus.current = reason === "activate" || reason === "dismiss";
    if (reason === "outside") {
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

export const DropdownMenuTrigger = ({
  onClick,
  onKeyDown,
  onKeyUp,
  ref,
  disabled = false,
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
      disabled={disabled}
      aria-expanded={open}
      onKeyDown={(event) => {
        if (!disabled && !open) {
          if (isDown(event)) openAt("first");
          else if (isUp(event)) openAt("last");
          else if (swallowsDefault(event, "down")) event.preventDefault();
          else if (isActivation(event, "down")) openAt("first");
        }
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (!disabled && !open && isActivation(event, "up")) openAt("first");
        onKeyUp?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);

        pendingFocus.current = null;

        if (isDismissalClick(event)) return;
        setOpen(!open);
      }}
    />
  );
};

export interface DropdownMenuContentProps extends FloatingContentProps {
  readonly label?: string;

  readonly className?: string;

  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly alignOffset?: number;
  readonly children?: PartChildren;
}

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
    open: presence.mounted,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });
  assertParts(dropdownContent, children);

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

          { position: "relative", ...presenceStyle(presence.present) },
        ),
        style,
      )}
    >
      <MenuLeaving.Provider value={!presence.present}>
        <DismissScope>{children}</DismissScope>
      </MenuLeaving.Provider>
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
