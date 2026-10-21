/**
 * The measured height reveal shared by Collapsible and Accordion.
 *
 * The runtime has no layout callback, so this reads the content's natural height
 * from `renderer.getElementBounds` after commit and tweens the body between `0`
 * and that number. Two measured facts shape the contract (plan 372 §2):
 *
 * - the `overflow: "hidden"` clip refuses the pointer but a clipped subtree
 *   **stays in the tab order**, so closed content is hidden with `visibility`;
 * - hidden content reports `null` bounds, so the height is measured while the
 *   content is visible and the last value is kept in state.
 *
 * `motion.div` has no `testId`, `role` or `aria-*` in 0.10.0, so the caller's
 * props belong to the inner plain div; the animated box carries the derived
 * `<testId>-surface` id through the typed wrapper (plan 597), so a suite can
 * measure the tween itself while the content box stays the natural height.
 *
 * Hiding a body does not move focus out of it, and 0.10.0 reports no
 * focus-within signal, so a close that starts with focus inside the body would
 * strand it on an invisible control. The body's own bounds are the one signal
 * the renderer gives (plan 386): the focused element's centre inside those
 * bounds means the close took the user's focus away, and `restoreFocus` puts it
 * back on the trigger.
 */

import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { MotionSurface } from "./motion.js";
import { focusedWithin } from "./pointer.js";
import { useMergedRef } from "./ref.js";

// TODO: take this from `@gpuixui/tokens`' motion scale once plan 019 lands.
const REVEAL_SECONDS = 0.2;

/** {@link Reveal} props. */
export interface RevealProps extends Props {
  /** Whether the section is open. */
  readonly open: boolean;
  /** Tween to the measured height; `false` snaps. Default `true`. */
  readonly animate?: boolean;
  /** Called when a close starts while focus is inside the body. */
  readonly restoreFocus?: () => void;
}

/** A body that stays mounted and reveals its measured height. */
export const Reveal = ({
  open,
  animate = true,
  restoreFocus,
  style,
  children,
  ref,
  ...rest
}: RevealProps) => {
  const renderer = useGpuix().renderer;
  const [instance, setInstance] = useState<Option.Option<PublicInstance>>(
    Option.none(),
  );
  const [measured, setMeasured] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [settled, setSettled] = useState(!open);
  const wasOpen = useRef(open);

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(Option.fromNullishOr(next));
  }, []);
  const setElement = useMergedRef(attach, ref);

  useLayoutEffect(() => {
    Option.match(
      Option.flatMap(instance, (element) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
      ),
      {
        onNone: () => undefined,
        onSome: (bounds) =>
          setMeasured((current) =>
            Option.contains(current, bounds.height)
              ? current
              : Option.some(bounds.height),
          ),
      },
    );
  });

  useLayoutEffect(() => {
    if (open) setSettled(false);
  }, [open]);

  useLayoutEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing) return;
    Option.match(instance, {
      onNone: () => undefined,
      onSome: (element) => {
        if (Option.isSome(focusedWithin(renderer, element.id)))
          restoreFocus?.();
      },
    });
    // Snapping keeps the body measurable for this commit, then hides it.
    if (!animate) setSettled(true);
  }, [animate, instance, open, renderer, restoreFocus]);

  const height = Option.getOrElse(measured, () => 0);
  const hidden = !open && Option.isSome(measured) && settled;
  const surfaceTestId =
    rest.testId === undefined ? undefined : `${rest.testId}-surface`;

  return (
    <MotionSurface
      testId={surfaceTestId}
      initial={false}
      animate={{ height: open ? height : 0 }}
      transition={{ duration: animate ? REVEAL_SECONDS : 0, ease: "linear" }}
      onMotionComplete={() => {
        if (!open) setSettled(true);
      }}
      style={{ overflow: "hidden", width: "100%" }}
    >
      <div
        {...rest}
        ref={setElement}
        style={mergeStyles(
          style,
          hidden ? { visibility: "hidden" } : undefined,
        )}
      >
        {children}
      </div>
    </MotionSurface>
  );
};
