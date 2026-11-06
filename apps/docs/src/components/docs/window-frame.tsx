import type { ReactNode } from "react";

/**
 * The browser drawing of `@gpuixui/shell`'s `Window` (plan 722): the frame every
 * block reproduction wears.
 *
 * It mirrors the native anatomy, not a web layout: the sidebar runs from the top
 * edge under the traffic lights and paints the theme's material over the
 * browser's own blur (`.gx-material`), the unified 52-point toolbar sits over
 * the content column, and the content and inspector are opaque. Without a
 * sidebar the toolbar leaves the lights their 90-point box, as the native bar
 * does.
 */
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
