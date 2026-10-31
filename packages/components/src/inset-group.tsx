/** @jsxImportSource @gpuix/react */
/**
 * InsetGroup: a settings form's grouped rows, as System Settings draws them.
 *
 * A rounded `card` box with a hairline edge holds rows of a label on the
 * leading side and a control on the trailing side, with a hairline between
 * rows and none after the last. An optional title sits above the box and an
 * optional description under a row's label.
 */

import type { Props } from "@gpuix/react";
import * as Arr from "effect/Array";
import { Children, type ReactNode } from "react";
import { textStyle, useTheme } from "./internal/theme.js";

/** {@link InsetGroup} props. */
export interface InsetGroupProps extends Omit<Props, "children"> {
  /** The group's heading, above the box. */
  readonly title?: string;
  /** The rows: {@link InsetGroupRow}s. */
  readonly children?: ReactNode;
}

/** The grouped box. */
export const InsetGroup = ({
  title,
  children,
  style,
  ...rest
}: InsetGroupProps) => {
  const theme = useTheme();
  const rows = Children.toArray(children);

  return (
    <div
      {...(title === undefined ? {} : { "aria-label": title })}
      {...rest}
      style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}
    >
      {title === undefined ? null : (
        <text
          style={{
            ...textStyle(theme, "body"),
            fontWeight: 600,
            color: theme.colors.foreground,
            paddingLeft: 4,
          }}
        >
          {title}
        </text>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          overflow: "hidden",
        }}
      >
        {Arr.map(rows, (row, index) => (
          <div
            key={index}
            style={
              index === 0
                ? {}
                : {
                    borderTopWidth: theme.borderWidth.thin,
                    borderColor: theme.colors.border,
                  }
            }
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
};

/** {@link InsetGroupRow} props. */
export interface InsetGroupRowProps extends Omit<Props, "children"> {
  readonly label: string;
  /** A line under the label, in the secondary ink. */
  readonly description?: string;
  /** The trailing control: a switch, a select, a segmented control. */
  readonly control?: ReactNode;
}

/** One row: the label leading, the control trailing. */
export const InsetGroupRow = ({
  label,
  description,
  control,
  style,
  ...rest
}: InsetGroupRowProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 36,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 6,
        paddingBottom: 6,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {label}
        </text>
        {description === undefined ? null : (
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {description}
          </text>
        )}
      </div>
      {control}
    </div>
  );
};

/** Inventory record, mirrored into `.agents/slop/COMPONENTS.md`'s Inset group row. */
export const insetGroupMeta = {
  name: "Inset group",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/inset-group.mdx",
  example: "examples/inset-group.example.tsx",
  testFile: "src/behaviour/inset-group.test.tsx",
} as const;
