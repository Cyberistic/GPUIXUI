/** @jsxImportSource @gpuix/react */
import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match, pipe } from "effect";
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
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useDismissDepth } from "./internal/dismiss-scope.js";
import { useHoverDelays } from "./internal/hover.js";
import { isMenuKey } from "./internal/key.js";
import { MenuPointer, menuCloseGraceMs } from "./menu/hover.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { keyboardRing, disabledFade, useTheme } from "./internal/theme.js";
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
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { MenuSub, MenuSubContent, MenuSubTrigger } from "./menu/sub.js";
import { MenuSurface } from "./menu/surface.js";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface ContextMenuContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly point: Point;

  readonly openAt: (point: Point) => void;

  readonly openFromKeyboard: (point: Point) => void;

  readonly setTrigger: (id: number) => () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | undefined>(
  undefined,
);

const useContextMenuContext = (): ContextMenuContextValue => {
  const value = useContext(ContextMenuContext);
  if (value === undefined) {
    throw new Error("ContextMenu parts must be used inside ContextMenu");
  }
  return value;
};

export type ContextMenuOpenChangeReason =
  | "trigger-press"
  | "escape-key"
  | "item-press"
  | "outside-press"
  | "focus-out"
  | "pointer-leave";

export interface ContextMenuOpenChangeDetails {
  readonly reason: ContextMenuOpenChangeReason;
}

export interface ContextMenuProps {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;

  readonly onOpenChange?: (
    open: boolean,
    details: ContextMenuOpenChangeDetails,
  ) => void;
  readonly children?: PartChildren;
}

export const openChangeReason = (
  reason: MenuCloseReason,
): ContextMenuOpenChangeReason =>
  Match.value(reason).pipe(
    Match.when("activate", () => "item-press" as const),
    Match.when("dismiss", () => "escape-key" as const),
    Match.when("outside", () => "outside-press" as const),
    Match.when("leave", () => "focus-out" as const),
    Match.when("pointer", () => "pointer-leave" as const),
    Match.exhaustive,
  );

export const ContextMenu = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: ContextMenuProps) => {
  const renderer = useGpuix().renderer;

  const changeReason = useRef<ContextMenuOpenChangeReason>("trigger-press");
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: (next) => onOpenChange?.(next, { reason: changeReason.current }),
  });
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const triggerId = useRef<number | undefined>(undefined);
  const restoreFocus = useRef(false);

  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });

  const close = useCallback(
    (reason: MenuCloseReason) => {
      changeReason.current = openChangeReason(reason);
      setOpenRef.current(false);
      const target = triggerId.current;
      if (
        restoreFocus.current &&
        target !== undefined &&
        (reason === "activate" || reason === "dismiss")
      ) {
        renderer?.focusElement?.(target);
      }
      restoreFocus.current = false;
    },
    [renderer],
  );

  const pointer = useHoverDelays({
    open,
    setOpen: (next) => {
      if (!next) close("pointer");
    },
    openDelay: 0,
    closeDelay: menuCloseGraceMs,
  });
  const menu = useMenuState(close, (present) =>
    pointer.pointer("trigger", present),
  );

  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(
      (event) => close(event.eventType === "keyDown" ? "dismiss" : "outside"),
      depth,
    );
  }, [close, depth, open]);

  const openAt = useCallback((next: Point) => {
    restoreFocus.current = false;
    changeReason.current = "trigger-press";
    setPoint(next);
    setOpenRef.current(true);
  }, []);

  const openFromKeyboard = useCallback((next: Point) => {
    restoreFocus.current = true;
    changeReason.current = "trigger-press";
    setPoint(next);
    setOpenRef.current(true);
  }, []);

  const setTrigger = useCallback((id: number) => {
    triggerId.current = id;
    return () => {
      if (triggerId.current === id) triggerId.current = undefined;
    };
  }, []);

  const context = useMemo<ContextMenuContextValue>(
    () => ({ open, openAt, openFromKeyboard, setTrigger, setOpen, point }),
    [open, openAt, openFromKeyboard, point, setOpen, setTrigger],
  );

  assertParts(contextMenuRoot, children);

  return (
    <ContextMenuContext.Provider value={context}>
      <MenuContext.Provider value={menu}>
        {}
        <MenuPointer.Provider value={pointer}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </MenuPointer.Provider>
      </MenuContext.Provider>
    </ContextMenuContext.Provider>
  );
};

export interface ContextMenuTriggerProps extends Props {
  readonly disabled?: boolean;
}

