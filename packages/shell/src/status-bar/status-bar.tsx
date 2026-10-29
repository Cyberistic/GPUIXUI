/**
 * StatusBar: the bottom strip of the application chrome.
 *
 * A `role="status"` bar with three regions — a left group, a centre and a
 * right group — hairline separators between the items of each group, a tone
 * per item, truncation on every label, and the mono type scale a status
 * readout wears. It is the gpui-kit anatomy: the left and right groups pin to
 * the bar's edges and the centre follows them, centred when both are present
 * and end-aligned when only the left is.
 *
 * The runtime reserves no titlebar, so the chrome is the app's to paint and this
 * bar owns its row.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { Fragment } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import {
  centerAlignment,
  toneForeground,
  type StatusBarTone,
} from "./logic.js";

const STATUS_BAR =
  "flex flex-row items-center gap-2 border-t border-border bg-muted px-3 py-1";
const STATUS_ITEM = "text-xs font-mono";
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
  /** The items between the pinned groups; their alignment follows them. */
  readonly center?: ReadonlyArray<StatusBarItem>;
  /** The items pinned to the trailing edge. */
  readonly right?: ReadonlyArray<StatusBarItem>;
  readonly className?: string;
}

/** The bottom status bar. */
export const StatusBar = ({
  label,
  left,
  center,
  right,
  className,
  style,
  ...rest
}: StatusBarProps) => {
  const theme = useTheme();
  const leading = left ?? [];
  const middle = center ?? [];
  const trailing = right ?? [];

  const renderGroup = (items: ReadonlyArray<StatusBarItem>) =>
    Arr.map(items, (item, index) => (
      <Fragment key={item.id}>
        {index === 0 ? null : (
          <div
            style={mergeStyles(recipeStyle(STATUS_SEPARATOR, theme), {
              flexShrink: 0,
            })}
          />
        )}
        <text
          style={mergeStyles(recipeStyle(STATUS_ITEM, theme), {
            color: toneForeground(theme, item.tone ?? "default"),
            ...truncate,
          })}
        >
          {item.label}
        </text>
      </Fragment>
    ));

  const group = (items: ReadonlyArray<StatusBarItem>) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        minWidth: 0,
        flexShrink: 1,
      }}
    >
      {renderGroup(items)}
    </div>
  );

  return (
    <div
      role="status"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(recipeStyle(cn(STATUS_BAR, className), theme), style)}
    >
      {group(leading)}
      <div
        style={{
          flexGrow: 1,
          flexBasis: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: centerAlignment(
            Arr.length(leading),
            Arr.length(trailing),
          ),
          minWidth: 0,
        }}
      >
        {renderGroup(middle)}
      </div>
      {group(trailing)}
    </div>
  );
};
