import type { ReactNode } from "react";

export interface WindowFrameProps {
  readonly title?: string;
  readonly sidebar?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly inspector?: ReactNode;
  readonly children?: ReactNode;
  /** The frame's height, in pixels; blocks pick their window's own. */
  readonly height?: number;
}

export const WindowFrame = ({
  title,
  sidebar,
  toolbar,
  inspector,
  children,
  height = 420,
}: WindowFrameProps) => (
  <div className="gx-window" style={{ height }}>
    <div className="gx-window-lights" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
    {sidebar === undefined ? null : (
      <div className="gx-window-sidebar gx-material">{sidebar}</div>
    )}
    <div className="gx-window-main">
      <div
        className="gx-window-toolbar"
        data-lights={sidebar === undefined ? "" : undefined}
      >
        {title === undefined ? null : (
          <span className="gx-window-title">{title}</span>
        )}
        <span className="gx-window-space" />
        {toolbar}
      </div>
      <div className="gx-window-body">
        <div className="gx-window-content">{children}</div>
        {inspector === undefined ? null : (
          <div className="gx-window-inspector">{inspector}</div>
        )}
      </div>
    </div>
  </div>
);
