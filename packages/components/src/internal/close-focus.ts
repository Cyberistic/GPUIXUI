/**
 * Focus restoration for a non-modal overlay.
 *
 * A close request names where focus should go; the move happens only once the
 * `open -> false` transition is observed. A controlled close the caller refuses
 * therefore leaves the surface and the user's focus alone, and the next request
 * replaces the recorded intent (an outside press cannot inherit an Escape's).
 *
 * A close can also be the app's, not a request: the caller sets `open` false
 * while one of the surface's own controls holds focus. Its control leaves with
 * the surface, so the surface names its trigger as that control's **focus
 * successor** (plans 826/827/830) and hands the trigger the keyboard when the
 * close left nothing else focused. A close that already decided where focus
 * goes — an Escape, a `Tab` walk, an outside press, a modal opened from the
 * control — keeps its own rule, so the hand-off is only for an unrequested
 * close (plan 832).
 */

import {
  useGpuix,
  type NativeRenderer,
  type PublicInstance,
} from "@gpuix/react";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { markFocusSuccessor } from "./focus-successor.js";
import { focusedWithin } from "./pointer.js";

/** Where a surface's keyboard goes when it closes. */
export interface CloseHandOff {
  /** The surface the close takes away; its box names the leaving control. */
  readonly surface: RefObject<PublicInstance | null>;
  /** The trigger's host id, or `null` when it is gone. */
  readonly target: () => number | null;
  /** Hand the trigger the keyboard when an app-driven close removed its control. */
  readonly focus: boolean;
}

/**
 * The control this close is taking away, captured on the closing render.
 *
 * Effects run after the commit removed the control, so its host cannot be read
 * then (plan 708); the closing render still reports the previous commit's tree,
 * which is the only moment the id and the surface's box both exist. Writing the
 * ref during render is the measured exception `NavigationMenu` already makes for
 * its open mirror: nothing else can name a host that is about to disappear.
 */
export const useLeavingControl = (
  open: boolean,
  surface: RefObject<PublicInstance | null>,
): Option.Option<number> => {
  const renderer = useGpuix().renderer;
  const leaving = useRef<Option.Option<number>>(Option.none());
  const wasOpen = useRef(open);
  if (open) {
    leaving.current = Option.none();
  } else if (wasOpen.current) {
    leaving.current = focusedWithin(renderer, surface.current?.id);
  }
  wasOpen.current = open;
  return leaving.current;
};

/**
 * Name `target` as the successor of the control the close takes away, and hand
 * it the keyboard when the close left nothing else focused.
 *
 * `focus` is the caller's decision — only an unrequested close passes `true` —
 * and the containment test is the guard: a close that moved focus outside the
 * surface, or that a modal opened in the same commit claimed, is left alone.
 */
export const handOffClose = (
  renderer: NativeRenderer | null,
  leaving: Option.Option<number>,
  surface: RefObject<PublicInstance | null>,
  targetId: number | null,
  focus: boolean,
): void => {
  if (targetId === null || renderer?.getElementBounds?.(targetId) === null) {
    return;
  }
  Option.match(leaving, {
    onNone: () => undefined,
    onSome: (control) => {
      markFocusSuccessor(control, targetId);
      if (!focus) return;
      const focused = renderer?.getFocusedElementId?.() ?? null;
      const taken =
        focused === null ||
        focused === control ||
        Option.isSome(focusedWithin(renderer, surface.current?.id));
      if (taken) renderer?.focusElement?.(targetId);
    },
  });
};

/**
 * The focus a close was asked to restore, applied when the close is accepted.
 * `Focus` is the surface's own token: `"trigger"`, a direction, or a value.
 */
export const useCloseFocus = <Focus>({
  open,
  close,
  restore,
  handOff,
}: {
  readonly open: boolean;
  readonly close: () => void;
  readonly restore: (focus: Focus) => void;
  readonly handOff: CloseHandOff;
}): ((focus: Focus) => void) => {
  const renderer = useGpuix().renderer;
  const leaving = useLeavingControl(open, handOff.surface);
  const pending = useRef<Focus | undefined>(undefined);
  const wasOpen = useRef(open);
  const closeRef = useRef(close);
  const restoreRef = useRef(restore);
  useLayoutEffect(() => {
    closeRef.current = close;
    restoreRef.current = restore;
  });

  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
      handOffClose(
        renderer,
        leaving,
        handOff.surface,
        handOff.target(),
        handOff.focus && pending.current === undefined,
      );
      if (pending.current !== undefined) {
        restoreRef.current(pending.current);
      }
    }
    if (!open) pending.current = undefined;
    wasOpen.current = open;
  }, [handOff, leaving, open, renderer]);

  return useCallback((focus: Focus) => {
    pending.current = focus;
    closeRef.current();
  }, []);
};
