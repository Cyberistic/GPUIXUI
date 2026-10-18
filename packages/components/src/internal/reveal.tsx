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
 * props belong to the inner plain div and a suite reads the body through a
 * following sibling.
 */

import {
  motion,
  useGpuix,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useState } from "react";
import { useMergedRef } from "./ref.js";

// TODO: take this from `@gpuixui/tokens`' motion scale once plan 019 lands.
const REVEAL_SECONDS = 0.2;

/** {@link Reveal} props. */
export interface RevealProps extends Props {
  /** Whether the section is open. */
  readonly open: boolean;
  /** Tween to the measured height; `false` snaps. Default `true`. */
  readonly animate?: boolean;
}

/** A body that stays mounted and reveals its measured height. */
export const Reveal = ({
  open,
  animate = true,
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

  const height = Option.getOrElse(measured, () => 0);
  const hidden = !open && Option.isSome(measured) && (settled || !animate);

  return (
    <motion.div
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
    </motion.div>
  );
};
