import {
  Fragment,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  Panel,
  PanelLayout,
  normalizePanels,
  resizePanels,
  resizePanelsByKey,
  togglePanelCollapsed,
  type DividerKey,
} from "@gpuixui/dock/logic";

/**
 * Browser preview for the Workspace lane's panel group.
 *
 * `@gpuixui/dock`'s `PanelGroup` owns the shape: a fraction per pane, a
 * collapse flag, one divider between every adjacent pair, and the reducers that
 * resize, step and collapse. The preview draws that shape in the platform
 * theme's variables and calls the package's own reducers
 * (`normalizePanels`, `resizePanels`, `resizePanelsByKey`,
 * `togglePanelCollapsed`), so a drag, an arrow press and a collapse report the
 * layout the shipped control would report. Only the paint is the browser's.
 *
 * The shipped group converts a pixel delta against the pane space it measures
 * once in `onLayout`; the drawing is a fixed frame, so the conversion uses
 * `GROUP_WIDTH`. That number is the preview's, not the component's.
 */

/** The frame's main axis, in pixels — the drawing's stand-in for `onLayout`. */
export const GROUP_WIDTH = 620;

/** The layout the preview opens at: a collapsible rail and two panes. */
export const groupStart = (): PanelLayout =>
  new PanelLayout({
    orientation: "horizontal",
    panels: [
      new Panel({
        id: "sidebar",
        label: "Sidebar",
        size: 0.22,
        collapsible: true,
      }),
      new Panel({ id: "editor", label: "Editor", size: 0.5 }),
      new Panel({ id: "inspector", label: "Inspector", size: 0.28 }),
    ],
  });

/** The main axis a group's fractions divide, minus its dividers. */
export const groupAvailable = (count: number): number =>
  GROUP_WIDTH - (count - 1) * DIVIDER_WIDTH;

/**
 * The layout a pointer drag produces.
 *
 * `start` is the pane list the press found, the way `PanelGroup` records it in
 * `onDragStart`; `delta` is the cumulative pixel distance from the press.
 */
export const dragLayout = (
  layout: PanelLayout,
  index: number,
  start: ReadonlyArray<Panel>,
  delta: number,
): PanelLayout =>
  new PanelLayout({
    ...layout,
    panels: resizePanels(
      normalizePanels(start),
      index,
      delta / groupAvailable(start.length),
    ),
  });

/** The layout a divider key produces, stepped in pixels like the component. */
export const keyLayout = (
  layout: PanelLayout,
  index: number,
  key: DividerKey,
): PanelLayout => {
  const panels = normalizePanels(layout.panels);
  return new PanelLayout({
    ...layout,
    panels: resizePanelsByKey(
      panels,
      index,
      key,
      DIVIDER_STEP / groupAvailable(panels.length),
    ),
  });
};

/**
 * The divider key a browser `KeyboardEvent.key` names.
 *
 * The runtime hands the native divider its own key names (`left`, `home`), so
 * this map is the DOM boundary, not a second copy of the key list.
 */
export const browserDividerKey = (key: string): DividerKey | undefined => {
  const keys: Readonly<Record<string, DividerKey>> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    Home: "home",
    End: "end",
  };
  return keys[key];
};

/** The readout under the frame: each pane's share of the group. */
export const shareLabel = (layout: PanelLayout): string =>
  normalizePanels(layout.panels)
    .map(
      (panel) =>
        `${panel.label.toLowerCase()} ${Math.round(panel.size * 100)}%`,
    )
    .join(" · ");

const files = ["split-pane.tsx", "panel-group.tsx", "dock-layout.tsx"];

const properties = [
  ["orientation", '"horizontal"'],
  ["panels", "3"],
  ["collapsible", "sidebar"],
];

