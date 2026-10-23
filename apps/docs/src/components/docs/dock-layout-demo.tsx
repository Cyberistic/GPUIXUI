import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  DockTab,
  resizeSplit,
  resizeSplitByKey,
  setActiveTab,
  type DividerKey,
  type DockNode,
  type DockSplit,
  type DockTabs,
} from "@gpuixui/dock/logic";
import { dockKeyOf } from "./dock-preview";

/**
 * Browser preview for the Workspace lane's docking layout.
 *
 * `@gpuixui/dock`'s `DockLayout` renders a named tree: a split holds two dock
 * nodes, a tab group holds an ordered list and one active tab. The preview
 * draws the page's own tree — one split with a tab group on each side — and
 * calls the package's reducers: `resizeSplit` and `resizeSplitByKey` for the
 * divider, `setActiveTab` for a tab press. Only the paint is the browser's.
 *
 * The shipped split converts a pixel delta against the pane space it measures
 * in `onLayout`; the drawing is a fixed frame, so the conversion uses
 * `DOCK_LAYOUT_WIDTH`. That number is the preview's, not the component's.
 */

/** The frame's main axis, in pixels — the drawing's stand-in for `onLayout`. */
export const DOCK_LAYOUT_WIDTH = 620;

/** The first child's share at rest, inside `[0, 1]` so both ends are reachable. */
const DOCK_SPLIT_START = 0.58;

/** The one-level tree the drawing supports: a split of two tab groups. */
export interface TabbedSplit extends DockSplit {
  readonly first: DockTabs;
  readonly second: DockTabs;
}

const tab = (id: string, label: string): DockTab => new DockTab({ id, label });

const group = (
  id: string,
  activeTab: string,
  tabs: ReadonlyArray<DockTab>,
): DockTabs => ({ kind: "tabs", id, activeTab, tabs });

/** The tree the preview opens at: two tab groups sharing one split. */
export const dockStart = (): TabbedSplit => ({
  kind: "split",
  id: "root",
  orientation: "horizontal",
  size: DOCK_SPLIT_START,
  first: group("editor", "code", [
    tab("code", "Code"),
    tab("preview", "Preview"),
  ]),
  second: group("outline", "outline", [
    tab("outline", "Outline"),
    tab("problems", "Problems"),
  ]),
});

/** The main axis a split's fractions divide, minus its divider. */
export const dockAvailable = (): number => DOCK_LAYOUT_WIDTH - DIVIDER_WIDTH;

/** The tree a pointer drag produces, from the share the press found. */
export const dragDock = (
  layout: TabbedSplit,
  start: number,
  delta: number,
): TabbedSplit => ({
  ...layout,
  size: resizeSplit(start, delta / dockAvailable()),
});

/** The tree a divider key produces, stepped in pixels like the component. */
export const keyDock = (layout: TabbedSplit, key: DividerKey): TabbedSplit => ({
  ...layout,
  size: resizeSplitByKey(layout.size, key, DIVIDER_STEP / dockAvailable()),
});

/** Read a tree back as the shape the drawing supports. */
const tabbedSplit = (node: DockNode): TabbedSplit | undefined => {
  if (node.kind !== "split") return undefined;
  if (node.first.kind !== "tabs" || node.second.kind !== "tabs")
    return undefined;
  return { ...node, first: node.first, second: node.second };
};

/** The tree a tab press produces, through the package's reducer. */
export const activateTab = (
  layout: TabbedSplit,
  groupId: string,
  tabId: string,
): TabbedSplit => {
  const next = setActiveTab(layout, groupId, tabId);
  return next === layout ? layout : (tabbedSplit(next) ?? layout);
};

/** The active tab's label in a group, for the readout. */
export const activeLabel = (node: DockTabs): string =>
  node.tabs.find((entry) => entry.id === node.activeTab)?.label ??
  node.activeTab;

/** The readout under the frame: each pane's share and its active tab. */
export const dockReadout = (layout: TabbedSplit): string =>
  `${activeLabel(layout.first)} ${Math.round(layout.size * 100)}% · ` +
  `${activeLabel(layout.second)} ${100 - Math.round(layout.size * 100)}%`;

