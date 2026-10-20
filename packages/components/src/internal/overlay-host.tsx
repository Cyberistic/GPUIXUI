/**
 * Where a subtree sits among overlays.
 *
 * React runs a child's layout effects before its parent's, so an overlay
 * mounted together with the one around it pushes its dismiss layer *first* —
 * the opposite of which surface is painted on top. The nesting is known at
 * render time, so it is published here and the dismiss stack (and a modal's
 * focus entry) order by it (plans 730, 732).
 */

import { createContext, useContext, type ReactNode } from "react";

/** The enclosing-overlay facts a surface reads. */
export interface OverlayHost {
  /** The layer depth this overlay pushes; `-1` outside every overlay. */
  readonly depth: number;
  /** The enclosing modal surface's native id, when there is one. Non-modal
   * overlays leave it undefined: only a modal takes and restores focus. */
  readonly contentId: number | undefined;
}

const OverlayHostContext = createContext<OverlayHost>({
  depth: -1,
  contentId: undefined,
});

/** The overlay host this subtree sits in. `depth: -1` outside every overlay. */
export const useOverlayHost = (): OverlayHost => useContext(OverlayHostContext);

/** Publish the host an overlay's parts, or its panel's children, inherit. */
export const OverlayHostProvider = ({
  depth,
  contentId,
  children,
}: OverlayHost & { readonly children?: ReactNode }) => (
  <OverlayHostContext.Provider value={{ depth, contentId }}>
    {children}
  </OverlayHostContext.Provider>
);
