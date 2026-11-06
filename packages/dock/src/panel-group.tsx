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
  readonly layout: PanelLayout;

  readonly onLayoutChange?: (layout: PanelLayout) => void;

  readonly renderPanel: (id: string) => ReactNode;

  readonly dividerLabel?: (index: number) => string | undefined;

  readonly className?: string;

  readonly testId?: string;
}

const paneStyle = (panel: Panel, theme: Theme): StyleDesc =>
  mergeStyle(recipeStyle(PANE, theme), {
    display: "flex",
    flexDirection: "column",
    flexGrow: panel.collapsed ? 0 : panel.size,
    flexShrink: panel.collapsed ? 0 : 1,
    ...(panel.collapsed ? {} : { flexBasis: 0 }),
  });

export const PanelGroup = ({
  layout,
  onLayoutChange,
  renderPanel,
  dividerLabel,
  className,
  testId,
}: PanelGroupProps): ReactElement => {
  const theme = useTheme();
  const orientation = layout.orientation;
  const panels = normalizePanels(layout.panels);

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
                label={dividerLabel?.(index) ?? `Resize ${panel.label}`}
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
