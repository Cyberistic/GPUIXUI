/**
 * `Separator` — a rule between regions.
 *
 * One border on the theme's border role, horizontal or vertical. A labelled
 * separator is a rule with a caption, which is a composition rather than a rule
 * property, so it is built from the same two elements here instead of growing
 * the resolver.
 *
 * A caller's `style` lands on the **control** — the one element of a plain rule,
 * or the flex row of a labelled one — so a container property moves the
 * separator as it would any other part (plan `364`). The caption and its two
 * rules are internal structure and keep the themed look.
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
  /** Stable locator for automation. */
  readonly testId?: string;
}

/** The element tree `Separator` renders: one rule across its axis. */
export const renderSeparator = (
  { orientation, inset, label, style, testId }: SeparatorProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const rule = ruleStyle({ orientation, inset }, theme);
  if (label === undefined || orientation === "vertical") {
    return <div testId={testId} style={mergeStyle(rule, style)} />;
  }
  return (
    <div
      testId={testId}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        },
        style,
      )}
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
  /** Stable locator for automation. */
  readonly testId?: string;
}

/** The element tree `Spacer` renders: a filler that pushes its siblings apart. */
export const renderSpacer = (
  { size, style, testId }: SpacerProps,
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
  return <div testId={testId} style={mergeStyle(fixed, style)} />;
};

/** Empty space: a fixed gap, or a flexible filler that pushes siblings apart. */
export const Spacer = (props: SpacerProps): ReactElement =>
  renderSpacer(props, useTheme());
