/**
 * `Resizable` — the shadcn-shaped surface over the package's one resize control.
 *
 * shadcn's resizable block is `react-resizable-panels` behind four names; this
 * package already ships the same gesture (`PanelGroup` → `resizePanels`, the
 * `Divider` with pointer capture, the 16px key step, Home/End and the clamp).
 * So the alias declares panes and handles and hands them to that group: there is
 * one drag, one keyboard contract and one persisted shape, and the names are a
 * skin rather than a second implementation.
 *
 * The shape is **fractions**, not shadcn's percentages: `defaultSize={20}` on a
 * two-pane group means the same share under either name, and `normalizePanels`
 * rescales a set that does not sum to 100. The parts are declarations — they
 * paint nothing themselves — because the group flattens them into its own row
 * and owns the single tab stop a divider needs.
 */

import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement, useState } from "react";
import { Panel, PanelLayout } from "./logic.js";
import { PanelGroup } from "./panel-group.js";

/** One declared pane. Its content is painted by the group. */
export interface ResizablePanelProps {
  /** The panel's id: the key a persisted layout stores and a divider names. */
  readonly id: string;
  /** The pane's share of the axis. Fractions need not sum to one. */
  readonly defaultSize: number;
  /**
   * The pane's name, for its collapse toggle and its divider's accessible name.
   * Defaults to `id`.
   */
  readonly label?: string;
  /** Show the header toggle that collapses this pane. */
  readonly collapsible?: boolean;
  readonly children?: ReactNode;
}

/** One pane, as a declaration: the group paints it. */
export const ResizablePanel = (_props: ResizablePanelProps): null => null;

/** One declared gap; the group places its `Divider` between adjacent panes. */
export interface ResizableHandleProps {
  /** The divider's accessible name; defaults to `Resize <left panel>`. */
  readonly label?: string;
}

/** One gap between two panes, as a declaration. */
export const ResizableHandle = (_props: ResizableHandleProps): null => null;

/** {@link ResizablePanelGroup} props. */
export interface ResizablePanelGroupProps {
  /** `"horizontal"` lays the panes left/right; `"vertical"` stacks them. */
  readonly direction?: "horizontal" | "vertical";
  /** The shape, controlled. Omit to let the group hold its own. */
  readonly layout?: PanelLayout;
  /** The shape the group starts with when `layout` is omitted. */
  readonly defaultLayout?: PanelLayout;
  /** Reports the next shape after a drag, a key or a collapse. */
  readonly onLayoutChange?: (layout: PanelLayout) => void;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
  readonly children?: ReactNode;
}

/** The declared panes and gaps, in child order. */
interface Declaration {
  readonly panels: ReadonlyArray<ResizablePanelProps>;
  readonly handles: ReadonlyArray<ResizableHandleProps>;
}

/** A child read as one declared pane, or nothing. */
const panelOf = (child: ReactNode): ResizablePanelProps | null =>
  isValidElement<ResizablePanelProps>(child) && child.type === ResizablePanel
    ? child.props
    : null;

/** A child read as one declared gap, or nothing. */
const handleOf = (child: ReactNode): ResizableHandleProps | null =>
  isValidElement<ResizableHandleProps>(child) && child.type === ResizableHandle
    ? child.props
    : null;

/** Read the parts' props out of the group's children. */
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

/** The layout a set of declarations describes. */
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

/** N panes and their gaps, in shadcn's names over this package's group. */
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
