/**
 * Where a subtree sits among modal surfaces.
 *
 * React runs a child's layout effects before its parent's, so an enclosing
 * dialog pushes its dismiss layer and moves focus *after* a modal nested in its
 * content — the opposite of which surface is painted on top. The nesting is
 * known at render time, so it is published here and the dismiss stack and focus
 * entry order by it (plan 730).
 */

import { createContext, useContext, type ReactNode } from "react";

/** The enclosing-modal facts a surface reads. */
export interface ModalHost {
  /** The layer depth this modal pushes; `-1` outside every modal. */
  readonly depth: number;
  /** The enclosing modal surface's native id, when there is one. */
  readonly contentId: number | undefined;
}

const ModalHostContext = createContext<ModalHost>({
  depth: -1,
  contentId: undefined,
});

/** The modal host this subtree sits in. `depth: -1` outside every modal. */
export const useModalHost = (): ModalHost => useContext(ModalHostContext);

/** Publish the host a modal's parts, or its surface's children, inherit. */
export const ModalHostProvider = ({
  depth,
  contentId,
  children,
}: ModalHost & { readonly children?: ReactNode }) => (
  <ModalHostContext.Provider value={{ depth, contentId }}>
    {children}
  </ModalHostContext.Provider>
);
