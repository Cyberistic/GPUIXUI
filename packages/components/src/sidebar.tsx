/** @jsxImportSource @gpuix/react */
import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useGpuix,
  useWindowSize,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Button as Action } from "@gpuixui/primitives/button";
import {
  cn,
  SIDEBAR_CONTENT,
  SIDEBAR_FLOATING,
  SIDEBAR_FOOTER,
  SIDEBAR_GROUP,
  SIDEBAR_GROUP_ACTION,
  SIDEBAR_GROUP_CONTENT,
  SIDEBAR_GROUP_LABEL,
  SIDEBAR_GROUP_LABEL_TEXT,
  SIDEBAR_HEADER,
  SIDEBAR_INNER,
  SIDEBAR_INPUT,
  SIDEBAR_INSET,
  SIDEBAR_MENU,
  SIDEBAR_MENU_ACTION,
  SIDEBAR_MENU_BADGE,
  SIDEBAR_MENU_BUTTON,
  SIDEBAR_MENU_BUTTON_SIZES,
  SIDEBAR_MENU_ITEM,
  SIDEBAR_MENU_LABEL,
  SIDEBAR_MENU_SKELETON,
  SIDEBAR_MENU_SKELETON_ICON,
  SIDEBAR_MENU_SKELETON_TEXT,
  SIDEBAR_MENU_SUB,
  SIDEBAR_MENU_SUB_BUTTON,
  SIDEBAR_MENU_SUB_ITEM,
  SIDEBAR_ROOT,
  SIDEBAR_SCRIM,
  SIDEBAR_SEPARATOR,
  SIDEBAR_SHEET,
  SIDEBAR_TOOLTIP,
  SIDEBAR_TOOLTIP_TEXT,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FieldInput } from "./field.js";
