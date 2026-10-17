/**
 * ContextMenu: the shared menu rows, positioned at the pointer.
 *
 * `@gpuix/native@0.10.0` has no `onContextMenu`; a right click arrives as
 * `onAuxClick` with `isRightClick` (`mutations.ts` maps `onAuxClick` →
 * `"auxClick"`), so the trigger records the pointer point and opens.
 *
 * `anchored position` is window coordinates — plan 112 §1c measured it inside a
 * nested container — so the point is passed through unchanged. `FloatingLayer`
 * is anchor-relative and cannot take a pointer point, which is why the surface is
 * a bare `anchored` element plus the shared {@link MenuSurface}.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useTheme } from "./internal/theme.js";
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
  /** Open at `point`; called by the trigger's right click. */
  readonly openAt: (point: Point) => void;
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
  readonly children?: ReactNode;
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
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });

  // The layer callback must see the latest setter without being re-pushed.
  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });

  const close = useCallback((_reason: MenuCloseReason) => {
    setOpenRef.current(false);
  }, []);
  const menu = useMenuState(close);

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(() => setOpenRef.current(false));
  }, [open]);

  const openAt = useCallback((next: Point) => {
    setPoint(next);
    setOpenRef.current(true);
  }, []);

  const context = useMemo<ContextMenuContextValue>(
    () => ({ open, setOpen, point, openAt }),
    [open, openAt, point, setOpen],
  );

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

/** The area whose right click opens the menu. */
export const ContextMenuTrigger = ({
  disabled = false,
  onAuxClick,
  style,
  ...rest
}: ContextMenuTriggerProps) => {
  const theme = useTheme();
  const { openAt } = useContextMenuContext();

  return (
    <div
      {...rest}
      onAuxClick={(event: EventPayload) => {
        onAuxClick?.(event);
        if (disabled || event.isRightClick !== true) return;
        openAt({ x: event.x ?? 0, y: event.y ?? 0 });
      }}
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
        },
        style,
      )}
    />
  );
};

/** {@link ContextMenuContent} props. */
export interface ContextMenuContentProps extends Props {
  /** The menu's accessible name. Default `"Context menu"`. */
  readonly label?: string;
  readonly children?: ReactNode;
}

/**
 * The surface at the pointer, rendered while open. Escape and an outside press
 * close it; the arrow keys and Enter follow the shared menu rules.
 */
export const ContextMenuContent = ({
  label = "Context menu",
  children,
  testId = "context-menu",
  style,
  onMouseDownOutside,
  ...rest
}: ContextMenuContentProps) => {
  const { open, point } = useContextMenuContext();

  if (!open) return null;

  return (
    <anchored position={point} deferred priority={1} occlude>
      <MenuSurface
        {...rest}
        label={label}
        testId={testId}
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const contextMenuMeta = {
  name: "Context menus",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "right click is onAuxClick + isRightClick: 0.10.0 has no onContextMenu",
    "the menu is scoped to its trigger: a right click outside the trigger closes it but does not open another",
    "no submenus and no type-ahead, as with DropdownMenu",
  ],
  docs: "docs/context-menu.mdx",
  example: "examples/context-menu.example.tsx",
  testFile: "src/behaviour/context-menu.test.tsx",
} as const;
