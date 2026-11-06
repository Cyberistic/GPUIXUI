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

export const GROUP_WIDTH = 620;

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

export const groupAvailable = (count: number): number =>
  GROUP_WIDTH - (count - 1) * DIVIDER_WIDTH;

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
  readonly layout: PanelLayout;

  readonly onChange: (layout: PanelLayout) => void;
}

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