import { IconButton } from "./internal/button.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { DismissScope } from "./internal/dismiss-scope.js";
import {
  handleModalKeyDown,
  useModalFocus,
  useModalState,
} from "./internal/modal.js";
import {
  fadeFromSide,
  fadeOnly,
  presenceMotion,
  presenceStyle,
  PresenceShield,
  useMoveTiming,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  controlRing,
  disabledFade,
  elevationShadow,
  pressWash,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import {
  collapsibleOf,
  isMobileWidth,
  railPadding,
  sidebarGap,
  sidebarInsetBox,
  sidebarOffset,
  sidebarWidth,
  sideOf,
  skeletonWidth,
  variantOf,
  SIDEBAR_ICON_ROW,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from "./sidebar/logic.js";
export type {
  SidebarCollapsible,
  SidebarSide,
  SidebarState,
  SidebarVariant,
} from "./sidebar/logic.js";
export {
  SIDEBAR_BREAKPOINT,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
} from "./sidebar/logic.js";
import type { SidebarPreference } from "./sidebar/preference.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import { makeSidebarStore, tooltipShown } from "./sidebar/store.js";

export interface SidebarContextValue {
  readonly state: "expanded" | "collapsed";
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly openMobile: boolean;
  readonly setOpenMobile: (open: boolean) => void;
  readonly isMobile: boolean;
  readonly toggleSidebar: () => void;
  readonly side: SidebarSide;
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;

  readonly width: number;

  readonly iconWidth: number;

  readonly mobileWidth: number;

  readonly tooltip: Option.Option<string>;
  readonly showTooltip: (label: string) => void;
  readonly hideTooltip: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined,
);

export const useSidebar = (): SidebarContextValue => {
  const value = useContext(SidebarContext);
  if (value === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return value;
};

export const isSidebarShortcut = (event: KeyEvent): boolean =>
  event.isHeld !== true &&
  event.key?.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
  (event.modifiers?.cmd === true || event.modifiers?.ctrl === true);

const positiveWidth = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

const iconCollapsed = (context: SidebarContextValue): boolean =>
  context.state === "collapsed" && context.collapsible === "icon";

const useRailPadding = () => {
  const context = useSidebar();
  if (!iconCollapsed(context)) return undefined;
  const pad = railPadding(context.iconWidth);
  return { paddingLeft: pad, paddingRight: pad };
};

const layoutOf = (context: SidebarContextValue) => ({
  open: context.open,
  variant: context.variant,
  collapsible: context.collapsible,
  width: context.width,
  iconWidth: context.iconWidth,
});

export interface SidebarProviderProps extends Omit<Props, "children"> {
  readonly defaultOpen?: boolean;

  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly preference?: SidebarPreference;

  readonly side?: SidebarSide;

  readonly variant?: SidebarVariant;

  readonly collapsible?: SidebarCollapsible;

  readonly width?: number;

  readonly iconWidth?: number;

  readonly mobileWidth?: number;
  readonly children?: ReactNode;
}

export const SidebarProvider = ({
  defaultOpen,
  open: openProp,
  onOpenChange,
  preference,
  side: requestedSide = "left",
  variant: requestedVariant = "sidebar",
  collapsible: requestedCollapsible = "offcanvas",
  width: requestedWidth,
  iconWidth: requestedIconWidth,
  mobileWidth: requestedMobileWidth,
  onKeyDown,
  style,
  children,
  ...rest
}: SidebarProviderProps) => {
  const theme = useTheme();
  const window = useWindowSize();
  const isMobile = isMobileWidth(window.width);
  const side = sideOf(requestedSide);
  const variant = variantOf(requestedVariant);
  const collapsible = collapsibleOf(requestedCollapsible);
  const width = positiveWidth(requestedWidth, SIDEBAR_WIDTH);
  const iconWidth = positiveWidth(requestedIconWidth, SIDEBAR_WIDTH_ICON);
  const mobileWidth = positiveWidth(requestedMobileWidth, SIDEBAR_WIDTH_MOBILE);

  const store = useLocalStore(
    makeSidebarStore({
      initialOpen: openProp ?? defaultOpen,
      preference,
    }),
  );
  const snapshot = useLocalState(store.local);

  useEffect(() => {
    if (openProp === undefined || openProp === snapshot.open) return;
    send(store.setOpen(openProp));
  }, [openProp, snapshot.open, store]);

  const open = snapshot.open;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) send(store.setOpen(next));
      else onOpenChange?.(next);
    },
    [onOpenChange, openProp, store],
  );

  const setOpenMobile = useCallback(
    (next: boolean) => send(store.setMobileOpen(next)),
    [store],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) send(store.toggleMobile);
    else setOpen(!open);
  }, [isMobile, open, setOpen, store]);

  const showTooltip = useCallback(
    (label: string) => send(store.showTooltip(label)),
    [store],
  );
  const hideTooltip = useCallback(() => send(store.hideTooltip), [store]);

  const handleKeyDown = (event: KeyEvent): void => {
    onKeyDown?.(event);
    if (!isSidebarShortcut(event)) return;
    event.preventDefault();
    toggleSidebar();
  };

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile: snapshot.mobileOpen,
      setOpenMobile,
      isMobile,
      toggleSidebar,
      side,
      variant,
      collapsible,
      width,
      iconWidth,
      mobileWidth,
      tooltip: snapshot.tooltip,
      showTooltip,
      hideTooltip,
    }),
    [
      collapsible,
      hideTooltip,
      iconWidth,
      isMobile,
      mobileWidth,
      open,
      setOpen,
      setOpenMobile,
      showTooltip,
      side,
      snapshot.mobileOpen,
      snapshot.tooltip,
      toggleSidebar,
      variant,
      width,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        {...rest}
        testId={rest.testId ?? "sidebar-provider"}
        onKeyDown={handleKeyDown}
        style={mergeStyles(
          mergeStyles(recipeStyle(SIDEBAR_ROOT, theme), {
            backgroundColor:
              variant === "inset" ? theme.colors.card : theme.colors.background,
          }),
          style,
        )}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

export interface SidebarProps extends Omit<Props, "children"> {
  readonly side?: SidebarSide;

  readonly variant?: SidebarVariant;

  readonly collapsible?: SidebarCollapsible;

  readonly className?: string;
  readonly children?: ReactNode;
}

export const Sidebar = ({
  side: requestedSide,
  variant: requestedVariant,
  collapsible: requestedCollapsible,
  className,
  style,
  children,
  ...rest
}: SidebarProps) => {
  const context = useSidebar();
  const theme = useTheme();
  const timing = useMoveTiming("normal");
  const side =
    requestedSide === undefined ? context.side : sideOf(requestedSide);
  const variant =
    requestedVariant === undefined
      ? context.variant
      : variantOf(requestedVariant);
  const collapsible =
    requestedCollapsible === undefined
      ? context.collapsible
      : collapsibleOf(requestedCollapsible);

  if (context.isMobile) {
    return (
      <SidebarSheet side={side} className={className} style={style}>
        {children}
      </SidebarSheet>
    );
  }

  const layout = layoutOf(context);
  const inner = mergeStyles(
    mergeStyles(recipeStyle(cn(SIDEBAR_INNER, className), theme), {
      position: "relative",
      ...(variant === "sidebar" ? {} : recipeStyle(SIDEBAR_FLOATING, theme)),
    }),
    style,
  );

  if (collapsible === "none") {
    return (
      <div
        {...rest}
        testId={rest.testId ?? "sidebar"}
        style={mergeStyles(inner, {
          width: sidebarWidth(layout),
          flexShrink: 0,
        })}
      >
        {children}
      </div>
    );
  }

  const width = sidebarWidth(layout);
  const gap = sidebarGap(layout);
  const offset = sidebarOffset(layout);

  return (
    <>
      <div
        testId="sidebar-gap"
        motion={{ initial: false, animate: { width: gap }, transition: timing }}
        style={{ flexShrink: 0, height: "100%" }}
      />
      <div
        {...rest}
        testId={rest.testId ?? "sidebar"}
        motion={{
          initial: false,
          animate:
            side === "left"
              ? { width, left: offset }
              : { width, right: offset },
          transition: timing,
        }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width,
          ...(side === "left" ? { left: offset } : { right: offset }),
          padding: variant === "sidebar" ? 0 : 8,

          ...(variant === "sidebar"
            ? {
                borderColor: theme.colors.border,
                ...(side === "left"
                  ? { borderRightWidth: 1 }
                  : { borderLeftWidth: 1 }),
              }
            : {}),
        }}
      >
        <div style={inner}>{children}</div>
      </div>
    </>
  );
};

