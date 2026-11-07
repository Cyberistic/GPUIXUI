/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import {
  Spinner as PrimitiveSpinner,
  type SpinnerProps as PrimitiveSpinnerProps,
} from "@gpuixui/primitives/spinner";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends Omit<PrimitiveSpinnerProps, "size"> {
  readonly size?: SpinnerSize;
}

export const Spinner = ({
  size = "md",
  ...rest
}: SpinnerProps): ReactElement => <PrimitiveSpinner {...rest} size={size} />;

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
