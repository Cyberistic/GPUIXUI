/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import {
  Separator as PrimitiveSeparator,
  type SeparatorProps as PrimitiveSeparatorProps,
} from "@gpuixui/primitives/separator";

export interface SeparatorProps extends Omit<
  PrimitiveSeparatorProps,
  "orientation"
> {
  readonly orientation?: "horizontal" | "vertical";

  readonly decorative?: boolean;

  readonly "aria-id"?: string;
}

const roleFrame = (vertical: boolean): StyleDesc => ({
  display: "flex",
  flexDirection: vertical ? "row" : "column",
  flexShrink: 0,
  alignSelf: "stretch",
  ...(vertical ? {} : { width: "100%" }),
});

export const Separator = ({
  orientation,
  decorative = false,
  "aria-id": controlId,
  ...rest
}: SeparatorProps) =>
  decorative ? (
    <PrimitiveSeparator {...rest} orientation={orientation ?? "horizontal"} />
  ) : (
    <div
      role="separator"
      aria-id={controlId}
      style={roleFrame(orientation === "vertical")}
    >
      <PrimitiveSeparator {...rest} orientation={orientation ?? "horizontal"} />
    </div>
  );

export const separatorMeta = {
  name: "Separators",
  tier: 1,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "A filled 1px rule, not a border: `borderStyle` does not apply, so there is no dashed or dotted divider (compose a `Box` for one)",
    "The platform maps the separator role to `Splitter` and publishes no `aria-orientation`",
    "No draggable splitter and no resize event",
  ],
  docs: "docs/separator.mdx",
  example: "examples/separator.example.tsx",
  testFile: "src/behaviour/separator.test.tsx",
} as const;
