/**
 * The rules every modal surface shares: open state, the dismiss layer, focus in
 * and back, and the Tab trap.
 *
 * Dialog and Drawer differ in where their surface sits, not in how it behaves, so
 * these three pieces live once. Each caller keeps its own PART tree (the
 * compound-part contract), and this module imports no component.
 *
 * Layer order and focus entry follow the tree's nesting, not the order React
 * runs effects in (plan 730): the modal host context supplies the depth, so a
 * confirmation mounted with its dialog is still the top layer and the one that
 * holds focus.
 */

import type { EventPayload } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { Match } from "effect";
import { useLayoutEffect, useRef, useState } from "react";
import { useControllableState } from "./controllable.js";
import {
  dismissTopLayer,
  hasDeeperLayer,
  pushDismissLayer,
} from "./dismiss-layer.js";
import { claimEvent, isEventClaimed } from "./event-claim.js";
import { isDismiss, isTab } from "./key.js";
import { useModalHost, type ModalHost } from "./modal-host.js";

/** The open state a modal exposes to its parts. */
export interface ModalState {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** How deeply the modal is nested in other modal surfaces; its layer depth. */
  readonly depth: number;
}

/** The open state, its layer depth and the dismiss layer it owns while open. */
export const useModalState = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
}: {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly dismissible?: boolean;
}): ModalState => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const depth = useModalHost().depth + 1;

  // The layer handler must see the latest props without being re-pushed: a
  // re-push would move this surface above an overlay that opened after it.
  const dismiss = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    dismiss.current = () => {
      if (dismissible) setOpen(false);
    };
  });

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(() => dismiss.current(), depth);
  }, [open, depth]);

  return { depth, open, setOpen };
};

/**
 * Move focus into `contentId` once it exists, run the caller's `initialFocus`
 * after that, and return focus to whatever held it before on unmount.
 *
 * A modal only enters when no deeper modal is open: the enclosing dialog's
 * effect runs last, and must not take focus from the surface painted above it.
 * A close with no live opener returns focus to the enclosing surface.
 */
export const useModalFocus = (
  contentId: number | undefined,
  initialFocus: (() => number | null) | undefined,
): void => {
  const renderer = useGpuix().renderer;
  // The surface mounts in the same commit that opens the modal, before the
  // renderer applies any native focus change — including a child's `autoFocus`.
  // Capture the opener at render time; the effect below waits for `contentId`,
  // by which point that focus has already moved (plan 638).
  const [previousFocus] = useState<number | null>(
    () => renderer?.getFocusedElementId?.() ?? null,
  );
  const host = useModalHost();
  const hostRef = useRef<ModalHost>(host);
  useLayoutEffect(() => {
    hostRef.current = host;
  });
  const initialFocusRef = useRef(initialFocus);
  useLayoutEffect(() => {
    initialFocusRef.current = initialFocus;
  });

  useLayoutEffect(() => {
    if (contentId === undefined) return;
    if (hasDeeperLayer(host.depth)) return;
    renderer?.focusElement?.(contentId);
    const initial = initialFocusRef.current?.() ?? null;
    if (initial !== null && initial !== contentId) {
      renderer?.focusElement?.(initial);
    }
    return () => {
      // A destroyed opener must not be focused: `getElementBounds` is the
      // renderer's own existence check, and it is null once the element is gone.
      // A confirmation mounted with its dialog has no opener at all, so it hands
      // focus to the enclosing surface rather than to nothing (plan 730).
      const usable =
        previousFocus !== null &&
        previousFocus !== contentId &&
        renderer?.getElementBounds?.(previousFocus) !== null;
      const target = usable ? previousFocus : hostRef.current.contentId;
      if (target === null || target === undefined || target === contentId) {
        return;
      }
      renderer?.focusElement?.(target);
    };
  }, [contentId, host.depth, previousFocus, renderer]);
};

/**
 * Escape closes the topmost overlay. Tab wraps inside the surface and claims
 * the press, so a nested modal's trap is the one that acts on it and an
 * enclosing modal yields — the rule plan 719 established for a popover's own
 * Tab walk. `onKeyDown` runs last, so a caller observes every key after the
 * modal rules.
 */
export const handleModalKeyDown = ({
  event,
  contentId,
  renderer,
  onKeyDown,
}: {
  readonly event: EventPayload;
  readonly contentId: number | undefined;
  readonly renderer:
    | {
        focusNextWithin?: (id: number) => void;
        focusPreviousWithin?: (id: number) => void;
      }
    | undefined;
  readonly onKeyDown?: (event: EventPayload) => void;
}): void => {
  if (!isEventClaimed(event)) {
    Match.value(event).pipe(
      Match.when(isDismiss, (value) => {
        dismissTopLayer(value);
      }),
      Match.when(isTab, (value) => {
        if (value.modifiers?.shift === true) {
          renderer?.focusPreviousWithin?.(contentId ?? -1);
        } else {
          renderer?.focusNextWithin?.(contentId ?? -1);
        }
        claimEvent(value);
      }),
      Match.orElse(() => undefined),
    );
  }
  onKeyDown?.(event);
};