const SidebarSheet = ({
  side,
  className,
  style,
  children,
}: {
  readonly side: SidebarSide;
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
}) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer ?? undefined;
  const { openMobile, setOpenMobile, mobileWidth } = useSidebar();
  const window = useWindowSize();
  const modal = useModalState({
    open: openMobile,
    onOpenChange: setOpenMobile,
  });
  const timing = useSurfaceTiming("normal");
  const presence = useSurfacePresence(openMobile, timing);
  const [content, setContent] = useState<PublicInstance | undefined>(undefined);
  const contentRef = useCallback((next: PublicInstance | null) => {
    setContent(next ?? undefined);
  }, []);
  const width = Math.min(mobileWidth, window.width);

  useModalFocus(content?.id, undefined, openMobile, modal.restoreTarget);

  if (!presence.mounted) return null;

  return (
    <anchored
      position={{ x: 0, y: 0 }}
      occlude
      style={{ position: "absolute" }}
    >
      <div
        testId="sidebar-scrim"
        motion={presenceMotion(fadeOnly, presence)}
        style={mergeStyles(recipeStyle(SIDEBAR_SCRIM, theme), {
          width: window.width,
          height: window.height,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          justifyContent: side === "left" ? "flex-start" : "flex-end",
          ...presenceStyle(presence.present),
        })}
      >
        <div
          onMouseDownOutside={(event) => dismissTopLayer(event)}
          onKeyDown={(event: KeyEvent) => {
            handleModalKeyDown({
              event,
              contentId: content?.id,
              renderer,
            });
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            width,
            height: window.height,
          }}
        >
          <div
            ref={contentRef}
            role="dialog"
            aria-label="Sidebar"
            tabIndex={-1}
            testId="sidebar-sheet"
            motion={presenceMotion(fadeFromSide(side, 12), presence)}
            style={mergeStyles(
              mergeStyles(recipeStyle(cn(SIDEBAR_SHEET, className), theme), {
                width,
                height: window.height,
                borderRightWidth: side === "left" ? 1 : 0,
                borderLeftWidth: side === "right" ? 1 : 0,
                borderColor: theme.colors.border,
              }),
              mergeStyles(style, presenceStyle(presence.present)),
            )}
          >
            <DismissScope>{children}</DismissScope>
          </div>
          <PresenceShield present={presence.present} />
        </div>
      </div>
    </anchored>
  );
};

