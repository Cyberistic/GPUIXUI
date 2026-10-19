/**
 * Bridges GPUix's window-level selection handler to a mounted view.
 *
 * GPUix delivers text-selection changes only through the root options
 * (`render(<App/>, { onSelectionChange })`), exactly like window keys
 * (`../window-key.tsx`). The runner is the app that owns the handler; a view
 * registers for it through `useSelectionChange` and gets the newly selected
 * text on every change. This is the signal a copy affordance needs: it fires
 * when a drag or a clear changes the selection, with the selected text as the
 * payload's `value` (absent when the selection is empty).
 *
 * The `useEffect` is a React lifecycle registration for a native handler, not
 * shared state, so it is not an Effect Atom concern.
 */
import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import * as Option from "effect/Option";

/** Called with the selected text on every window selection change. */
export type SelectionHandler = (text: string) => void;

/** The seam's registered handler: it receives the raw native event. */
export type SelectionEvent = (event: EventPayload) => void;

/** The payload's selection text; an empty selection has no `value`. */
export const selectionText = (event: EventPayload): string =>
  Option.getOrElse(Option.fromNullishOr(event.value), () => "");

type Register = (handler: Option.Option<SelectionEvent>) => void;

const SelectionContext = createContext<Register>(() => {});

/** Registers `handler` for window selection changes while mounted. */
export const useSelectionChange = (handler: SelectionHandler): void => {
  const register = useContext(SelectionContext);
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    register(Option.some((event) => latest.current(selectionText(event))));
    return () => register(Option.none());
  }, [register]);
};

/** Wraps `child` in the registration seam the runner provides. */
export const withSelectionProvider = (
  register: Register,
  child: ReactNode,
): ReactNode => (
  <SelectionContext.Provider value={register}>
    {child}
  </SelectionContext.Provider>
);
