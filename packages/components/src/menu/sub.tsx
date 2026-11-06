/** @jsxImportSource @gpuix/react */
import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Match } from "effect";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { pushDismissLayer } from "../internal/dismiss-layer.js";
import { useDismissDepth } from "../internal/dismiss-scope.js";
import { claimEvent } from "../internal/event-claim.js";
import { useHoverDelays } from "../internal/hover.js";
import { isDown, isLeft, isRight, isUp } from "../internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "../internal/parts.js";
import {
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "../internal/presence.js";
import { useMergedRef } from "../internal/ref.js";
import { useTheme } from "../internal/theme.js";
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  type MenuItemProps,
} from "./item.js";
import { MenuPointer, menuCloseGraceMs, submenuOpenDelayMs } from "./hover.js";
import {
  MenuContext,
  useMenuContext,
  useMenuState,
  type MenuCloseReason,
} from "./state.js";
import { MenuSurface } from "./surface.js";

interface SubContextValue {
  readonly open: boolean;

  readonly openNow: () => void;

  readonly close: (reason: MenuCloseReason) => void;

  readonly hoverTrigger: (present: boolean) => void;

  readonly hoverContent: (present: boolean) => void;

  readonly trigger: RefObject<PublicInstance | null>;

  readonly focusEdge: RefObject<((edge: "first" | "last") => void) | null>;
}

const SubContext = createContext<SubContextValue | undefined>(undefined);

const useSubContext = (): SubContextValue => {
  const value = useContext(SubContext);
  if (value === undefined) {
    throw new Error("Submenu parts must be used inside a Submenu");
  }
  return value;
};

export interface MenuSubProps {
  readonly children?: PartChildren;
}

export const MenuSub = ({ children }: MenuSubProps) => {
  const renderer = useGpuix().renderer;
  const parent = useMenuContext();
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);
  const focusEdge = useRef<((edge: "first" | "last") => void) | null>(null);
  const restoreFocus = useRef(false);

  const focusTrigger = useCallback(() => {
    Option.match(Option.fromNullishOr(trigger.current), {
      onNone: () => undefined,
      onSome: (instance) => renderer?.focusElement?.(instance.id),
    });
  }, [renderer, trigger]);

  const hover = useHoverDelays({
    open,
    setOpen: (next) => {
      if (!next) restoreFocus.current = true;
      setOpen(next);
    },
    openDelay: submenuOpenDelayMs,
    closeDelay: menuCloseGraceMs,
  });

  const openNow = useCallback(() => {
    hover.cancel();
    setOpen(true);
  }, [hover]);

  const close = useCallback(
    (reason: MenuCloseReason) => {
      restoreFocus.current = reason === "dismiss" || reason === "pointer";
      hover.cancel();
      setOpen(false);

      if (reason === "pointer") return;
      Match.value(reason).pipe(
        Match.when("activate", () => parent.close("activate")),
        Match.when("leave", () => parent.close("leave")),
        Match.when("outside", () => parent.close("outside")),
        Match.when("dismiss", () => undefined),
        Match.exhaustive,
      );
    },
    [hover, parent],
  );

  useLayoutEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    focusTrigger();
  }, [focusTrigger, open]);

  const value = useMemo<SubContextValue>(
    () => ({
      open,
      openNow,
      close,
      hoverTrigger: (present) => hover.pointer("trigger", present),
      hoverContent: (present) => hover.pointer("content", present),
      trigger,
      focusEdge,
    }),
    [close, hover, open, openNow],
  );
  assertParts(menuSub, children);

  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

export interface MenuSubTriggerProps extends Omit<
  MenuItemProps,
  "onSelect" | "closeOnSelect" | "tone"
> {}

export const MenuSubTrigger = ({
  children,
  trailing,
  textValue,
  disabled = false,
  onKeyDown,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  ref,
  ...rest
}: MenuSubTriggerProps) => {
  const theme = useTheme();
  const { open, openNow, close, hoverTrigger, trigger, focusEdge } =
    useSubContext();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);

  return (
    <MenuItem
      {...rest}
      ref={setTrigger}
      disabled={disabled}
      closeOnSelect={false}
      aria-expanded={open}
      textValue={textValue}
      onSelect={() => (open ? close("dismiss") : openNow())}
      onFocus={(event) => {
        if (open) focusEdge.current?.("first");
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        if (!disabled) hoverTrigger(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!disabled) hoverTrigger(false);
        onMouseLeave?.(event);
      }}
      onKeyDown={(event) => {
        if (!open) {
          if (isRight(event) || isDown(event) || isUp(event)) openNow();
        } else if (isDown(event) || isUp(event)) {
          claimEvent(event);
          focusEdge.current?.(isDown(event) ? "first" : "last");
        } else if (isRight(event)) {
          claimEvent(event);
          focusEdge.current?.("first");
        } else if (isLeft(event)) {
          close("dismiss");
        }
        onKeyDown?.(event);
      }}
      trailing={
        trailing ?? (
          <Icon
            name="chevron-right"
            size="xs"
            color={theme.colors.mutedForeground}
          />
        )
      }
    >
      {children}
    </MenuItem>
  );
};

