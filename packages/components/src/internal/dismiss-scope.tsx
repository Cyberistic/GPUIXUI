/**
 * The containment depth an overlay surface carries into the dismiss stack.
 *
 * The stack decides which surface a keystroke closes by how deeply it is nested,
 * not by the order its layout effect ran: React runs a child's effect first, so
 * two surfaces open in one first render would otherwise put the parent on top.
 * An open surface wraps the children it renders in `DismissScope`, so every
 * overlay mounted inside it — declaratively or from a trigger — declares a
 * deeper layer and sits above it.
 */

import { createContext, useContext, type ReactNode } from "react";

/** The depth of the overlay a subtree is rendered inside; the page is 0. */
const AmbientDepth = createContext(0);

/**
 * The depth of the surface being rendered: one deeper than the overlay it sits
 * in. Call this where the surface pushes its dismiss layer.
 */
export const useDismissDepth = (): number => useContext(AmbientDepth) + 1;

/**
 * Provide this surface's depth to the children it renders, so a nested overlay
 * sits above it. Place it around the surface's own children, not its trigger.
 */
export const DismissScope = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <AmbientDepth.Provider value={useDismissDepth()}>
    {children}
  </AmbientDepth.Provider>
);