const TabBody = ({ id }: { readonly id: string }): ReactNode => {
  if (id === "code") {
    return (
      <pre className="gx-layout-code">
        <span>{"// the tree is the state\n"}</span>
        {"<DockLayout\n  layout={layout}\n  onLayoutChange={setLayout}\n/>"}
      </pre>
    );
  }

  if (id === "preview") {
    return (
      <p className="gx-layout-copy">
        The active tab&apos;s content is the caller&apos;s: a tab is an id and a
        label, and the app renders the body.
      </p>
    );
  }

  if (id === "problems") {
    return <p className="gx-layout-copy">No problems in this workspace.</p>;
  }

  return (
    <div className="gx-layout-rows">
      {["DockLayout", "DockSplit", "DockTabs", "DockTab"].map((symbol) => (
        <div className="gx-layout-row" key={symbol}>
          <span>{symbol}</span>
          <code>@gpuixui/dock</code>
        </div>
      ))}
    </div>
  );
};

const TabGroup = ({
  node,
  onSelect,
}: {
  readonly node: DockTabs;
  readonly onSelect: (groupId: string, tabId: string) => void;
}) => (
  <div className="gx-layout-group" data-group={node.id}>
    <div className="gx-layout-tabs" role="tablist">
      {node.tabs.map((entry) => {
        const active = entry.id === node.activeTab;
        return (
          <button
            aria-selected={active}
            className="gx-layout-tab"
            key={entry.id}
            onClick={() => onSelect(node.id, entry.id)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {entry.label}
          </button>
        );
      })}
    </div>
    <div className="gx-layout-body">
      <TabBody id={node.activeTab} />
    </div>
  </div>
);

export interface DockLayoutFrameProps {
  /** The tree to render, controlled the way `DockLayout` takes it. */
  readonly layout: TabbedSplit;
  /** Reports the next tree after a tab press or a divider move. */
  readonly onChange: (layout: TabbedSplit) => void;
}

/** The drawing itself: the split, its two tab groups and its divider. */
export const DockLayoutFrame = ({ layout, onChange }: DockLayoutFrameProps) => {
  const drag = useRef<
    | {
        readonly start: number;
        readonly originX: number;
        readonly pointerId: number;
      }
    | undefined
  >(undefined);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      start: layout.size,
      originX: event.clientX,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const active = drag.current;
    if (active === undefined || active.pointerId !== event.pointerId) return;
    onChange(dragDock(layout, active.start, event.clientX - active.originX));
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = dockKeyOf(event.key);
    if (key === undefined) return;
    event.preventDefault();
    onChange(keyDock(layout, key));
  };

  const first = Math.round(layout.size * 100);

  return (
    <div className="gx-layout">
      <div
        className="gx-layout-pane"
        style={{ flexGrow: layout.size, flexBasis: 0 }}
      >
        <TabGroup
          node={layout.first}
          onSelect={(groupId, tabId) =>
            onChange(activateTab(layout, groupId, tabId))
          }
        />
      </div>
      <div
        aria-label="Resize panes"
        aria-valuetext={`${first}%`}
        className="gx-layout-handle"
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        role="separator"
        style={{ width: DIVIDER_WIDTH }}
        tabIndex={0}
      />
      <div
        className="gx-layout-pane"
        style={{ flexGrow: 1 - layout.size, flexBasis: 0 }}
      >
        <TabGroup
          node={layout.second}
          onSelect={(groupId, tabId) =>
            onChange(activateTab(layout, groupId, tabId))
          }
        />
      </div>
    </div>
  );
};

/** The page's preview: the tree and the shares it currently paints. */
export const DockLayoutDemo = () => {
  const [layout, setLayout] = useState<TabbedSplit>(dockStart);

  return (
    <div className="gx-layout-demo">
      <DockLayoutFrame layout={layout} onChange={setLayout} />
      <p className="gx-layout-readout">{dockReadout(layout)}</p>
      <p className="gx-layout-hint">
        Press a tab to switch its group. Drag the divider, or focus it and press
        ← →; Home and End take the split.
      </p>
    </div>
  );
};

export const dockLayoutDemoSource = `import { DockLayout, DockTab, type DockNode } from "@gpuixui/dock";
import { Text } from "@gpuixui/primitives";
import { useState } from "react";

const initial: DockNode = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  size: 0.58,
  first: {
    kind: "tabs",
    id: "editor",
    activeTab: "code",
    tabs: [new DockTab({ id: "code", label: "Code" })],
  },
  second: {
    kind: "tabs",
    id: "outline",
    activeTab: "outline",
    tabs: [new DockTab({ id: "outline", label: "Outline" })],
  },
};

export function Workspace() {
  const [layout, setLayout] = useState(initial);
  return (
    <DockLayout
      layout={layout}
      onLayoutChange={setLayout}
      renderTab={(id) => <Text role="body">{id}</Text>}
    />
  );
}

// A tab press rewrites its group's activeTab; a divider drag rewrites its split's size.`;
