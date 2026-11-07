import type { KeyEvent } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { Match } from "effect";
import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { useControllableState } from "./controllable.js";
import { useDismissDepth } from "./dismiss-scope.js";
import { dismissTopLayer, pushDismissLayer } from "./dismiss-layer.js";
import { isDismiss, isTab } from "./key.js";

export interface ModalState {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;

  readonly restoreTarget: MutableRefObject<number | null>;
}

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
