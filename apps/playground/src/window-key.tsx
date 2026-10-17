/**
 * Bridges GPUix's app-level window key handler to a component.
 *
 * GPUix exposes no per-component window-key hook: the handler is an app concern
 * (`render(<App/>, { onKeyDown })`), which is exactly how a command palette or an
 * application menu gets a global shortcut. This is the app's seam — the shell
 * installs the handler once and a component registers for it while mounted.
 *
 * The `useEffect` is a React lifecycle registration for a native handler, not
 * shared state, so it is not an Effect Atom concern.
 */
import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import * as Option from "effect/Option";

/** Called for a key that reached the window (after element `onKeyDown`). */
export type WindowKeyHandler = (event: EventPayload) => void;

type Register = (handler: Option.Option<WindowKeyHandler>) => void;

const WindowKeyContext = createContext<Register>(() => {});

/** Registers `handler` for app-level window keys while the component is mounted. */
export const useWindowKey = (handler: WindowKeyHandler): void => {
  const register = useContext(WindowKeyContext);
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    register(Option.some((event) => latest.current(event)));
    return () => register(Option.none());
  }, [register]);
};

/**
 * Wraps `child` in the registration seam. The shell owns the real window handler
 * and passes a `register` that stores what the mounted scenario installs.
 */
export const withWindowKeyProvider = (
  register: Register,
  child: ReactNode,
): ReactNode => (
  <WindowKeyContext.Provider value={register}>
    {child}
  </WindowKeyContext.Provider>
);
