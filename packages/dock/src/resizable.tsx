/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement, useState } from "react";
import { Panel, PanelLayout } from "./logic.js";
import { PanelGroup } from "./panel-group.js";

export interface ResizablePanelProps {
  readonly id: string;

  readonly defaultSize: number;

  readonly label?: string;

  readonly collapsible?: boolean;
  readonly children?: ReactNode;
}

export const ResizablePanel = (_props: ResizablePanelProps): null => null;

export interface ResizableHandleProps {
  readonly label?: string;
}

export const ResizableHandle = (_props: ResizableHandleProps): null => null;

export interface ResizablePanelGroupProps {
  readonly direction?: "horizontal" | "vertical";

  readonly layout?: PanelLayout;

  readonly defaultLayout?: PanelLayout;

  readonly onLayoutChange?: (layout: PanelLayout) => void;

  readonly className?: string;

  readonly testId?: string;
  readonly children?: ReactNode;
}

interface Declaration {
  readonly panels: ReadonlyArray<ResizablePanelProps>;
  readonly handles: ReadonlyArray<ResizableHandleProps>;
}

const panelOf = (child: ReactNode): ResizablePanelProps | null =>
  isValidElement<ResizablePanelProps>(child) && child.type === ResizablePanel
    ? child.props
    : null;

const handleOf = (child: ReactNode): ResizableHandleProps | null =>
  isValidElement<ResizableHandleProps>(child) && child.type === ResizableHandle
    ? child.props
    : null;

const readDeclarations = (children: ReactNode): Declaration => {
  const panels: Array<ResizablePanelProps> = [];
  const handles: Array<ResizableHandleProps> = [];
  Children.toArray(children).forEach((child) => {
    const panel = panelOf(child);
    if (panel !== null) panels.push(panel);
    const handle = handleOf(child);
    if (handle !== null) handles.push(handle);
  });
  return { panels, handles };
};

export const layoutOfDeclarations = (
  direction: "horizontal" | "vertical",
  panels: ReadonlyArray<ResizablePanelProps>,
): PanelLayout =>
  new PanelLayout({
    orientation: direction,
    panels: panels.map(
      (panel) =>
        new Panel({
          id: panel.id,
          label: panel.label ?? panel.id,
          size: panel.defaultSize,
        }),
    ),
  });

export const ResizablePanelGroup = ({
  direction = "horizontal",
  layout,
  defaultLayout,
  onLayoutChange,
  className,
  testId,
  children,
}: ResizablePanelGroupProps): ReactElement => {
  const { panels, handles } = readDeclarations(children);
  const [held, setHeld] = useState(
    () => defaultLayout ?? layoutOfDeclarations(direction, panels),
  );
  const current = layout ?? held;

  return (
    <PanelGroup
      className={className}
      dividerLabel={(index) => handles[index]?.label}
      layout={current}
      onLayoutChange={(next) => {
        if (layout === undefined) setHeld(next);
        onLayoutChange?.(next);
      }}
      renderPanel={(id) => panels.find((panel) => panel.id === id)?.children}
      testId={testId}
    />
  );
};
