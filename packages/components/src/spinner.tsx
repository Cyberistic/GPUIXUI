/** @jsxImportSource @gpuix/react */
/**
 * Spinner: an activity indicator, in shadcn's three sizes.
 *
 * The primitives own the mark — three dots whose lit position advances, the
 * accent table and the name it announces. This component is the shadcn-shaped
 * surface over it: a `size` a page can document as `sm`/`md`/`lg`, and the
 * package's host props.
 *
 * **The mark does not rotate.** `@gpuix/native@0.11.0` publishes no
 * `transform` (see `docs/gpuix-capabilities.md`), so a spinning arc is not a
 * behaviour this library can paint. The honest alternative is the one the
 * primitives already ship: one dot lights per step and its trail fades, which
 * reads as travel because the eye follows the lit position. The page says so.
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
 * A three-dot activity indicator.
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
    "Cannot rotate: 0.11.0 has no transform, so the mark is three dots with a travelling lit step",
    "No smooth movement: the lit position advances once per interval",
    "Every dot shares one size, and a spinner cannot sit inside a text run; put it in a Stack",
  ],
  docs: "docs/spinner.mdx",
  example: "examples/spinner.example.tsx",
  testFile: "src/behaviour/spinner.test.tsx",
} as const;
