/**
 * ContextMenu: the shared menu rows, positioned at the pointer.
 *
 * `@gpuix/native@0.11.0` has no `onContextMenu`; a right click arrives as
 * `onAuxClick` with `isRightClick` (`mutations.ts` maps `onAuxClick` →
 * `"auxClick"`), so the trigger records the pointer point and opens.
 *
 * `anchored position` is window coordinates — plan 112 §1c measured it inside a
 * nested container — so the point is passed through unchanged. `FloatingLayer`
 * is anchor-relative and cannot take a pointer point, which is why the surface is
 * a bare `anchored` element plus the shared {@link MenuSurface}.
 */

import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { pipe } from "effect";
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
import { isMenuKey } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { keyboardRing, useTheme } from "./internal/theme.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "./menu/item.js";
import {
  MenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./menu/state.js";
import { MenuSub, MenuSubContent, MenuSubTrigger } from "./menu/sub.js";
import { MenuSurface } from "./menu/surface.js";

/** A point in window coordinates. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** The rules a context-menu part follows; throws outside a root. */
interface ContextMenuContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly point: Point;
  /** Open at `point` from a pointer; closing leaves focus where it went. */
  readonly openAt: (point: Point) => void;
  /** Open at `point` from the keyboard; closing returns focus to the trigger. */
  readonly openFromKeyboard: (point: Point) => void;
  /** Register the trigger's native id; returns the unregister function. */
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

/** {@link ContextMenu} props. */
export interface ContextMenuProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

/**
 * The context menu's open state, pointer point and dismiss layer. It paints
 * nothing itself: the surface appears where {@link ContextMenuContent} is
 * mounted.
 */
export const ContextMenu = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: ContextMenuProps) => {
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const triggerId = useRef<number | undefined>(undefined);
  const restoreFocus = useRef(false);

  // The layer callback must see the latest setter without being re-pushed.
  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });

  const close = useCallback(
    (reason: MenuCloseReason) => {
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
  const menu = useMenuState(close);

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
    setPoint(next);
    setOpenRef.current(true);
  }, []);

  const openFromKeyboard = useCallback((next: Point) => {
    restoreFocus.current = true;
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </MenuContext.Provider>
    </ContextMenuContext.Provider>
  );
};

/** {@link ContextMenuTrigger} props. */
export interface ContextMenuTriggerProps extends Props {
  readonly disabled?: boolean;
}

/** The area whose right click — or Shift+F10 — opens the menu. */
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

  // Stable identity: a fresh ref callback each render would re-register on every
  // paint (ListItem has the same constraint).
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef(attach, ref);

  useLayoutEffect(() => {
    // The native id is what focus returns to after a keyboard-opened menu.
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
          opacity: disabled ? 0.5 : 1,
          ...(disabled ? {} : keyboardRing(theme)),
        },
        style,
      )}
    />
  );
};

/** {@link ContextMenuContent} props. */
export interface ContextMenuContentProps extends Omit<Props, "children"> {
  /** The menu's accessible name. Default `"Context menu"`. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The surface at the pointer, rendered while open. Escape and an outside press
 * close it; the arrow keys and Enter follow the shared menu rules.
 */
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

  if (!open) return null;

  return (
    <anchored position={point} deferred priority={1} occlude>
      <MenuSurface
        {...rest}
        label={label}
        testId={testId}
        className={className}
        onMouseDownOutside={(event) => {
          onMouseDownOutside?.(event);
          dismissTopLayer(event);
        }}
        style={mergeStyles(
          // The anchored host does no layout of its own; the surface carries the
          // floating look. `position: relative` keeps it a positioned box for the
          // anchored layer's own measurement.
          { position: "relative" },
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
  MenuSeparator as ContextMenuSeparator,
};

export type {
  MenuCheckboxItemProps as ContextMenuCheckboxItemProps,
  MenuItemProps as ContextMenuItemProps,
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

/** Every part of the context menu, so a misplaced sibling is named. */
const contextMenuParts: ReadonlyArray<PartComponent> = [
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  MenuItem,
  MenuCheckboxItem,
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
    MenuGroup,
    MenuLabel,
    MenuSeparator,
    MenuSub,
  ],
  hint: "Put rows, groups, labels, separators and submenus directly inside ContextMenuContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
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
  ],
  docs: "docs/context-menu.mdx",
  example: "examples/context-menu.example.tsx",
  testFile: "src/behaviour/context-menu.test.tsx",
} as const;