export const ContextMenuTrigger = ({
  disabled = false,
  onAuxClick,
  onKeyDown,
  onFocus,
  onBlur,
  style,
  ref,
  ...rest
}: ContextMenuTriggerProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { openAt, openFromKeyboard, setTrigger } = useContextMenuContext();
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef(attach, ref);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return setTrigger(instance.id);
  }, [instance, setTrigger]);

  const openFromKey = (): void => {
    if (disabled || instance === undefined) return;
    pipe(
      Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
      Option.match({
        onNone: () => undefined,
        onSome: (bounds) =>
          openFromKeyboard({ x: bounds.x, y: bounds.y + bounds.height }),
      }),
    );
  };

  return (
    <div
      {...rest}
      ref={setElement}
      tabIndex={disabled ? -1 : 0}
      onAuxClick={(event: EventPayload) => {
        onAuxClick?.(event);
        if (disabled || event.isRightClick !== true) return;
        openAt({ x: event.x ?? 0, y: event.y ?? 0 });
      }}
      onKeyDown={(event: KeyEvent) => {
        if (isMenuKey(event)) openFromKey();
        onKeyDown?.(event);
      }}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          color: theme.colors.cardForeground,
          cursor: disabled ? "not-allowed" : "default",
          ...disabledFade(disabled),
          ...(disabled ? {} : keyboardRing(theme)),
        },
        style,
      )}
    />
  );
};

export interface ContextMenuContentProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const ContextMenuContent = ({
  label = "Context menu",
  children,
  testId = "context-menu",
  className,
  style,
  onMouseDownOutside,
  ...rest
}: ContextMenuContentProps) => {
  const { open, point } = useContextMenuContext();
  assertParts(contextMenuContent, children);

  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);

  if (!presence.mounted) return null;

  return (
    <anchored
      position={point}
      deferred
      priority={1}
      occlude={presence.present}
      style={presenceStyle(presence.present)}
    >
      <MenuSurface
        {...rest}
        motion={presenceMotion(fadeFromAnchor("bottom", 4), presence)}
        label={label}
        leaving={!presence.present}
        testId={testId}
        className={className}
        onMouseDownOutside={(event) => {
          onMouseDownOutside?.(event);
          dismissTopLayer(event);
        }}
        style={mergeStyles(
          {
            position: "relative",

            ...presenceStyle(presence.present),
          },
          style,
        )}
      >
        {children}
      </MenuSurface>
    </anchored>
  );
};

export {
  MenuCheckboxItem as ContextMenuCheckboxItem,
  MenuGroup as ContextMenuGroup,
  MenuItem as ContextMenuItem,
  MenuLabel as ContextMenuLabel,
  MenuRadioGroup as ContextMenuRadioGroup,
  MenuRadioItem as ContextMenuRadioItem,
  MenuSeparator as ContextMenuSeparator,
};

export type {
  MenuCheckboxItemProps as ContextMenuCheckboxItemProps,
  MenuItemProps as ContextMenuItemProps,
  MenuRadioGroupProps as ContextMenuRadioGroupProps,
  MenuRadioItemProps as ContextMenuRadioItemProps,
} from "./menu/item.js";

export {
  MenuSub as ContextMenuSub,
  MenuSubContent as ContextMenuSubContent,
  MenuSubTrigger as ContextMenuSubTrigger,
} from "./menu/sub.js";

export type {
  MenuSubContentProps as ContextMenuSubContentProps,
  MenuSubProps as ContextMenuSubProps,
  MenuSubTriggerProps as ContextMenuSubTriggerProps,
} from "./menu/sub.js";

const contextMenuParts: ReadonlyArray<PartComponent> = [
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
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

const contextMenuRoot: PartsContract = {
  parent: "ContextMenu",
  family: contextMenuParts,
  accepts: [ContextMenuTrigger, ContextMenuContent],
  hint: "Put ContextMenuTrigger and ContextMenuContent directly inside ContextMenu.",
};

const contextMenuContent: PartsContract = {
  parent: "ContextMenuContent",
  family: contextMenuParts,
  accepts: [
    MenuItem,
    MenuCheckboxItem,
    MenuRadioGroup,
    MenuGroup,
    MenuLabel,
    MenuSeparator,
    MenuSub,
  ],
  hint: "Put rows, groups, labels, separators and submenus directly inside ContextMenuContent.",
};

export const contextMenuMeta = {
  name: "Context menus",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "right click is onAuxClick + isRightClick: 0.11.0 has no onContextMenu",
    "the menu is scoped to its trigger: a right click outside the trigger closes it but does not open another",
    "one level of submenus is tested; deeper nesting follows the same rule but is untested",
    "no aria-haspopup in 0.11.0; a submenu trigger announces aria-expanded only",
    "the radio rows use aria-selected and a check icon because 0.11.0 has no aria-checked",
    "submenus open after a 100 ms pointer rest and close after an 80 ms grace (Base UI's delays)",
    "the surface is an anchored layer, out of the layout flow: opening it moves nothing behind it",
  ],
  docs: "docs/context-menu.mdx",
  example: "examples/context-menu.example.tsx",
  testFile: "src/behaviour/context-menu.test.tsx",
} as const;
