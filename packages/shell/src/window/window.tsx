/**
 * Window: the anatomy every native block wears.
 *
 * A Mac window is a sidebar that runs edge to edge under the traffic lights, a
 * unified toolbar over the content column, opaque content and an optional
 * inspector. The sidebar and toolbar paint their materials (`materialFill`), so
 * a vibrant window shows the desktop through them; the content never does.
 *
 * The parts are slots rather than children so the window knows where the lights
 * float: over the sidebar when there is one, otherwise over the toolbar, which
 * then leaves them their box. The sidebar resizes from its trailing hairline
 * as AppKit's does: the dock's `Divider` floats over the seam, so a drag or the
 * arrows move it between its bounds and nothing new paints.
 *
 * Open it with {@link nativeWindowOptions}: the runtime reserves no titlebar
 * (`docs/gpuix-capabilities.md` §Window chrome), so without a transparent
 * titlebar the OS bar paints above this one.
 */

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

/** {@link Window} props. */
export interface WindowProps extends Omit<Props, "children"> {
  /** The source list, or any sidebar; it runs under the traffic lights. */
  readonly sidebar?: ReactNode;
  /** The sidebar's starting width. Defaults to AppKit's 220. */
  readonly sidebarWidth?: number;
  /** The narrowest the sidebar drags to. Defaults to 180. */
  readonly sidebarMinWidth?: number;
  /** The widest the sidebar drags to. Defaults to 360; equal bounds fix it. */
  readonly sidebarMaxWidth?: number;
  /** Reports the sidebar's width after a drag step or a key, to persist it. */
  readonly onSidebarWidthChange?: (width: number) => void;
  /** The toolbar row, usually a {@link WindowToolbar}. */
  readonly toolbar?: ReactNode;
  /** The toolbar's height step. Defaults to the unified 52-point bar. */
  readonly toolbarStyle?: ToolbarStyle;
  /** The trailing inspector pane. */
  readonly inspector?: ReactNode;
  /** The inspector's width. Defaults to 260. */
  readonly inspectorWidth?: number;
  /** The platform whose chrome the window wears. Defaults to the host's. */
  readonly platform?: PlatformName;
  /** The content column. */
  readonly children?: ReactNode;
}

/** The native window. */
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
            // A vibrant window leaves its frame to the desktop; every pane paints
            // its own fill over it.
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

/** {@link WindowToolbar} props. */
export interface WindowToolbarProps extends Omit<Props, "children"> {
  /** The window title, leading-aligned as AppKit's unified toolbar draws it. */
  readonly title?: string;
  /** Content before the title: back/forward, a sidebar toggle. */
  readonly leading?: ReactNode;
  /** Content after the flexible space: a segmented control, search, actions. */
  readonly actions?: ReactNode;
}

/** The unified toolbar over the content column. */
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