export interface SidebarTriggerProps extends Omit<Props, "children"> {
  readonly size?: "sm" | "md" | "lg";
}

export const SidebarTrigger = ({
  size = "sm",
  testId = "sidebar-trigger",
  ...rest
}: SidebarTriggerProps) => {
  const theme = useTheme();
  const { toggleSidebar } = useSidebar();
  return (
    <IconButton
      {...rest}
      label="Toggle Sidebar"
      size={size}
      testId={testId}
      onClick={toggleSidebar}
    >
      <Icon name="panel-left" size="sm" color={theme.colors.foreground} />
    </IconButton>
  );
};

export interface SidebarRailProps extends Omit<Props, "children"> {
  readonly className?: string;
}

export const SidebarRail = ({
  className,
  style,
  onClick,
  onMouseDown,
  onMouseMove,
  ...rest
}: SidebarRailProps) => {
  const theme = useTheme();
  const { toggleSidebar, side, isMobile, collapsible, state } = useSidebar();
  const start = useRef<number | null>(null);
  const dragged = useRef(false);

  if (isMobile || collapsible === "none") return null;

  const collapsed = state === "collapsed";
  const cursor =
    side === "left"
      ? collapsed
        ? "e-resize"
        : "w-resize"
      : collapsed
        ? "w-resize"
        : "e-resize";

  return (
    <div
      {...rest}
      role="button"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event);
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        toggleSidebar();
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        start.current = event.x ?? null;
        dragged.current = false;
      }}
      onMouseMove={(event) => {
        onMouseMove?.(event);
        if (event.pressedButton !== 0 || start.current === null) return;
        const travel = (event.x ?? start.current) - start.current;
        if (Math.abs(travel) < 8 || dragged.current) return;
        dragged.current = true;
        toggleSidebar();
      }}
      testId={rest.testId ?? "sidebar-rail"}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 16,

          ...(side === "left" ? { right: 0 } : { left: 0 }),
          cursor,
          hover: { backgroundColor: theme.colors.hover },
        }),
        style,
      )}
    />
  );
};

export interface SidebarInsetProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarInset = ({
  className,
  style,
  children,
  ...rest
}: SidebarInsetProps) => {
  const theme = useTheme();
  const context = useSidebar();
  const box = context.isMobile
    ? { margin: 0, marginLeft: 0, marginRight: 0, radius: 0 }
    : sidebarInsetBox(layoutOf(context), context.side);

  return (
    <div
      role="main"
      {...rest}
      testId={rest.testId ?? "sidebar-inset"}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_INSET, className), theme), {
          margin: box.margin,
          marginLeft: box.marginLeft,
          marginRight: box.marginRight,
          borderRadius: box.radius,
          ...(box.radius === 0
            ? {}
            : { boxShadow: elevationShadow(theme, "sm") }),
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface SidebarHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarHeader = ({
  className,
  style,
  ...rest
}: SidebarHeaderProps) => {
  const theme = useTheme();
  const rail = useRailPadding();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_HEADER, className), theme), {
          flexShrink: 0,
          ...rail,
        }),
        style,
      )}
    />
  );
};

export interface SidebarFooterProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarFooter = ({
  className,
  style,
  ...rest
}: SidebarFooterProps) => {
  const theme = useTheme();
  const rail = useRailPadding();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_FOOTER, className), theme), {
          flexShrink: 0,
          ...rail,
        }),
        style,
      )}
    />
  );
};

export interface SidebarContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarContent = ({
  className,
  style,
  ...rest
}: SidebarContentProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_CONTENT, className), theme), {
          overflowY: "scroll",
          scrollbarColor: theme.colors.scrollbar,
        }),
        style,
      )}
    />
  );
};

export interface SidebarSeparatorProps extends Omit<Props, "children"> {
  readonly className?: string;
}

export const SidebarSeparator = ({
  className,
  style,
  ...rest
}: SidebarSeparatorProps) => {
  const theme = useTheme();
  return (
    <div
      role="separator"
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_SEPARATOR, className), theme), {
          flexShrink: 0,
        }),
        style,
      )}
    />
  );
};

