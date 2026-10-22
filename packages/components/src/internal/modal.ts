/**
 * The rules every modal surface shares: open state, the dismiss layer, focus in
 * and back, and the Tab trap.
 *
 * Dialog and Drawer differ in where their surface sits, not in how it behaves, so
 * these three pieces live once. Each caller keeps its own PART tree (the
 * compound-part contract), and this module imports no component.
 */

import type { KeyEvent } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { Match } from "effect";
import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { useControllableState } from "./controllable.js";
import { useDismissDepth } from "./dismiss-scope.js";
import { dismissTopLayer, pushDismissLayer } from "./dismiss-layer.js";
import { isDismiss, isTab } from "./key.js";

/** The open state a modal exposes to its parts. */
export interface ModalState {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /**
   * Where focus goes when the surface closes: the element that held it before
   * the surface opened.
   *
   * A surface takes focus during its own commit — a child's `autoFocus` runs
   * before any layout effect — so this is captured in the render that opens the
   * surface, before its children exist. Capturing it at close would name a
   * control inside the surface that is about to unmount, and the reader's focus
   * would end up nowhere.
   */
  readonly restoreTarget: MutableRefObject<number | null>;
}

/** The open state and the dismiss layer it owns while open. */
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
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const restoreTarget = useRef<number | null>(null);
  const captured = useRef(false);
  if (open && !captured.current) {
    restoreTarget.current = renderer?.getFocusedElementId?.() ?? null;
    captured.current = true;
  } else if (!open) {
    captured.current = false;
  }

  // The layer handler must see the latest props without being re-pushed: a
  // re-push would move this surface above an overlay that opened after it.
  const dismiss = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    dismiss.current = () => {
      if (dismissible) setOpen(false);
    };
  });

  const depth = useDismissDepth();
  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(() => dismiss.current(), depth);
  }, [depth, open]);

  return { open, setOpen, restoreTarget };
};

/**
 * Move focus into `contentId` once it exists, run the caller's `initialFocus`
 * after that, and return focus to {@link ModalState.restoreTarget} at close.
 *
 * `open` is the close signal, not the content id: a surface stays mounted for
 * its exit tween (see `internal/presence.tsx`), and focus must leave the moment
 * the reader dismisses it rather than a duration later.
 */
export const useModalFocus = (
  contentId: number | undefined,
  initialFocus: (() => number | null) | undefined,
  open: boolean,
  restoreTarget: MutableRefObject<number | null>,
): void => {
  const renderer = useGpuix().renderer;
  const initialFocusRef = useRef(initialFocus);
  useLayoutEffect(() => {
    initialFocusRef.current = initialFocus;
  });

  useLayoutEffect(() => {
    if (contentId === undefined || !open) return;
    renderer?.focusElement?.(contentId);
    const initial = initialFocusRef.current?.() ?? null;
    if (initial !== null && initial !== contentId) {
      renderer?.focusElement?.(initial);
    }
    return () => {
      const previous = restoreTarget.current;
      // A destroyed opener must not be focused: `getElementBounds` is the
      // renderer's own existence check, and it is null once the element is gone.
      if (
        previous === null ||
        previous === contentId ||
        renderer?.getElementBounds?.(previous) === null
      ) {
        return;
      }
      renderer?.focusElement?.(previous);
    };
  }, [contentId, renderer, open, restoreTarget]);
};

/**
 * Escape closes the topmost overlay; Tab wraps inside the surface. `onKeyDown`
 * runs last, so a caller observes every key after the modal rules.
 */
export const handleModalKeyDown = ({
  event,
  contentId,
  renderer,
  onKeyDown,
}: {
  readonly event: KeyEvent;
  readonly contentId: number | undefined;
  readonly renderer:
    | {
        focusNextWithin?: (id: number) => void;
        focusPreviousWithin?: (id: number) => void;
      }
    | undefined;
  readonly onKeyDown?: (event: KeyEvent) => void;
}): void => {
  Match.value(event).pipe(
    Match.when(isDismiss, (value) => {
      dismissTopLayer(value);
    }),
    Match.when(isTab, () => {
      // 0.11.0 moves focus on Tab by default; the modal traps instead, so the
      // default move is cancelled and the wrap is driven by `focusNextWithin`.
      event.preventDefault();
      if (event.modifiers?.shift === true) {
        renderer?.focusPreviousWithin?.(contentId ?? -1);
      } else {
        renderer?.focusNextWithin?.(contentId ?? -1);
      }
    }),
    Match.orElse(() => undefined),
  );
  onKeyDown?.(event);
};
