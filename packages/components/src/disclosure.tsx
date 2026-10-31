/** @jsxImportSource @gpuix/react */
/**
 * Disclosure: an inspector section headed by a triangle, as AppKit draws one.
 *
 * A `Collapsible` whose trigger is a 13-point semibold title after a triangle
 * that points right when the section is folded and down when it is open. The
 * runtime has no `transform` to rotate one glyph, so the triangle is the
 * chevron pair swapped. The body opens through the collapsible's measured
 * reveal.
 */

import { Icon } from "@gpuixui/icons";
import { useState, type ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible.js";
import { textStyle, useTheme } from "./internal/theme.js";

/** {@link Disclosure} props. */
export interface DisclosureProps {
  readonly title: string;
  /** Whether the section starts open. Defaults to open, as an inspector does. */
  readonly defaultOpen?: boolean;
  readonly testId?: string;
  readonly children?: ReactNode;
}

/** The disclosure section. */
export const Disclosure = ({
  title,
  defaultOpen = true,
  testId,
  children,
}: DisclosureProps) => {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        {...(testId === undefined ? {} : { testId })}
        aria-label={title}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          height: 24,
        }}
      >
        <Icon
          name={open ? "chevron-down" : "chevron-right"}
          size={theme.iconSize.xs}
          color={theme.colors.mutedForeground}
        />
        <text
          style={{
            ...textStyle(theme, "body"),
            fontWeight: 600,
            color: theme.colors.foreground,
          }}
        >
          {title}
        </text>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md`'s Disclosure row. */
export const disclosureMeta = {
  name: "Disclosure",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "No `transform`: the triangle is the chevron pair swapped, not one glyph rotated",
  ],
  docs: "docs/disclosure.mdx",
  example: "examples/disclosure.example.tsx",
  testFile: "src/behaviour/disclosure.test.tsx",
} as const;
