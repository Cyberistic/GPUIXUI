import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  DOCK_BOUNDS,
  DOCK_DIVIDER_WIDTH,
  DOCK_INITIAL,
  dragWidth,
  dockKeyOf,
  keyWidth,
} from "./dock-preview";

/**
 * Browser previews for the Workspace lane's shipped split.
 *
 * `@gpuixui/dock`'s `SplitPane` is the native control: two panes and one 6px
 * divider that drags with pointer capture, steps 16px on the arrows and takes
 * its bounds from the caller. The preview draws the same three parts in the
 * platform theme's variables and runs the same arithmetic (`dock-preview.ts`),
 * so the divider is explorable — but the paint is a browser approximation, and
 * the Code tab shows the shipped `SplitPane` it stands in for.
 */

/** The files the rail lists, so the panes read as a workspace rather than a box. */
const files = [
  { name: "split-pane.tsx", note: "review" },
  { name: "panel-group.tsx", note: "" },
  { name: "dock-layout.tsx", note: "" },
  { name: "logic.ts", note: "" },
];

const rows = [
  ["orientation", '"horizontal"'],
  ["size", "312"],
  ["min / max", "220 / 380"],
];

export const DockPreview = () => {
  const [width, setWidth] = useState(DOCK_INITIAL);
  const drag = useRef<
    { pointerId: number; startX: number; startWidth: number } | undefined
  >(undefined);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const active = drag.current;
    if (active === undefined || active.pointerId !== event.pointerId) return;
    setWidth(dragWidth(active.startWidth, event.clientX - active.startX, DOCK_BOUNDS));
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = dockKeyOf(event.key);
    if (key === undefined) return;
    event.preventDefault();
    setWidth((current) => keyWidth(current, key, DOCK_BOUNDS));
  };

  return (
    <div className="gx-dock">
      <div className="gx-dock-rail">
        <span className="gx-dock-rail-title">dock</span>
        {files.map((file) => (
          <span
            aria-current={file.name === "split-pane.tsx" ? "page" : undefined}
            className="gx-dock-file"
            key={file.name}
          >
            {file.name}
            {file.note === "" ? null : <b>{file.note}</b>}
          </span>
        ))}
      </div>
      <div className="gx-dock-pane gx-dock-editor" style={{ width }}>
        <div className="gx-dock-head">
          <span>split-pane.tsx</span>
          <span className="gx-dock-meta">{width} px</span>
        </div>
        <div className="gx-dock-body">
          <p className="gx-dock-code">
            <span>size=</span>
            {`{${width}}`}
          </p>
          <p className="gx-dock-hint">
            Drag the divider, or focus it and press ← →; Home and End take the
            bounds.
          </p>
        </div>
      </div>
      <div
        aria-label="Resize the editor"
        aria-valuemax={DOCK_BOUNDS.max}
        aria-valuemin={DOCK_BOUNDS.min}
        aria-valuetext={`${width} px`}
        aria-orientation="vertical"
        className="gx-dock-handle"
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        role="separator"
        style={{ width: DOCK_DIVIDER_WIDTH }}
        tabIndex={0}
      />
      <div className="gx-dock-pane gx-dock-inspector">
        <div className="gx-dock-head">
          <span>Inspector</span>
          <span className="gx-dock-meta">props</span>
        </div>
        <div className="gx-dock-body">
          {rows.map(([label, value]) => (
            <div className="gx-dock-row" key={label}>
              <span>{label}</span>
              <code>{value}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const dockPreviewSource = `import { SplitPane } from "@gpuixui/dock";
import { Text } from "@gpuixui/primitives";
import { useState } from "react";

export function EditorDock() {
  const [width, setWidth] = useState(312);
  return (
    <SplitPane
      size={width}
      onResize={setWidth}
      min={220}
      max={380}
      dividerLabel="Resize the editor"
      first={<Text role="code">split-pane.tsx</Text>}
      second={<Text role="body">Inspector</Text>}
    />
  );
}`;
