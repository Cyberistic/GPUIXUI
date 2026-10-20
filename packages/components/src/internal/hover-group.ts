/**
 * A member group: one surface whose interactive descendants report their own
 * pointer crossings and their host id.
 *
 * GPUix hover is per element and does not bubble: a child control's hover
 * cancels its ancestor's `hover` refinement (playground plan 335 §1.3), and the
 * ancestor stops receiving enter/move once the pointer is over the child. A
 * row that must stay lit under a trailing control therefore needs the child to
 * report that it is hovered. The registered host id is what lets the surface
 * tell, after the fact, that a control inside it held focus when the native
 * element is gone (a native focus change runs no React `onFocus`; plan 708).
 *
 * Outside a group this hook is inert.
 */

import type { EventPayload } from "@gpuix/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

/** A surface a hovering member reports to. */
export interface HoverGroup {
  readonly enter: () => void;
  readonly leave: () => void;
  /** Register a focusable member's host id; returns its unregister. */
  readonly register: (id: number) => () => void;
}

/** Provided by a surface that tracks its own children's hover. */
export const HoverGroupContext = createContext<HoverGroup | null>(null);

/** The pointer handlers a member of {@link HoverGroupContext} must spread. */
export interface HoverGroupHandlers {
  readonly onMouseEnter?: (event: EventPayload) => void;
  readonly onMouseLeave?: (event: EventPayload) => void;
}

/**
 * Join the enclosing hover group, composing the caller's handlers and
 * registering the member's host id. Outside a group no pointer events are
 * registered and nothing is tracked. A member removed while hovered leaves the
 * group — and the registry — on unmount, so a stale id cannot outlive its host.
 */
export const useHoverGroupMember = (
  instance: number | undefined,
  onMouseEnter?: (event: EventPayload) => void,
  onMouseLeave?: (event: EventPayload) => void,
): HoverGroupHandlers => {
  const group = useContext(HoverGroupContext);
  const entered = useRef(false);

  useEffect(
    () => () => {
      if (entered.current) group?.leave();
    },
    [group],
  );

  useLayoutEffect(() => {
    if (group === null || instance === undefined) return;
    return group.register(instance);
  }, [group, instance]);

  if (group === null) {
    // Outside a group the caller's handlers must still reach the element.
    return { onMouseEnter, onMouseLeave };
  }

  return {
    onMouseEnter: (event) => {
      entered.current = true;
      group.enter();
      onMouseEnter?.(event);
    },
    onMouseLeave: (event) => {
      if (entered.current) {
        entered.current = false;
        group.leave();
      }
      onMouseLeave?.(event);
    },
  };
};
