/** @jsxImportSource @gpuix/react */
import { isTerminal, type Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Divider, dragSize, resizeByKey, sizeBounds } from "@gpuixui/dock";
import { ToolbarScope } from "@gpuixui/primitives";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  currentPlatform,
  materialFill,
  textStyle,
  useTheme,
} from "../theme.js";
import type { PlatformName } from "../theme.js";
import {
  hasTrafficLights,
  TOOLBAR_HEIGHT,
  toolbarInset,
  type ToolbarStyle,
} from "./logic.js";

interface WindowChrome {
  readonly toolbar: ToolbarStyle;
  readonly lightsOverToolbar: boolean;
}

const WindowContext = createContext<WindowChrome>({
  toolbar: "unified",
  lightsOverToolbar: false,
});

export interface WindowProps extends Omit<Props, "children"> {
  readonly sidebar?: ReactNode;

  readonly sidebarWidth?: number;

  readonly sidebarMinWidth?: number;

  readonly sidebarMaxWidth?: number;

  readonly onSidebarWidthChange?: (width: number) => void;

  readonly toolbar?: ReactNode;

  readonly toolbarStyle?: ToolbarStyle;

  readonly inspector?: ReactNode;

  readonly inspectorWidth?: number;

  readonly platform?: PlatformName;

  readonly children?: ReactNode;
}

export const Window = ({
  sidebar,
  sidebarWidth = 220,
  sidebarMinWidth = 180,
  sidebarMaxWidth = 360,
  onSidebarWidthChange,
  toolbar,
  toolbarStyle = "unified",
  inspector,
  inspectorWidth = 260,
  platform = currentPlatform,
  children,
  style,
  ...rest
}: WindowProps) => {
  const theme = useTheme();
  const lights = hasTrafficLights(platform, isTerminal());
  const height = TOOLBAR_HEIGHT[toolbarStyle];
  const hairline = theme.borderWidth.thin;
  const bounds = sizeBounds(sidebarMinWidth, sidebarMaxWidth);
  const [width, setWidth] = useState(sidebarWidth);
  const dragStart = useRef(width);
  const resize = (next: number): void => {
    setWidth(next);
    onSidebarWidthChange?.(next);
  };

  return (
    <WindowContext.Provider
      value={{
        toolbar: toolbarStyle,
        lightsOverToolbar: lights && sidebar === undefined,
      }}
    >
      <div
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            minHeight: 0,

            ...(theme.window === "blurred"
              ? {}
              : { backgroundColor: theme.colors.background }),
          },
          style,
        )}
      >
        {sidebar === undefined ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              width,
              flexShrink: 0,
              minHeight: 0,
              paddingTop: height,
              backgroundColor: materialFill(theme, "sidebar"),
              borderRightWidth: hairline,
              borderColor: theme.colors.border,
            }}
          >
            {sidebar}
            {bounds.min === bounds.max ? null : (
              <Divider
                seam
                orientation="horizontal"
                label="Sidebar width"
                valueText={`${Math.round(width)} px`}
                testId="window-sidebar-divider"
                onDragStart={() => {
                  dragStart.current = width;
                }}
                onDragDelta={(delta) =>
                  resize(dragSize(dragStart.current, delta, bounds))
                }
                onKey={(key) => resize(resizeByKey(width, key, bounds))}
              />
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            flexBasis: 0,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {toolbar}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexGrow: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                backgroundColor: theme.colors.background,
              }}
            >
              {children}
            </div>
            {inspector === undefined ? null : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: inspectorWidth,
                  flexShrink: 0,
                  minHeight: 0,
                  overflow: "hidden",
                  backgroundColor: theme.colors.background,
                  borderLeftWidth: hairline,
                  borderColor: theme.colors.border,
                }}
              >
                {inspector}
              </div>
            )}
          </div>
        </div>
      </div>
    </WindowContext.Provider>
  );
};

export interface WindowToolbarProps extends Omit<Props, "children"> {
  readonly title?: string;

  readonly leading?: ReactNode;

  readonly actions?: ReactNode;
}

export const WindowToolbar = ({
  title,
  leading,
  actions,
  style,
  ...rest
}: WindowToolbarProps) => {
  const theme = useTheme();
  const chrome = useContext(WindowContext);

  return (
    <div
      {...(title === undefined ? {} : { "aria-label": title })}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
          gap: theme.spacing.sm,
          height: TOOLBAR_HEIGHT[chrome.toolbar],
          paddingLeft: toolbarInset(chrome.lightsOverToolbar),
          paddingRight: 12,
          backgroundColor: materialFill(theme, "titlebar"),
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        },
        style,
      )}
    >
      <ToolbarScope.Provider value>{leading}</ToolbarScope.Provider>
      {title === undefined ? null : (
        <text
          style={{
            ...textStyle(theme, "body"),
            fontWeight: 600,
            color: theme.colors.foreground,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </text>
      )}
      <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />
      <ToolbarScope.Provider value>{actions}</ToolbarScope.Provider>
    </div>
  );
};