const SUBMENU_GAP = 4;

const SUBMENU_MAX_HEIGHT = 320;

export interface MenuSubContentProps extends Omit<Props, "children"> {
  readonly label?: string;
  readonly children?: PartChildren;
}

export const MenuSubContent = ({
  label,
  children,
  onKeyDown,
  style,
  testId,
  ...rest
}: MenuSubContentProps) => {
  const renderer = useGpuix().renderer;
  const { open, close, hoverContent, trigger, focusEdge } = useSubContext();
  const parent = useMenuContext();
  const pointer = useContext(MenuPointer);
  assertParts(menuSubContent, children);
  const parentClaim = parent.claimSubmenu;
  const surface = useRef<PublicInstance | null>(null);

  const menu = useMenuState(close, (present) => {
    hoverContent(present);
    pointer?.pointer("trigger", present);
  });

  const depth = useDismissDepth();

  useLayoutEffect(() => {
    focusEdge.current = (edge) =>
      menu.step({ _tag: edge === "first" ? "First" : "Last" });
  }, [focusEdge, menu]);

  useLayoutEffect(
    () => () => {
      focusEdge.current = null;
    },
    [focusEdge],
  );

  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  const insideSurface = useCallback(
    (event: EventPayload): boolean => {
      const instance = surface.current;
      if (instance === null) return false;
      const bounds = renderer?.getElementBounds?.(instance.id);
      if (bounds === null || bounds === undefined) return false;
      const { x, y } = event;
      return (
        x !== undefined &&
        y !== undefined &&
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    },
    [renderer],
  );

  const setSurface = useCallback((next: PublicInstance | null) => {
    surface.current = next;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const release = parentClaim(
      () => closeRef.current("pointer"),
      trigger.current?.id,
    );
    const pop = pushDismissLayer((event) => {
      if (event.eventType === "mouseDownOutside" && insideSurface(event))
        return;
      closeRef.current(event.eventType === "keyDown" ? "dismiss" : "outside");
    }, depth);
    return () => {
      pop();
      release();
    };
  }, [depth, insideSurface, open, parentClaim, trigger]);

  const [point, setPoint] = useState<{ x: number; y: number } | undefined>();

  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(open, timing);

  useLayoutEffect(() => {
    if (!open) return;
    const instance = trigger.current;
    if (instance === null) return;
    Option.match(
      Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
      {
        onNone: () => undefined,
        onSome: (bounds) =>
          setPoint({
            x: bounds.x + bounds.width + SUBMENU_GAP,
            y: bounds.y,
          }),
      },
    );
  }, [open, renderer, trigger]);

  const pendingFocus = useRef(true);
  useLayoutEffect(() => {
    if (!open) {
      pendingFocus.current = true;
      return;
    }
    if (!pendingFocus.current || menu.rows.length === 0) return;
    pendingFocus.current = false;
    menu.step({ _tag: "First" });
  }, [menu, open]);

  if (!presence.mounted || point === undefined) return null;

  return (
    <MenuContext.Provider value={menu}>
      <anchored
        position={point}
        fit="snap"
        snapMargin={8}
        deferred
        priority={1}
        occlude={presence.present}
      >
        <MenuSurface
          ref={setSurface}
          testId={testId}
          label={label}
          leaving={!presence.present}
          motion={presenceMotion(fadeFromAnchor("right", 4), presence)}
          {...rest}
          onKeyDown={(event) => {
            claimEvent(event);
            if (isLeft(event)) close("dismiss");
            onKeyDown?.(event);
          }}
          style={mergeStyles(
            {
              position: "relative",
              ...presenceStyle(presence.present),
            },
            style,
          )}
        >
          {}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: SUBMENU_MAX_HEIGHT,
              overflowY: "scroll",
            }}
          >
            {children}
          </div>
        </MenuSurface>
      </anchored>
    </MenuContext.Provider>
  );
};

const subParts: ReadonlyArray<PartComponent> = [
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuItem,
  MenuCheckboxItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
];

const menuSub: PartsContract = {
  parent: "MenuSub",
  family: subParts,
  accepts: [MenuSubTrigger, MenuSubContent],
  hint: "Put the submenu trigger and its content directly inside MenuSub.",
};

const menuSubContent: PartsContract = {
  parent: "MenuSubContent",
  family: subParts,
  accepts: [
    MenuItem,
    MenuCheckboxItem,
    MenuGroup,
    MenuLabel,
    MenuSeparator,
    MenuSub,
  ],
  hint: "Put rows, groups, labels, separators and nested submenus directly inside MenuSubContent.",
};
