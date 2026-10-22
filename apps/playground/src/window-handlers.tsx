/**
 * The app-level window handlers GPUix only exposes on the root.
 *
 * `render(<App/>, { onKeyDown, onSelectionChange })` is the only route to a
 * window-level key or text-selection event: the runtime publishes no
 * per-component hook, and the runner is the "app" that owns the root. These two
 * seams are the bridge — the runner stores what the mounted probe registers, and
 * a probe reads the event while it is mounted. A key opens a command palette
 * from any focus; a selection change is how a toolbar learns the reader picked
 * a run in a log, a table or an editor.
 *
 * The registration is a React lifecycle effect for a native handler, not shared
 * state, so it is not an Effect Atom concern.
 */
import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import * as Option from "effect/Option";

/** One app-level window handler: the event the root received. */
export type WindowHandler = (event: EventPayload) => void;

/** Called for a key that reached the window (after element `onKeyDown`). */
export type WindowKeyHandler = WindowHandler;

/** Called when the window's selected ranges change. */
export type WindowSelectionHandler = WindowHandler;

/** What a probe hands the runner for one window event; `None` while unmounted. */
export type WindowHandlerRegister = (
  handler: Option.Option<WindowHandler>,
) => void;

/**
 * One registration seam: a context the runner provides and a hook that keeps the
 * latest handler without re-registering on every render.
 */
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

/** Registers `handler` for app-level window keys while the component is mounted. */
export const useWindowKey = keys.use;

/** Wraps `child` in the key registration seam. */
export const withWindowKeyProvider = keys.provider;

/** Registers `handler` for the window's selection changes while mounted. */
export const useWindowSelection = selection.use;

/** Wraps `child` in the selection registration seam. */
export const withWindowSelectionProvider = selection.provider;
