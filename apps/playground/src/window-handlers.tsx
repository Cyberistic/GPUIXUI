import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import * as Option from "effect/Option";

export type WindowHandler = (event: EventPayload) => void;

export type WindowKeyHandler = WindowHandler;

export type WindowSelectionHandler = WindowHandler;

export type WindowHandlerRegister = (
  handler: Option.Option<WindowHandler>,
) => void;

const seam = () => {
  const Context = createContext<WindowHandlerRegister>(() => {});

  const use = (handler: WindowHandler): void => {
    const register = useContext(Context);
    const latest = useRef(handler);
    latest.current = handler;
    useEffect(() => {
      register(Option.some((event: EventPayload) => latest.current(event)));
      return () => register(Option.none());
    }, [register]);
  };

  const provider = (
    register: WindowHandlerRegister,
    child: ReactNode,
  ): ReactNode => <Context.Provider value={register}>{child}</Context.Provider>;

  return { use, provider };
};

const keys = seam();
const selection = seam();

export const useWindowKey = keys.use;

export const withWindowKeyProvider = keys.provider;

export const useWindowSelection = selection.use;

export const withWindowSelectionProvider = selection.provider;
