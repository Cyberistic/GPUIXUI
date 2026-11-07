/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import * as Arr from "effect/Array";
import { Children, type ReactNode } from "react";
import { textStyle, useTheme } from "./internal/theme.js";

export interface InsetGroupProps extends Omit<Props, "children"> {
  readonly title?: string;

  readonly titleTone?: "strong" | "muted";

  readonly elevated?: boolean;

  readonly insetDividers?: boolean;

  readonly children?: ReactNode;
}

export const InsetGroup = ({
  title,
  titleTone = "strong",
  elevated = false,
  insetDividers = false,
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
            ...textStyle(theme, titleTone === "muted" ? "caption" : "body"),
            fontWeight: 600,
            color:
              titleTone === "muted"
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
            paddingLeft: titleTone === "muted" ? 12 : 4,
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
          ...(elevated
            ? { boxShadow: [...theme.elevation.md] }
            : { overflow: "hidden" }),
        }}
      >
        {Arr.map(rows, (row, index) => (
          <div
            key={index}
            style={
              index === 0
                ? {}
                : insetDividers
                  ? {}
                  : {
                      borderTopWidth: theme.borderWidth.thin,
                      borderColor: theme.colors.border,
                    }
            }
          >
            {insetDividers && index > 0 ? (
              <div
                style={{
                  height: theme.borderWidth.thin,
                  marginLeft: 12,
                  marginRight: 12,
                  backgroundColor: theme.colors.border,
                }}
              />
            ) : null}
            {row}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface InsetGroupRowProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly description?: string;

  readonly control?: ReactNode;
}

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
