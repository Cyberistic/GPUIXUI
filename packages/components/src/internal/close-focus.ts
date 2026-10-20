/**
 * Focus restoration for a non-modal overlay.
 *
 * A close request names where focus should go; the move happens only once the
 * `open -> false` transition is observed. A controlled close the caller refuses
 * therefore leaves the surface and the user's focus alone, and the next request
 * replaces the recorded intent (an outside press cannot inherit an Escape's).
 */

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * The focus a close was asked to restore, applied when the close is accepted.
 * `Focus` is the surface's own token: `"trigger"`, a direction, or a value.
 */
export const useCloseFocus = <Focus>(
  open: boolean,
  close: () => void,
  restore: (focus: Focus) => void,
): ((focus: Focus) => void) => {
  const pending = useRef<Focus | undefined>(undefined);
  const wasOpen = useRef(open);
  const closeRef = useRef(close);
  const restoreRef = useRef(restore);
  useLayoutEffect(() => {
    closeRef.current = close;
    restoreRef.current = restore;
  });

  useLayoutEffect(() => {
    if (wasOpen.current && !open && pending.current !== undefined) {
      restoreRef.current(pending.current);
    }
    if (!open) pending.current = undefined;
    wasOpen.current = open;
  }, [open]);

  return useCallback((focus: Focus) => {
    pending.current = focus;
    closeRef.current();
  }, []);
};
