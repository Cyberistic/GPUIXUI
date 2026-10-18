/**
 * The hover-travel rule shared by `PreviewCard`, `NavigationMenu` and the menu
 * submenus.
 *
 * The runtime delivers the incoming surface's `mouseEnter` before the outgoing
 * surface's `mouseLeave`, so a leave must not close while the other surface
 * already holds the pointer. A pointer may also cross the `sideOffset` gap
 * between a trigger and its panel; `closeDelay` is what makes that travel safe.
 *
 * The policy only decides **when**; the consumer owns the open state and the
 * meaning of "open" (a boolean for a card, a selected item for a nav). Options
 * are read through a ref so a timer never calls a stale close.
 */

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

/** Which of the two surfaces a pointer is on. */
export type HoverSurface = "trigger" | "content";

/** What the policy needs from the consumer. */
export interface HoverTravelOptions {
  /** Whether the surface is open now, read when a close timer would fire. */
  readonly isOpen: () => boolean;
  /** Close the surface. Called only when `isOpen()` is true. */
  readonly close: () => void;
  /** Milliseconds between entering a trigger and opening. */
  readonly openDelay: number;
  /** Milliseconds after leaving both surfaces before closing. */
  readonly closeDelay: number;
}

/** The pointer policy a hoverable surface follows. */
export interface HoverTravel {
  /**
   * The pointer entered a surface. Pass `open` on the trigger; enter the
   * content without it, because a panel that is already open must not schedule
   * another open. `key` identifies the concrete surface (a nav item's value);
   * a leave only clears the key it left, so entering the next trigger is not
   * undone by the previous trigger's leave.
   */
  readonly enter: (
    surface: HoverSurface,
    open?: () => void,
    key?: string,
  ) => void;
  /** The pointer left a surface; closes after `closeDelay` once both are out. */
  readonly leave: (surface: HoverSurface, key?: string) => void;
  /** Drop pending timers without changing which surfaces hold the pointer. */
  readonly cancel: () => void;
  /**
   * Drop timers and forget a surface whose key changed (its panel unmounted
   * without a `mouseLeave`). No argument forgets both surfaces.
   */
  readonly reset: (surface?: HoverSurface) => void;
}

/** A timer handle, independent of the DOM/Node typings. */
type Timer = ReturnType<typeof setTimeout>;

/** {@link HoverTravel} over `setTimeout`; one instance per hoverable surface. */
export const useHoverTravel = (options: HoverTravelOptions): HoverTravel => {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  const openTimer = useRef<Timer | undefined>(undefined);
  const closeTimer = useRef<Timer | undefined>(undefined);
  // Which concrete surface holds the pointer, not merely "a trigger does": the
  // runtime delivers the next trigger's enter before the previous leave.
  const inside = useRef<{ trigger: string | null; content: string | null }>({
    trigger: null,
    content: null,
  });

  const cancel = useCallback(() => {
    if (openTimer.current !== undefined) {
      clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  useLayoutEffect(() => cancel, [cancel]);

  const enter = useCallback(
    (surface: HoverSurface, open?: () => void, key: string = surface) => {
      inside.current = { ...inside.current, [surface]: key };
      cancel();
      if (open === undefined) return;
      if (latest.current.openDelay <= 0) {
        open();
        return;
      }
      openTimer.current = setTimeout(open, latest.current.openDelay);
    },
    [cancel],
  );

  const leave = useCallback(
    (surface: HoverSurface, key: string = surface) => {
      // A stale leave (the pointer already entered another key) must not cancel
      // the newer surface's pending open or schedule a close for it.
      if (inside.current[surface] !== key) return;
      inside.current = { ...inside.current, [surface]: null };
      cancel();
      if (inside.current.trigger !== null || inside.current.content !== null)
        return;
      const { close, closeDelay, isOpen } = latest.current;
      if (!isOpen()) return;
      if (closeDelay <= 0) {
        close();
        return;
      }
      // `close` is captured now, not read at fire time: a consumer can make it
      // identity-aware so a panel opened by a key during the delay survives.
      closeTimer.current = setTimeout(() => {
        closeTimer.current = undefined;
        close();
      }, closeDelay);
    },
    [cancel],
  );

  const reset = useCallback(
    (surface?: HoverSurface) => {
      cancel();
      inside.current =
        surface === undefined
          ? { trigger: null, content: null }
          : { ...inside.current, [surface]: null };
    },
    [cancel],
  );

  return useMemo(
    () => ({ enter, leave, cancel, reset }),
    [cancel, enter, leave, reset],
  );
};
