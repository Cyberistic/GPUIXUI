/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import { useState, type ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible.js";
import { textStyle, useTheme } from "./internal/theme.js";

export interface DisclosureProps {
  readonly title: string;

  readonly defaultOpen?: boolean;
  readonly testId?: string;
  readonly children?: ReactNode;
}

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

          justifyContent: "flex-start",
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
