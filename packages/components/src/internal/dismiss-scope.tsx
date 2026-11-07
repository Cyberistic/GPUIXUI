/** @jsxImportSource @gpuix/react */
import { createContext, useContext, type ReactNode } from "react";

const AmbientDepth = createContext(0);

export const useDismissDepth = (): number => useContext(AmbientDepth) + 1;

export const DismissScope = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <AmbientDepth.Provider value={useDismissDepth()}>
    {children}
  </AmbientDepth.Provider>
);