export interface SidebarGroupProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarGroup = ({
  className,
  style,
  ...rest
}: SidebarGroupProps) => {
  const theme = useTheme();
  const rail = useRailPadding();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_GROUP, className), theme), rail),
        style,
      )}
    />
  );
};

export interface SidebarGroupLabelProps extends Omit<Props, "children"> {
  readonly className?: string;

  readonly children?: string;
}

export const SidebarGroupLabel = ({
  className,
  children,
  style,
  ...rest
}: SidebarGroupLabelProps) => {
  const theme = useTheme();
  const context = useSidebar();
  const icon = iconCollapsed(context);
  const timing = useMoveTiming("normal");

  return (
    <div
      {...rest}
      motion={{
        initial: false,
        animate: { height: icon ? 0 : 32, opacity: icon ? 0 : 1 },
        transition: timing,
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_GROUP_LABEL, className), theme), {
          height: 32,
          opacity: 1,
          flexShrink: 0,
        }),
        style,
      )}
    >
      <text
        style={mergeStyles(
          textStyle(theme, "caption"),
          recipeStyle(SIDEBAR_GROUP_LABEL_TEXT, theme),
        )}
      >
        {children}
      </text>
    </div>
  );
};

export interface SidebarGroupActionProps extends Omit<Props, "children"> {
  readonly label: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarGroupAction = ({
  label,
  className,
  style,
  children,
  ...rest
}: SidebarGroupActionProps) => {
  const theme = useTheme();
  const context = useSidebar();

  return (
    <Action
      {...rest}
      variant="ghost"
      size="sm"
      label={label}
      leading={children}
      className={cn(SIDEBAR_GROUP_ACTION, className)}
      style={mergeStyles(
        {
          position: "absolute",
          top: 14,
          right: 12,
          width: 20,
          height: 20,
          padding: 0,
          display: iconCollapsed(context) ? "none" : "flex",
          ...controlRing(theme),
        },
        style,
      )}
    />
  );
};

export interface SidebarGroupContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarGroupContent = ({
  className,
  style,
  ...rest
}: SidebarGroupContentProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SIDEBAR_GROUP_CONTENT, className), theme),
        style,
      )}
    />
  );
};

export interface SidebarMenuProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarMenu = ({
  className,
  style,
  ...rest
}: SidebarMenuProps) => {
  const theme = useTheme();
  return (
    <div
      role="list"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SIDEBAR_MENU, className), theme),
        style,
      )}
    />
  );
};

export interface SidebarMenuItemProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarMenuItem = ({
  className,
  style,
  ...rest
}: SidebarMenuItemProps) => {
  const theme = useTheme();
  return (
    <div
      role="listitem"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SIDEBAR_MENU_ITEM, className), theme),
        style,
      )}
    />
  );
};

export type SidebarMenuButtonSize = keyof typeof SIDEBAR_MENU_BUTTON_SIZES;

export interface SidebarMenuButtonProps extends Omit<Props, "children"> {
  readonly isActive?: boolean;

  readonly variant?: "default" | "outline";

  readonly size?: SidebarMenuButtonSize;

  readonly tooltip?: string;

  readonly label?: string;

  readonly children?: ReactNode;

  readonly trailing?: ReactNode;
  readonly disabled?: boolean;
  readonly className?: string;

  readonly onClick?: (event: EventPayload) => void;
}

