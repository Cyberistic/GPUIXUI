/** @jsxImportSource @gpuix/react */
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import {
  iconSideOf,
  rowHeightOf,
  type DensitySource,
} from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { pointerWash, textStyle, themeColors, useTheme } from "../theme.js";
import { TREE_INDENT, type TreeRow } from "./logic.js";
import { TREE_CHEVRON, TREE_ROW, TREE_ROW_ACTIVE } from "./recipe.js";

export const TREE_INSET = 8;

export const treeRowHeight = (
  height: number | undefined,
  theme: DensitySource,
): number => height ?? rowHeightOf(theme);

export interface TreeRowViewProps<T> {
  readonly row: TreeRow<T>;

  readonly label: string;

  readonly active: boolean;

  readonly tabbable: boolean;

  readonly renderRow?: (row: TreeRow<T>) => ReactNode;

  readonly height?: number;

  readonly testId?: string;
  readonly onPress: () => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly attach: (instance: PublicInstance | null) => void;
}

const Label = ({ active, label }: { active: boolean; label: string }) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  return (
    <text
      style={{
        ...textStyle(theme, "body"),
        color: active ? colors.selectedForeground : colors.foreground,
      }}
    >
      {label}
    </text>
  );
};

export const TreeRowView = <T,>({
  row,
  label,
  active,
  tabbable,
  renderRow,
  height,
  testId,
  onPress,
  onKeyDown,
  attach,
}: TreeRowViewProps<T>) => {
  const theme = useTheme();
  const colors = themeColors(theme);

  const chevron = active ? colors.selectedForeground : colors.mutedForeground;
  const hoverFill = active ? colors.accent : colors.hover;
  const pressFill =
    (active
      ? pointerWash(theme, "active", "accent")
      : pointerWash(theme, "active", "hover")) ?? colors.active;
  return (
    <div
      ref={attach}
      role="treeitem"
      aria-label={label}
      aria-level={row.depth + 1}
      aria-selected={active}
      {...(row.hasChildren ? { "aria-expanded": row.expanded } : {})}
      tabIndex={tabbable ? 0 : -1}
      testId={testId}
      onClick={onPress}
      onKeyDown={onKeyDown}
      style={{
        ...recipeStyle(cn(active ? TREE_ROW_ACTIVE : TREE_ROW), theme),
        height: treeRowHeight(height, theme),
        paddingLeft: TREE_INSET + row.depth * TREE_INDENT,

        hover: { backgroundColor: hoverFill },
        active: { backgroundColor: pressFill },
      }}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-slot`}
        style={{
          ...recipeStyle(TREE_CHEVRON, theme),
          width: iconSideOf(theme, "md"),
          height: iconSideOf(theme, "md"),
        }}
      >
        {row.hasChildren && chevron !== undefined ? (
          <Icon
            name={row.expanded ? "chevron-down" : "chevron-right"}
            size="md"
            color={chevron}
          />
        ) : undefined}
      </div>
      {renderRow === undefined ? (
        <Label active={active} label={label} />
      ) : (
        renderRow(row)
      )}
    </div>
  );
};
