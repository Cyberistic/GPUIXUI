import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { KeyEvent } from "@gpuix/react";

export type KeyHandler = (event: KeyEvent) => void;
export type KeyRegister = (handler: KeyHandler | undefined) => void;

const Keys = createContext<KeyRegister>(() => {});

export const withWindowKeys = (register: KeyRegister, children: ReactNode) => (
  <Keys.Provider value={register}>{children}</Keys.Provider>
);

export const useWindowKeys = (handler: KeyHandler): void => {
  const register = useContext(Keys);
  useEffect(() => {
    register(handler);
    return () => register(undefined);
  }, [handler, register]);
};
