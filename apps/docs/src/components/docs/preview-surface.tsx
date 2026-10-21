import type { ReactNode } from "react";
import { toCssVars } from "../../lib/theme-css";
import { usePlatform } from "./platform-toggle";

/**
 * A browser preview surface.
 *
 * The surface carries the variables of the platform theme the switch selected,
 * so every preview on the site paints the library's roles, radius and families
 * rather than a copy written for the docs. `data-platform` records which one is
 * showing, for a reader inspecting the page and for the deviation note.
 *
 * Browser previews are illustrative: the shipped component renders through
 * GPUix, not the DOM.
 */
export function PreviewSurface({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const { look, platform, theme } = usePlatform();

  return (
    <div
      className={className === undefined ? "gx-demo" : `gx-demo ${className}`}
      data-look={look}
      data-platform={platform}
      style={toCssVars(theme)}
    >
      {children}
    </div>
  );
}