export const SidebarMenuButton = ({
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  label,
  trailing,
  disabled = false,
  className,
  style,
  children,
  onClick,
  testId,
  ...rest
}: SidebarMenuButtonProps) => {
  const theme = useTheme();
  const context = useSidebar();
  const icon = iconCollapsed(context);
  const tip = tooltip?.trim();
  const tipReady = tip !== undefined && tip !== "" && icon && !context.isMobile;
  const shown = tipReady && tooltipShown(context.tooltip, tip);

  const button = (
    <Action
      {...rest}
      variant={variant === "outline" ? "outline" : "ghost"}
      size={size === "sm" ? "sm" : "md"}
      label={label}
      disabled={disabled}
      testId={testId}
      aria-selected={isActive}
      aria-description={tooltip}
      onActivate={onClick}
      leading={children}
      trailing={trailing}
      className={cn(
        SIDEBAR_MENU_BUTTON,
        SIDEBAR_MENU_BUTTON_SIZES[size],
        variant === "outline" ? "bg-background" : "",
        className,
      )}
      style={mergeStyles(
        {
          flexShrink: 0,
          backgroundColor: isActive ? theme.colors.accent : undefined,
          color: isActive
            ? theme.colors.accentForeground
            : theme.colors.cardForeground,
          ...(icon
            ? {
                width: SIDEBAR_ICON_ROW,
                height: SIDEBAR_ICON_ROW,
                padding: 8,
                justifyContent: "center",
              }
            : {}),
          ...disabledFade(disabled),
          hover: disabled
            ? undefined
            : {
                backgroundColor: isActive
                  ? theme.colors.selected
                  : theme.colors.hover,
              },
          active: disabled
            ? undefined
            : {
                backgroundColor: pressWash(
                  theme,
                  isActive ? "accent" : "hover",
                ),
              },
        },
        style,
      )}
    >
      {}
      {label === undefined || icon ? null : (
        <text
          style={mergeStyles(recipeStyle(SIDEBAR_MENU_LABEL, theme), {
            color: isActive
              ? theme.colors.accentForeground
              : theme.colors.cardForeground,
          })}
        >
          {label}
        </text>
      )}
    </Action>
  );

  return (
    <Tooltip
      open={shown}
      onOpenChange={(next) => {
        if (!tipReady) return;
        if (next) context.showTooltip(tip);
        else context.hideTooltip();
      }}
    >
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      {shown ? (
        <TooltipContent
          side="right"
          align="start"
          sideOffset={6 + (context.iconWidth - 32) / 2}
          testId={testId === undefined ? undefined : `${testId}-tip`}
          style={recipeStyle(SIDEBAR_TOOLTIP, theme)}
        >
          <text
            style={mergeStyles(
              textStyle(theme, "caption"),
              recipeStyle(SIDEBAR_TOOLTIP_TEXT, theme),
            )}
          >
            {tip}
          </text>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
};

export interface SidebarMenuActionProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly showOnHover?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarMenuAction = ({
  label,
  showOnHover = false,
  className,
  style,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: SidebarMenuActionProps) => {
  const theme = useTheme();
  const context = useSidebar();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Action
      {...rest}
      variant="ghost"
      size="sm"
      label={label}
      leading={children}
      className={cn(SIDEBAR_MENU_ACTION, className)}
      onMouseEnter={(event) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          position: "absolute",
          right: 4,
          top: 6,
          width: 20,
          height: 20,
          padding: 0,
          display: iconCollapsed(context) ? "none" : "flex",
          opacity: showOnHover && !hovered && !focused ? 0 : 1,
          ...controlRing(theme),
        },
        style,
      )}
    />
  );
};

export interface SidebarMenuBadgeProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: string;
}

export const SidebarMenuBadge = ({
  className,
  style,
  children,
  ...rest
}: SidebarMenuBadgeProps) => {
  const theme = useTheme();
  const context = useSidebar();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_MENU_BADGE, className), theme), {
          position: "absolute",
          right: 4,
          top: 6,
          display: iconCollapsed(context) ? "none" : "flex",
          pointerEvents: "none",
        }),
        style,
      )}
    >
      <text
        style={mergeStyles(textStyle(theme, "caption"), {
          color: theme.colors.mutedForeground,
        })}
      >
        {children}
      </text>
    </div>
  );
};

export interface SidebarMenuSkeletonProps extends Omit<Props, "children"> {
  readonly showIcon?: boolean;
  readonly className?: string;
}

export const SidebarMenuSkeleton = ({
  showIcon = false,
  className,
  style,
  ...rest
}: SidebarMenuSkeletonProps) => {
  const theme = useTheme();
  const id = useId();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SIDEBAR_MENU_SKELETON, className), theme),
        style,
      )}
    >
      {showIcon ? (
        <div style={recipeStyle(SIDEBAR_MENU_SKELETON_ICON, theme)} />
      ) : null}
      <div
        style={mergeStyles(recipeStyle(SIDEBAR_MENU_SKELETON_TEXT, theme), {
          maxWidth: skeletonWidth(id),
        })}
      />
    </div>
  );
};

