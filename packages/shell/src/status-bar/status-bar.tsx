/**
 * StatusBar: the bottom strip of the application chrome.
 *
 * A `role="status"` bar with a left and a right group of items, a `tone` per
 * item, hairline separators and text truncation. It is a row like any other
 * (`COMPONENTS.md`, "Status bars"): the runtime reserves no titlebar, so the
 * chrome is the app's to paint and this bar owns its row.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { Fragment } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { toneForeground, type StatusBarTone } from "./logic.js";

const STATUS_BAR =
  "flex flex-row items-center gap-2 rounded-md border border-input bg-muted px-2 py-1";
const STATUS_ITEM = "text-xs font-sans";
const STATUS_SEPARATOR = "h-3 w-px bg-border";

/** The truncation every item shares: shrink to fit and ellipsize the tail. */
const truncate = {
  minWidth: 0,
  flexShrink: 1,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
} as const;

/** One item in a status bar group. */
export interface StatusBarItem {
  readonly id: string;
  readonly label: string;
  /** The item's colour tone; `default` keeps the bar's foreground. */
  readonly tone?: StatusBarTone;
}

/** {@link StatusBar} props. */
export interface StatusBarProps extends Omit<Props, "children"> {
  /** The bar's accessible name. */
  readonly label?: string;
  /** The items pinned to the leading edge. */
  readonly left?: ReadonlyArray<StatusBarItem>;
  /** The items pinned to the trailing edge. */
  readonly right?: ReadonlyArray<StatusBarItem>;
  readonly className?: string;
}

/** The bottom status bar. */
export const StatusBar = ({
  label,
  left,
  right,
  className,
  style,
  ...rest
}: StatusBarProps) => {
  const theme = useTheme();

  const renderGroup = (items: ReadonlyArray<StatusBarItem>) =>
    Arr.map(items, (item, index) => (
      <Fragment key={item.id}>
        {index === 0 ? null : (
          <div style={recipeStyle(STATUS_SEPARATOR, theme)} />
        )}
        <text
          style={{
            ...recipeStyle(STATUS_ITEM, theme),
            color: toneForeground(theme, item.tone ?? "default"),
            ...truncate,
          }}
        >
          {item.label}
        </text>
      </Fragment>
    ));

  return (
    <div
      role="status"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(recipeStyle(cn(STATUS_BAR, className), theme), style)}
    >
      {renderGroup(left ?? [])}
      <div style={{ flexGrow: 1, flexBasis: 0 }} />
      {renderGroup(right ?? [])}
    </div>
  );
};
