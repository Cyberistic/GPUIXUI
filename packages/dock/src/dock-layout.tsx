/**
 * `DockLayout` — a named tree of split and tab groups, rendered from a schema.
 *
 * The tree is {@link DockNode}: a `split` (two dock nodes sharing an axis) or a
 * `tabs` group (an ordered tab list and its active tab). It round-trips through
 * {@link DockNodeJson} at the app's persistence boundary, so a workspace is
 * restored by decoding one string and re-mounting the tree — the contract
 * `workspace-restore` measured, where a decode failure opens the default and a
 * restored size is clamped once.
 *
 * Rendering is recursive and state is the tree's: a tab press rewrites that
 * group's `activeTab` and a divider drag rewrites its split's `size`, both
 * reported through `onLayoutChange` as a new tree. The divider is the same
 * {@link Divider} a `SplitPane` uses, so the resize interaction is one control
 * across the whole package.
 */

import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn, TABS_LIST, TABS_TRIGGER } from "@gpuixui/tw";
import { Divider } from "./divider.js";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  resizeSplit,
  resizeSplitByKey,
  setActiveTab,
  type DockNode,
  type DockSplit,
  type DockTabs,
} from "./logic.js";
import { DOCK_PANE, DOCK_ROOT, mergeStyle, recipeStyle } from "./recipe.js";
import { textStyle, useTheme } from "./theme.js";

export interface DockLayoutProps {
  /** The tree to render. Controlled. */
  readonly layout: DockNode;
  /** Reports the next tree after a tab switch or a resize. */
  readonly onLayoutChange?: (layout: DockNode) => void;
  /** Renders one tab's content by its id. */
  readonly renderTab: (id: string) => ReactNode;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
}

interface NodeViewProps {
  readonly node: DockNode;
  readonly onLayoutChange?: (layout: DockNode) => void;
  readonly renderTab: (id: string) => ReactNode;
  readonly testId?: string;
}

/** A tab strip and the active tab's panel. */
const DockTabsView = ({
  node,
  onLayoutChange,
  renderTab,
  testId,
}: {
  readonly node: DockTabs;
  readonly onLayoutChange?: (layout: DockNode) => void;
  readonly renderTab: (id: string) => ReactNode;
  readonly testId?: string;
}): ReactElement => {
  const theme = useTheme();
  const strip = recipeStyle(TABS_LIST, theme);
  const panel = mergeStyle(recipeStyle(DOCK_PANE, theme), {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });

  return (
    <div
      testId={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div style={strip}>
        {node.tabs.map((tab) => {
          const active = tab.id === node.activeTab;
          const trigger = recipeStyle(
            cn(TABS_TRIGGER, active && "bg-selected text-selected-foreground"),
            theme,
          );
          const inactive: StyleDesc = active
            ? {}
            : {
                color: theme.colors.mutedForeground,
                hover: { backgroundColor: theme.colors.hover },
                cursor: "pointer",
              };
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              testId={
                testId === undefined ? undefined : `${testId}-tab-${tab.id}`
              }
              onClick={() =>
                onLayoutChange?.(setActiveTab(node, node.id, tab.id))
              }
              style={mergeStyle(trigger, inactive)}
            >
              <text
                style={{
                  ...textStyle(theme, "label"),
                  color: active
                    ? theme.colors.selectedForeground
                    : theme.colors.mutedForeground,
                }}
              >
                {tab.label}
              </text>
            </div>
          );
        })}
      </div>
      <div style={panel}>{renderTab(node.activeTab)}</div>
    </div>
  );
};

/** A split: two dock nodes and the divider that resizes them. */
const DockSplitView = ({
  node,
  onLayoutChange,
  renderTab,
  testId,
}: {
  readonly node: DockSplit;
  readonly onLayoutChange?: (layout: DockNode) => void;
  readonly renderTab: (id: string) => ReactNode;
  readonly testId?: string;
}): ReactElement => {
  const theme = useTheme();
  const orientation = node.orientation;
  const [total, setTotal] = useState(0);
  const dragStart = useRef<number | null>(null);
  const available = total - DIVIDER_WIDTH;

  const root = mergeStyle(recipeStyle(DOCK_ROOT, theme), {
    flexDirection: orientation === "horizontal" ? "row" : "column",
    alignItems: "stretch",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });

  const child: StyleDesc = {
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
  };

  const first = mergeStyle(child, {
    flexGrow: node.size,
    flexShrink: 1,
    flexBasis: 0,
  });
  const second = mergeStyle(child, {
    flexGrow: 1 - node.size,
    flexShrink: 1,
    flexBasis: 0,
  });

  const onLayout = (event: EventPayload): void => {
    const next =
      orientation === "horizontal" ? (event.width ?? 0) : (event.height ?? 0);
    setTotal((previous) => (previous === next ? previous : next));
  };

  return (
    <div testId={testId} style={root} onLayout={onLayout}>
      <div style={first}>
        <DockNodeView
          node={node.first}
          onLayoutChange={onLayoutChange}
          renderTab={renderTab}
        />
      </div>
      <Divider
        orientation={orientation}
        valueText={`${Math.round(node.size * 100)}%`}
        label="Resize panes"
        testId={testId === undefined ? undefined : `${testId}-divider`}
        onDragStart={() => {
          dragStart.current = node.size;
        }}
        onDragDelta={(delta) => {
          const start = dragStart.current;
          if (start === null || available <= 0) return;
          onLayoutChange?.({
            ...node,
            size: resizeSplit(start, delta / available),
          });
        }}
        onDragEnd={() => {
          dragStart.current = null;
        }}
        onKey={(key) => {
          if (available <= 0) return;
          onLayoutChange?.({
            ...node,
            size: resizeSplitByKey(node.size, key, DIVIDER_STEP / available),
          });
        }}
      />
      <div style={second}>
        <DockNodeView
          node={node.second}
          onLayoutChange={onLayoutChange}
          renderTab={renderTab}
        />
      </div>
    </div>
  );
};

/** One dock node, by its kind. */
const DockNodeView = ({
  node,
  onLayoutChange,
  renderTab,
  testId,
}: NodeViewProps): ReactElement =>
  node.kind === "tabs" ? (
    <DockTabsView
      node={node}
      onLayoutChange={onLayoutChange}
      renderTab={renderTab}
      testId={testId}
    />
  ) : (
    <DockSplitView
      node={node}
      onLayoutChange={onLayoutChange}
      renderTab={renderTab}
      testId={testId}
    />
  );

/** A named tree of split and tab groups, rendered from a schema. */
export const DockLayout = ({
  layout,
  onLayoutChange,
  renderTab,
  className,
  testId,
}: DockLayoutProps): ReactElement => {
  const theme = useTheme();
  const root = mergeStyle(recipeStyle(cn(DOCK_ROOT, className), theme), {
    flexDirection: "column",
    alignItems: "stretch",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });
  return (
    <div testId={testId} style={root}>
      <DockNodeView
        node={layout}
        onLayoutChange={onLayoutChange}
        renderTab={renderTab}
      />
    </div>
  );
};
