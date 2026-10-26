import { useMemo, type ReactNode } from "react";
import { previewFontStack } from "../../lib/fonts";
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
  // A platform style names `.SystemUIFont`, which the runtime resolves to the
  // host's font; the preview starts with the platform's own family instead so
  // the switch has a typographic axis on every host. An authored family wins.
  const vars = useMemo(
    () => ({
      ...toCssVars(theme),
      "--font-sans": previewFontStack(theme, platform),
    }),
    [platform, theme],
  );

  return (
    <div
      className={className === undefined ? "gx-demo" : `gx-demo ${className}`}
      data-look={look}
      data-mode={theme.mode}
      data-platform={platform}
      style={vars}
    >
      {children}
    </div>
  );
}
