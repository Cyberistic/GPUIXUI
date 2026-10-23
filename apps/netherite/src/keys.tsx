/**
 * The window key seam: terminal mode delivers keys through `render`'s
 * `onKeyDown`, and the mounted app registers the handler it wants.
 */
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { KeyEvent } from "@gpuix/react";

/** The runtime's key event; `key` is optional, so handlers normalise it. */
export type KeyHandler = (event: KeyEvent) => void;
export type KeyRegister = (handler: KeyHandler | undefined) => void;

const Keys = createContext<KeyRegister>(() => {});

export const withWindowKeys = (register: KeyRegister, children: ReactNode) => (
  <Keys.Provider value={register}>{children}</Keys.Provider>
);

/** Register the handler while the calling component is mounted. */
export const useWindowKeys = (handler: KeyHandler): void => {
  const register = useContext(Keys);
  useEffect(() => {
    register(handler);
    return () => register(undefined);
  }, [handler, register]);
};