const PaneBody = ({ id }: { readonly id: string }): ReactNode => {
  if (id === "sidebar") {
    return (
      <div className="gx-group-files">
        {files.map((file) => (
          <span
            aria-current={file === "panel-group.tsx" ? "page" : undefined}
            className="gx-group-file"
            key={file}
          >
            {file}
          </span>
        ))}
      </div>
    );
  }

  if (id === "inspector") {
    return (
      <div className="gx-group-rows">
        {properties.map(([label, value]) => (
          <div className="gx-group-row" key={label}>
            <span>{label}</span>
            <code>{value}</code>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="gx-group-code">
      <span>{"// one reducer for every pane\n"}</span>
      {"<PanelGroup\n  layout={layout}\n  onLayoutChange={setLayout}\n/>"}
    </pre>
  );
};

export interface PanelGroupFrameProps {
  /** The persisted shape, controlled the way `PanelGroup` takes it. */
  readonly layout: PanelLayout;
  /** Reports the next shape after a drag, a key or a collapse. */
  readonly onChange: (layout: PanelLayout) => void;
}

/** The drawing itself: `PanelGroup`'s parts, over the package's reducers. */
export const PanelGroupFrame = ({ layout, onChange }: PanelGroupFrameProps) => {
  const panels = normalizePanels(layout.panels);
  const drag = useRef<
    | {
        readonly index: number;
        readonly start: ReadonlyArray<Panel>;
        readonly originX: number;
        readonly pointerId: number;
      }
    | undefined
  >(undefined);

  const onPointerDown =
    (index: number) => (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        index,
        start: panels,
        originX: event.clientX,
        pointerId: event.pointerId,
      };
    };

  const onPointerMove =
    (index: number) => (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (
        active === undefined ||
        active.index !== index ||
        active.pointerId !== event.pointerId
      ) {
        return;
      }
      onChange(
        dragLayout(layout, index, active.start, event.clientX - active.originX),
      );
    };

  const onPointerEnd =
    (index: number) => (event: PointerEvent<HTMLDivElement>) => {
      if (
        drag.current?.index === index &&
        drag.current.pointerId === event.pointerId
      ) {
        drag.current = undefined;
      }
    };

  const onKeyDown =
    (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
      const key = browserDividerKey(event.key);
      if (key === undefined) return;
      event.preventDefault();
      onChange(keyLayout(layout, index, key));
    };

  return (
    <div
      className="gx-group"
      style={{
        flexDirection: layout.orientation === "horizontal" ? "row" : "column",
      }}
    >
      {panels.map((panel, index) => (
        <Fragment key={panel.id}>
          <div
            className="gx-group-pane"
            data-collapsed={panel.collapsed}
            data-panel={panel.id}
            style={{
              flexGrow: panel.collapsed ? 0 : panel.size,
              flexShrink: panel.collapsed ? 0 : 1,
              flexBasis: panel.collapsed ? "auto" : 0,
            }}
          >
            {panel.collapsible && (
              <button
                aria-expanded={!panel.collapsed}
                className="gx-group-head"
                onClick={() => onChange(togglePanelCollapsed(layout, panel.id))}
                type="button"
              >
                <span aria-hidden="true" className="gx-group-mark">
                  {panel.collapsed ? "▸" : "▾"}
                </span>
                {panel.label}
                <span className="gx-group-share">
                  {Math.round(panel.size * 100)}%
                </span>
              </button>
            )}
            {!panel.collapsed && (
              <div className="gx-group-body">
                <PaneBody id={panel.id} />
              </div>
            )}
          </div>
          {index < panels.length - 1 && (
            <div
              aria-label={`Resize ${panel.label}`}
              aria-valuetext={`${Math.round(panel.size * 100)}%`}
              className="gx-group-handle"
              onKeyDown={onKeyDown(index)}
              onPointerCancel={onPointerEnd(index)}
              onPointerDown={onPointerDown(index)}
              onPointerMove={onPointerMove(index)}
              onPointerUp={onPointerEnd(index)}
              role="separator"
              style={
                layout.orientation === "horizontal"
                  ? { width: DIVIDER_WIDTH }
                  : { height: DIVIDER_WIDTH }
              }
              tabIndex={0}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

/** The page's preview: the frame and the shares it currently paints. */
export const PanelGroupDemo = () => {
  const [layout, setLayout] = useState(groupStart);

  return (
    <div className="gx-group-demo">
      <PanelGroupFrame layout={layout} onChange={setLayout} />
      <p className="gx-group-readout">{shareLabel(layout)}</p>
    </div>
  );
};

export const panelGroupDemoSource = `import { PanelGroup, PanelLayout, Panel, normalizePanels } from "@gpuixui/dock";
import { Text } from "@gpuixui/primitives";
import { useState } from "react";

const initial = new PanelLayout({
  orientation: "horizontal",
  panels: [
    new Panel({ id: "sidebar", label: "Sidebar", size: 0.22, collapsible: true }),
    new Panel({ id: "editor", label: "Editor", size: 0.5 }),
    new Panel({ id: "inspector", label: "Inspector", size: 0.28 }),
  ],
});

export function Workspace() {
  const [layout, setLayout] = useState(initial);
  return (
    <PanelGroup
      layout={layout}
      onLayoutChange={setLayout}
      renderPanel={(id) => <Text role="body">{id}</Text>}
    />
  );
}

// normalizePanels(layout.panels) rescales fractions that do not sum to one.`;
