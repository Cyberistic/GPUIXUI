/**
 * `Separator` — a rule between regions.
 *
 * One border on the theme's border role, horizontal or vertical. A labelled
 * separator is a rule with a caption, which is a composition rather than a rule
 * property, so it is built from the same two elements here instead of growing
 * the resolver.
 *
 * The resting appearance is a Tailwind recipe (`recipe/separatorClass`),
 * compiled through `@gpuixui/tw`; the caller's `className` is joined last so it
 * wins conflicts exactly as `cn` resolves them.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { RuleSpec } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { separatorClass, separatorGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";

export interface SeparatorProps extends RuleSpec {
  /** A caption centred on the rule. */
  readonly label?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
}

export const renderSeparator = (
  { orientation, inset, label, style, className, testId }: SeparatorProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const classes = cn(separatorClass(orientation, inset), className);
  const rule = mergeStyle(recipeTw.classesToStyle(classes, theme).style, style);
  if (label === undefined || orientation === "vertical") {
    return <div testId={testId} style={rule} />;
  }
  const grown = mergeStyle(
    recipeTw.classesToStyle(cn(classes, "flex-grow"), theme).style,
    style,
  );
  const row = recipeTw.classesToStyle(separatorGroupClass, theme).style;
  return (
    <div testId={testId} style={row}>
      <div style={grown} />
      <Text role="caption" tone="muted">
        {label}
      </Text>
      <div style={grown} />
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
