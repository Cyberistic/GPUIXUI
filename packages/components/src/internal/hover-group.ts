/**
 * A hover group: one surface whose interactive descendants report their own
 * pointer crossings.
 *
 * GPUix hover is per element and does not bubble: a child control's hover
 * cancels its ancestor's `hover` refinement (playground plan 335 §1.3), and the
 * ancestor stops receiving enter/move once the pointer is over the child. A
 * row that must stay lit under a trailing control therefore needs the child to
 * report that it is hovered. Outside a group this hook is inert.
 */

import type { EventPayload } from "@gpuix/react";
import { createContext, useContext, useEffect, useRef } from "react";

/** A surface a hovering member reports to. */
export interface HoverGroup {
  readonly enter: () => void;
  readonly leave: () => void;
}

/** Provided by a surface that tracks its own children's hover. */
export const HoverGroupContext = createContext<HoverGroup | null>(null);

/** The pointer handlers a member of {@link HoverGroupContext} must spread. */
export interface HoverGroupHandlers {
  readonly onMouseEnter?: (event: EventPayload) => void;
  readonly onMouseLeave?: (event: EventPayload) => void;
}

/**
 * Join the enclosing hover group, composing the caller's handlers. Outside a
 * group no pointer events are registered. A member removed while hovered
 * leaves the group on unmount, so a stale count cannot keep the surface lit.
 */
export const useHoverGroupMember = (
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
