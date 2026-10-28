import { createContext, useContext, useMemo, type ReactNode } from "react";
import { previewFontStack } from "../../lib/fonts";
import { toCssVars } from "../../lib/theme-css";
import { usePlatform } from "./platform-toggle";

/**
 * Whether the scene is a live page preview or a still tile.
 *
 * A grid tile is inert and shows the component's opening state; it must not
 * install the window listeners a reader-opened surface needs, or a press
 * anywhere on the index would dismiss every tile's overlay at once.
 */
const PreviewInteractive = createContext(true);

export const usePreviewInteractive = (): boolean =>
  useContext(PreviewInteractive);

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
  interactive = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** A still tile opens on the component's state but installs no listener. */
  readonly interactive?: boolean;
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
    <PreviewInteractive.Provider value={interactive}>
      <div
        className={className === undefined ? "gx-demo" : `gx-demo ${className}`}
        data-look={look}
        data-mode={theme.mode}
        data-platform={platform}
        // The visitor's platform, look and palette are the client's to know: the
        // prerendered HTML carries the site default, and this element paints the
        // saved choice on the first render. React would otherwise report the
        // difference as a hydration mismatch on every page.
        suppressHydrationWarning
        style={vars}
      >
        {children}
      </div>
    </PreviewInteractive.Provider>
  );
}
