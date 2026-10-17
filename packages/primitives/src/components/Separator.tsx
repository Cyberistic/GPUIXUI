/**
 * `Separator` — a rule between regions.
 *
 * One border on the theme's border role, horizontal or vertical. A labelled
 * separator is a rule with a caption, which is a composition rather than a rule
 * property, so it is built from the same two elements here instead of growing
 * the resolver.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { ruleStyle, type RuleSpec } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";

export interface SeparatorProps extends RuleSpec {
  /** A caption centred on the rule. */
  readonly label?: string;
  readonly style?: StyleDesc;
}

export const renderSeparator = (
  { orientation, inset, label, style }: SeparatorProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const rule = mergeStyle(ruleStyle({ orientation, inset }, theme), style);
  if (label === undefined || orientation === "vertical") {
    return <div style={rule} />;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
      }}
    >
      <div style={{ ...rule, flexGrow: 1 }} />
      <Text role="caption" tone="muted">
        {label}
      </Text>
      <div style={{ ...rule, flexGrow: 1 }} />
    </div>
  );
};

/** A horizontal or vertical rule. */
export const Separator = (props: SeparatorProps): ReactElement =>
  renderSeparator(props, useTheme());

export interface SpacerProps {
  /** A fixed gap on the spacing scale. Omit for a flexible filler. */
  readonly size?: keyof PrimitiveTheme["spacing"];
  readonly style?: StyleDesc;
}

export const renderSpacer = (
  { size, style }: SpacerProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const fixed: StyleDesc =
    size === undefined
      ? { flexGrow: 1, flexBasis: 0 }
      : {
          flexShrink: 0,
          flexGrow: 0,
          width: theme.spacing[size],
          height: theme.spacing[size],
        };
  return <div style={mergeStyle(fixed, style)} />;
};

/** Empty space: a fixed gap, or a flexible filler that pushes siblings apart. */
export const Spacer = (props: SpacerProps): ReactElement =>
  renderSpacer(props, useTheme());
