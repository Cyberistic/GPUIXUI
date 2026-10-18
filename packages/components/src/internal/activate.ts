/**
 * Keyboard activation for a control that draws as a button.
 *
 * Enter fires on key down; Space fires on key **up**, so a user can move focus
 * away before releasing it, and a held key never activates twice. The action is
 * the control's synthetic click, and it runs before the caller's key handler:
 * a trigger may derive its key behaviour from the state that click just
 * produced (`DropdownMenuTrigger` records the row a keyboard open lands on).
 * The caller's handler always runs, once per keystroke.
 *
 * A composite row or cell does not use this helper: Space is a selection key
 * there, and `internal/key.ts`'s `isActivation` keeps it on key down.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { isEnter, isSpaceRelease } from "./key.js";

/** The control's own state and handlers, all optional. */
export interface ActivationTarget {
  /** Muted: the handlers still forward, but nothing activates. */
  readonly disabled?: boolean;
  readonly onKeyDown?: Props["onKeyDown"];
  readonly onKeyUp?: Props["onKeyUp"];
}

/**
 * The `onKeyDown`/`onKeyUp` pair that activates `activate` exactly once per
 * keystroke, with the caller's handlers composed after the action.
 */
export const activationHandlers = (
  activate: (event: EventPayload) => void,
  { disabled = false, onKeyDown, onKeyUp }: ActivationTarget = {},
): Pick<Props, "onKeyDown" | "onKeyUp"> =>
  disabled
    ? { onKeyDown, onKeyUp }
    : {
        onKeyDown: (event: EventPayload) => {
          if (isEnter(event)) activate(event);
          onKeyDown?.(event);
        },
        onKeyUp: (event: EventPayload) => {
          if (isSpaceRelease(event)) activate(event);
          onKeyUp?.(event);
        },
      };
