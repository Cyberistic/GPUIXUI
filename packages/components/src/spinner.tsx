/** @jsxImportSource @gpuix/react */
/**
 * Spinner: an activity indicator, in shadcn's three sizes.
 *
 * The primitives own the mark — a ring of ticks whose lit arc steps around the
 * circle, the accent table and the name it announces. This component is the
 * shadcn-shaped surface over it: a `size` a page can document as `sm`/`md`/`lg`,
 * and the package's host props.
 *
 * **The mark does not rotate.** `@gpuix/native@0.11.0` publishes no
 * `transform` (see `docs/gpuix-capabilities.md`), so the arc is composed from
 * static ticks placed around the circle and the **fill** steps instead: the
 * head advances one tick per interval and the tail fades. That is the
 * reference's loader-circle anatomy without a transform. The page says so.
 */

import type { ReactElement } from "react";
import {
  Spinner as PrimitiveSpinner,
  type SpinnerProps as PrimitiveSpinnerProps,
} from "@gpuixui/primitives/spinner";

/** The three dot sizes a spinner steps through. */
export type SpinnerSize = "sm" | "md" | "lg";

/** {@link Spinner} props. */
export interface SpinnerProps extends Omit<PrimitiveSpinnerProps, "size"> {
  /** A step on the theme's icon scale. Defaults to `md`. */
  readonly size?: SpinnerSize;
}

/**
 * A ring of ticks whose lit arc steps around the circle.
 *
 * ```tsx
 * <Spinner label="Refreshing revenue" />
 * <Spinner size="sm" />
 * <Spinner size="lg" accent="muted" />
 * ```
 */
export const Spinner = ({
  size = "md",
  ...rest
}: SpinnerProps): ReactElement => <PrimitiveSpinner {...rest} size={size} />;

/** Inventory record, mirrored into `COMPONENTS.md`'s Loading indicators row. */
export const spinnerMeta = {
  name: "Loading indicators",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "Cannot rotate: 0.11.0 has no transform, so the ring is static and its lit arc steps around it",
    "No smooth movement: the arc's head advances once per interval",
    "The ring is a box and cannot sit inside a text run; put it in a Stack",
  ],
  docs: "docs/spinner.mdx",
  example: "examples/spinner.example.tsx",
  testFile: "src/behaviour/spinner.test.tsx",
} as const;
