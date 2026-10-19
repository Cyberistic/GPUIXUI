/**
 * Native focus, for a runtime that moves it but never reports it.
 *
 * Plan `583` measured the pinned `@gpuix/native@0.10.0` release build: focus
 * moves (`getFocusedElementId()` returns the focused host id) and key events
 * arrive, but **no `onFocus`/`onBlur`** is dispatched to a component. Every
 * control paints its focus ring from those events, so on the runtime a
 * consumer installs, no control could paint one.
 *
 * The renderer exposes the truth synchronously; this provider samples it and
 * publishes the focused host id through context. Controls compare it with the
 * id of the element that actually holds focus (`useFocus`). The event state
 * stays the primary path — it is immediate on a runtime that dispatches events
 * — and the tracked id is an additional source, never a replacement.
 *
 * The cost is explicit: one renderer query per window every
 * `NATIVE_FOCUS_POLL_MS`, and up to that much ring latency on a runtime with no
 * focus events. A provider is mounted by `ThemeProvider`, so a package
 * component always has one; an element-tree render without a provider sees
 * `undefined` and keeps the event-only behaviour.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";

/** How often the provider asks the renderer which host holds focus. */
export const NATIVE_FOCUS_POLL_MS = 50;

/**
 * What the provider has learned from the renderer.
 *
 * `sampled` is the difference between "nothing is focused" and "the provider has
 * not asked yet": a control that mounts focused must not lose its seeded state
 * before the first sample, while a sample that reports another host (or none)
 * must be able to clear it (plan `591`).
 */
export interface NativeFocusSnapshot {
  readonly sampled: boolean;
  /** The focused host id, or `None` when nothing is focused. */
  readonly focused: Option.Option<number>;
}

/** `undefined` means there is no provider above this control. */
const NativeFocusContext = createContext<NativeFocusSnapshot | undefined>(
  undefined,
);

/** The provider's latest sample, or `undefined` when no provider is mounted. */
export const useNativeFocus = (): NativeFocusSnapshot | undefined =>
  useContext(NativeFocusContext);

/** The focused host id, or `undefined` when no provider is mounted. */
export const useNativeFocusId = (): Option.Option<number> | undefined => {
  const sample = useNativeFocus();
  return sample === undefined ? undefined : sample.focused;
};

/**
 * Whether `hostId` is the element the runtime reports as focused.
 *
 * A missing provider, a missing host ref and a missing focused id all read as
 * "not focused", so the caller can keep its event state as the only source.
 */
export const isTrackedFocus = (
  tracked: Option.Option<number> | undefined,
  hostId: number | undefined,
): boolean =>
  hostId !== undefined &&
  tracked !== undefined &&
  Option.exists(tracked, (id) => id === hostId);

/** Sample the renderer's focused host id and publish it to its subtree. */
export const NativeFocusProvider = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => {
  const { renderer } = useGpuix();
  const [sample, setSample] = useState<NativeFocusSnapshot>({
    sampled: false,
    focused: Option.none(),
  });

  const read = useCallback(() => {
    const next = Option.fromNullishOr(renderer?.getFocusedElementId?.());
    setSample((current) =>
      current.sampled &&
      Option.getOrUndefined(current.focused) === Option.getOrUndefined(next)
        ? current
        : { sampled: true, focused: next },
    );
  }, [renderer]);

  useEffect(() => {
    read();
    const timer = setInterval(read, NATIVE_FOCUS_POLL_MS);
    return () => clearInterval(timer);
  }, [read]);

  return (
    <NativeFocusContext.Provider value={sample}>
      {children}
    </NativeFocusContext.Provider>
  );
};
