/**
 * TitleBar: the strip the app paints under the traffic lights.
 *
 * A window opened with `titlebarTransparent` has no titlebar of its own, so the
 * app owns that row: the lights float over it (positioned by `trafficLightX` /
 * `trafficLightY`), and this bar leaves them their box, centres the window's
 * title, and hosts the actions a titlebar carries. It paints with the theme's
 * own roles, so it repaints with the look switch like every other surface.
 *
 * This is the one piece of window chrome that has to exist in the app: the
 * runtime reserves no titlebar (measured in `window-chrome`), and a window that
 * shows the system one cannot draw a unified bar under it.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { titleBarPadding, type TitleBarDensity } from "./logic.js";

const TITLE_BAR =
  "flex flex-row items-center gap-2 border-b border-border bg-muted";
const TITLE_TEXT = "text-sm font-medium";

/** {@link TitleBar} props. */
export interface TitleBarProps extends Omit<Props, "children"> {
  /** The window title; omitted leaves the strip empty for the caller's own. */
  readonly title?: string;
  /**
   * Whether the window's own traffic lights float over this bar. `native` (the
   * default) reserves their box; `none` is a window that keeps the system
   * titlebar, or a platform without one.
   */
  readonly controls?: "native" | "none";
  /** The bar's height step. Defaults to the comfortable 38-point bar. */
  readonly density?: TitleBarDensity;
  /** The leading content, after the lights (a back chevron, a sidebar toggle). */
  readonly leading?: ReactNode;
  /** The trailing content (window actions, a search field). */
  readonly actions?: ReactNode;
  readonly className?: string;
}

/** The window's own title bar. */
export const TitleBar = ({
  title,
  controls = "native",
  density = "comfortable",
  leading,
  actions,
  className,
  style,
  ...rest
}: TitleBarProps) => {
  const theme = useTheme();
  const padding = titleBarPadding(controls, density);

  return (
    <div
      {...(title === undefined ? {} : { "aria-label": title })}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(TITLE_BAR, className), theme),
        mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 0,
            gap: theme.spacing.sm,
            paddingLeft: padding.paddingLeft,
            paddingRight: padding.paddingRight,
            height: padding.height,
          },
          style,
        ),
      )}
    >
      {leading}
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          flexBasis: 0,
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        {title === undefined ? null : (
          <text
            style={mergeStyles(recipeStyle(TITLE_TEXT, theme), {
              color: theme.colors.foreground,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            })}
          >
            {title}
          </text>
        )}
      </div>
      {actions}
    </div>
  );
};