export interface SidebarMenuSubProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarMenuSub = ({
  className,
  style,
  ...rest
}: SidebarMenuSubProps) => {
  const theme = useTheme();
  const context = useSidebar();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SIDEBAR_MENU_SUB, className), theme), {
          marginLeft: 14,
          paddingLeft: 10,
          borderLeftWidth: 1,
          borderColor: theme.colors.border,
          display: iconCollapsed(context) ? "none" : "flex",
        }),
        style,
      )}
    />
  );
};

export interface SidebarMenuSubItemProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SidebarMenuSubItem = ({
  className,
  style,
  ...rest
}: SidebarMenuSubItemProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SIDEBAR_MENU_SUB_ITEM, className), theme),
        style,
      )}
    />
  );
};

export interface SidebarMenuSubButtonProps extends Omit<Props, "children"> {
  readonly isActive?: boolean;

  readonly size?: "sm" | "md";

  readonly label?: string;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly disabled?: boolean;

  readonly onClick?: (event: EventPayload) => void;
}

export const SidebarMenuSubButton = ({
  isActive = false,
  size = "md",
  label,
  className,
  style,
  children,
  disabled = false,
  onClick,
  ...rest
}: SidebarMenuSubButtonProps) => {
  const theme = useTheme();
  const context = useSidebar();

  return (
    <Action
      {...rest}
      variant="ghost"
      size="sm"
      label={label}
      disabled={disabled}
      aria-selected={isActive}
      onActivate={onClick}
      leading={children}
      className={cn(
        SIDEBAR_MENU_SUB_BUTTON,
        size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
        className,
      )}
      style={mergeStyles(
        {
          backgroundColor: isActive ? theme.colors.accent : undefined,
          color: isActive
            ? theme.colors.accentForeground
            : theme.colors.mutedForeground,
          display: iconCollapsed(context) ? "none" : "flex",
          ...disabledFade(disabled),
          hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
          active: disabled
            ? undefined
            : { backgroundColor: pressWash(theme, "hover") },
        },
        style,
      )}
    >
      {label === undefined ? null : (
        <text
          style={mergeStyles(recipeStyle(SIDEBAR_MENU_LABEL, theme), {
            color: isActive
              ? theme.colors.accentForeground
              : theme.colors.mutedForeground,
          })}
        >
          {label}
        </text>
      )}
    </Action>
  );
};

export interface SidebarInputProps {
  readonly value?: string;
  readonly placeholder?: string;

  readonly readOnly?: boolean;

  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StyleDesc;

  readonly testId?: string;

  readonly onChange?: (event: EventPayload) => void;
}

export const SidebarInput = ({
  className,
  style,
  ...rest
}: SidebarInputProps) => {
  const theme = useTheme();
  return (
    <FieldInput
      {...rest}
      className={cn(SIDEBAR_INPUT, className)}
      style={mergeStyles(
        {
          height: controlHeight(theme, "sm"),
          backgroundColor: theme.colors.background,
        },
        style,
      )}
    />
  );
};

export const sidebarMeta = {
  name: "Sidebar",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no transform in 0.11.0: the offcanvas panel animates left/right and width, and the mobile sheet fades and travels 12px from its edge rather than sliding its full width",
    "the ⌘/Ctrl+B shortcut runs on the provider's wrapper: 0.11.0 accepts a window-level key handler only at render(), so a key typed while focus is outside the provider subtree is not seen",
    "no cookie jar: the default preference is an in-process sidebar_state jar with shadcn's seven-day lifetime; pass `preference` for durability across launches",
    "the provider owns side/variant/collapsible because SidebarInset is a sibling of Sidebar and the renderer has no parent selector; Sidebar accepts the same props as overrides",
    "icon-mode labels are clipped rather than truncated by a CSS descendant selector; the menu button owns its label text",
    "the rail toggles on a press and on an 8px drag inside the panel's own edge; there is no resize gesture because the runtime has no pointer capture, and an offcanvas panel parked outside the window is reopened by the trigger or ⌘/Ctrl+B because a strip outside the panel would paint under the inset",
    "a rail strip outside the panel would be covered by the inset: paint order is tree order and 0.11.0 has no zIndex",
  ],
  docs: "docs/sidebar.mdx",
  example: "examples/sidebar.example.tsx",
  testFile: "src/behaviour/sidebar.test.tsx",
} as const;
