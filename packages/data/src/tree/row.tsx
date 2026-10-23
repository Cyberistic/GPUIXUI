/**
 * One painted tree row, shared by the plain and the windowed tree.
 *
 * The rules are the ones the window probes measured, and both trees must paint
 * them identically:
 *
 * - a nested row insets by **16px** per level (`virtual-tree-lifecycle`);
 * - the chevron slot is `pointerEvents` free and the glyph is an `<svg>` that
 *   paints, so the glyph declares `pointerEvents: "none"` and the press reaches
 *   the row (`press-routing-lifecycle`);
 * - the active row paints the `selected` fill and the `selectedForeground`
 *   label, and the pointer's hover is the runtime's native refinement;
 * - a press is a **derived** wash one step past the hover it replaces, the
 *   tokens contract's third pointer transition (`active` over `hover` for an
 *   unchosen row, over `accent` for the chosen one), because a palette's raw
 *   `active` role can sit under the perceptibility floor beside the wash it
 *   lands on. A row that painted its press like its hover answered half the
 *   pointer — the defect the table's own row closed.
 *
 * A row is presentational: the cursor, the tab stop and the key contract belong
 * to the tree that composes it (`tree/tree-view` for the flat tree,
 * `virtual/tree` for the windowed one).
 */

import type { EventPayload, PublicInstance } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { pointerWash, textStyle, useTheme } from "../theme.js";
import { TREE_INDENT, type TreeRow } from "./logic.js";
import { TREE_CHEVRON, TREE_ROW, TREE_ROW_ACTIVE } from "./recipe.js";

/** The left inset the first level takes, in pixels. */
export const TREE_INSET = 8;

/** {@link TreeRowView} props. */
export interface TreeRowViewProps<T> {
  readonly row: TreeRow<T>;
  /** The row's accessible name. */
  readonly label: string;
  /** The cursor stands on this row: the selection pair and the tab stop. */
  readonly active: boolean;
  /** This row is the tree's one tab stop. */
  readonly tabbable: boolean;
  /** Paint the row's content after the inset and the chevron. Defaults to `label`. */
  readonly renderRow?: (row: TreeRow<T>) => ReactNode;
  /** A row height that differs from the density's `rowHeight`. */
  readonly height?: number;
  /** The row's test id. The chevron slot is `${testId}-slot`. */
  readonly testId?: string;
  readonly onPress: () => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly attach: (instance: PublicInstance | null) => void;
}

/** The default content: the label in the row's own ink. */
const Label = ({ active, label }: { active: boolean; label: string }) => {
  const theme = useTheme();
  return (
    <text
      style={{
        ...textStyle(theme, "body"),
        color: active
          ? theme.colors.selectedForeground
          : theme.colors.foreground,
      }}
    >
      {label}
    </text>
  );
};

/** One tree row: the inset, the chevron slot, the caller's content. */
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
  const hoverFill = active ? theme.colors.accent : theme.colors.hover;
  const pressFill =
    (active
      ? pointerWash(theme, "active", "accent")
      : pointerWash(theme, "active", "hover")) ?? theme.colors.active;
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
        height: height ?? theme.density.rowHeight,
        paddingLeft: TREE_INSET + row.depth * TREE_INDENT,
        // The recipe's own `hover` record is replaced by a style's, so the wash
        // is restated here beside the press it derives.
        hover: { backgroundColor: hoverFill },
        active: { backgroundColor: pressFill },
      }}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-slot`}
        style={{
          ...recipeStyle(TREE_CHEVRON, theme),
          width: theme.iconSize.md,
          height: theme.iconSize.md,
          // The slot is the chevron's box: a leaf keeps it blank so its label
          // lines up with a branch's.
        }}
      >
        {row.hasChildren ? (
          <Icon
            name={row.expanded ? "chevron-down" : "chevron-right"}
            size="md"
            color={
              active
                ? theme.colors.selectedForeground
                : theme.colors.mutedForeground
            }
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
