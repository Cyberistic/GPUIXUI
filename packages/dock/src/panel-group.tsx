/**
 * `PanelGroup` — N panes in a row or column, built on the split divider.
 *
 * The group is a flex box whose panes take `flexGrow` from their fractions, so
 * the persisted {@link PanelLayout} needs no pixel measurement to paint: a
 * fraction is the share directly. Between every adjacent pair sits the same
 * {@link Divider} a `SplitPane` uses, so the resize interaction (pointer
 * capture on the pair, the keyboard step, the ring, the clamp) is one control,
 * not a second copy. A divider reports a cumulative pixel delta; the group
 * converts it to a fraction against the pane space it measures once on layout.
 *
 * A collapsible pane carries a header toggle (the primitives' `Button`); while
 * collapsed it shrinks to that header and its content leaves the tree, so the
 * other panes fill the space. The whole shape — fractions, collapse flags,
 * orientation — round-trips through {@link PanelLayout} at the app's
 * persistence boundary.
 */

import type { ReactElement, ReactNode } from "react";
import { Fragment, useRef, useState } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { Button } from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import { Divider } from "./divider.js";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  PanelLayout,
  normalizePanels,
  resizePanels,
  resizePanelsByKey,
  togglePanelCollapsed,
  type Panel,
} from "./logic.js";
import { PANE, PANEL_ROOT, mergeStyle, recipeStyle } from "./recipe.js";
import { useTheme, type Theme } from "./theme.js";

export interface PanelGroupProps {
  /** The group's persisted shape, fractions and all. Controlled. */
  readonly layout: PanelLayout;
  /** Reports the next layout after a resize or a collapse. */
  readonly onLayoutChange?: (layout: PanelLayout) => void;
  /** Renders one panel's content by its id. */
  readonly renderPanel: (id: string) => ReactNode;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
}

/** A group's pane, expanded to its share or collapsed to its header. */
const paneStyle = (panel: Panel, theme: Theme): StyleDesc =>
  mergeStyle(recipeStyle(PANE, theme), {
    display: "flex",
    flexDirection: "column",
    flexGrow: panel.collapsed ? 0 : panel.size,
    flexShrink: panel.collapsed ? 0 : 1,
    ...(panel.collapsed ? {} : { flexBasis: 0 }),
  });

/** N panes in a row or column, built on the split divider. */
export const PanelGroup = ({
  layout,
  onLayoutChange,
  renderPanel,
  className,
  testId,
}: PanelGroupProps): ReactElement => {
  const theme = useTheme();
  const orientation = layout.orientation;
  const panels = normalizePanels(layout.panels);
  // The pane space a fraction maps onto: the group's main axis minus its dividers.
  const [total, setTotal] = useState(0);
  const dragStart = useRef<ReadonlyArray<Panel> | null>(null);

  const available = total - (panels.length - 1) * DIVIDER_WIDTH;

  const root = mergeStyle(recipeStyle(cn(PANEL_ROOT, className), theme), {
    flexDirection: orientation === "horizontal" ? "row" : "column",
    alignItems: "stretch",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });

  const onLayout = (event: EventPayload): void => {
    const next =
      orientation === "horizontal" ? (event.width ?? 0) : (event.height ?? 0);
    setTotal((previous) => (previous === next ? previous : next));
  };

  const content: StyleDesc = {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  };

  return (
    <div testId={testId} style={root} onLayout={onLayout}>
      {panels.map((panel, index) => {
        const last = index === panels.length - 1;
        const pair = panels[index + 1];
        return (
          <Fragment key={panel.id}>
            <div
              style={paneStyle(panel, theme)}
              testId={
                testId === undefined ? undefined : `${testId}-pane-${panel.id}`
              }
            >
              {panel.collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  label={
                    panel.collapsed
                      ? `Expand ${panel.label}`
                      : `Collapse ${panel.label}`
                  }
                  onActivate={() =>
                    onLayoutChange?.(togglePanelCollapsed(layout, panel.id))
                  }
                >
                  {panel.label}
                </Button>
              )}
              {!panel.collapsed && (
                <div style={content}>{renderPanel(panel.id)}</div>
              )}
            </div>
            {!last && pair !== undefined && (
              <Divider
                orientation={orientation}
                valueText={`${Math.round(panel.size * 100)}%`}
                label={`Resize ${panel.label}`}
                testId={
                  testId === undefined
                    ? undefined
                    : `${testId}-divider-${index}`
                }
                onDragStart={() => {
                  dragStart.current = panels;
                }}
                onDragDelta={(delta) => {
                  const start = dragStart.current;
                  if (start === null || available <= 0) return;
                  onLayoutChange?.(
                    new PanelLayout({
                      ...layout,
                      panels: resizePanels(start, index, delta / available),
                    }),
                  );
                }}
                onDragEnd={() => {
                  dragStart.current = null;
                }}
                onKey={(key) => {
                  if (available <= 0) return;
                  onLayoutChange?.(
                    new PanelLayout({
                      ...layout,
                      panels: resizePanelsByKey(
                        panels,
                        index,
                        key,
                        DIVIDER_STEP / available,
                      ),
                    }),
                  );
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
