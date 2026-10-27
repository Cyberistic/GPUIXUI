/** @jsxImportSource @gpuix/react */
/**
 * Separator: a rule between regions, decorative or announced.
 *
 * The primitives paint the rule — one filled 1px line on the theme's `border`
 * role, horizontal or vertical, with an optional inset and a centred caption.
 * This component adds shadcn's `decorative` decision, which is the one thing a
 * painted rule cannot state by itself: a decorative rule is part of the drawing
 * and stays out of the accessibility tree, while a semantic rule is a
 * `separator` node a reader can find between two regions.
 *
 * The role lives on a wrapper because the primitive paints a plain `div` with
 * no role, and 0.11.0 puts a node in the tree only when it has one. A semantic
 * rule therefore paints the rule inside a wrapper that carries the role; a
 * decorative one paints the rule alone. The wrapper stretches on the axis the
 * rule needs — a horizontal rule fills its column's width, a vertical rule its
 * row's height — the box `shadcn`'s `w-full`/`self-stretch` names.
 *
 * **The platform calls this role `Splitter`**, the role of a draggable divider
 * (`docs/gpuix-capabilities.md`), and 0.11.0 publishes no `aria-orientation`:
 * a reader is told there is a separator, not which way it runs.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  Separator as PrimitiveSeparator,
  type SeparatorProps as PrimitiveSeparatorProps,
} from "@gpuixui/primitives/separator";

/** {@link Separator} props. */
export interface SeparatorProps extends Omit<
  PrimitiveSeparatorProps,
  "orientation"
> {
  /** Which way the rule runs. Defaults to `horizontal`. */
  readonly orientation?: "horizontal" | "vertical";
  /**
   * Leave the rule out of the accessibility tree. Defaults to `false`: a rule
   * that separates two regions is a `separator` node unless the caller says it
   * is only a drawing.
   */
  readonly decorative?: boolean;
  /** Addresses the rule's accessibility node; ignored by a decorative rule. */
  readonly "aria-id"?: string;
}

/** The box that carries the role and stretches on the rule's cross axis. */
const roleFrame = (vertical: boolean): StyleDesc => ({
  display: "flex",
  flexDirection: vertical ? "row" : "column",
  flexShrink: 0,
  alignSelf: "stretch",
  ...(vertical ? {} : { width: "100%" }),
});

/**
 * A horizontal or vertical rule.
 *
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator decorative label="or" />
 * ```
 */
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

/** Inventory record, mirrored into `COMPONENTS.md`'s Separators row. */
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
