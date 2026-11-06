/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { visibleCopy } from "../core/a11y.js";
import { orientationOf } from "../core/keyboard.js";
import type { RuleSpec } from "../core/style.js";
import { spaceStep, spaceValue } from "../core/theme.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { separatorClass, separatorGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, type ElementHostProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";

export interface SeparatorProps extends RuleSpec {
  readonly label?: string;
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly testId?: string;
}

export const renderSeparator = (
  { orientation, inset, label, style, className, testId }: SeparatorProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const axis = orientationOf(orientation, "horizontal");
  const classes = cn(separatorClass(axis, inset), className);
  const rule = mergeStyle(recipeTw.classesToStyle(classes, theme).style, style);
  const caption = visibleCopy(label);
  if (caption === undefined || axis === "vertical") {
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
        {caption}
      </Text>
      <div style={grown} />
    </div>
  );
};

export const Separator = (props: SeparatorProps): ReactElement =>
  renderSeparator(props, useTheme());

export interface SpacerProps extends ElementHostProps {
  readonly size?: keyof PrimitiveTheme["spacing"];
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly testId?: string;
}

export const renderSpacer = (
  {
    size,
    style,
    className,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
  }: SpacerProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const step = spaceStep(theme, size);
  const fixed: StyleDesc =
    step === undefined
      ? { flexGrow: 1, flexBasis: 0 }
      : {
          flexShrink: 0,
          flexGrow: 0,
          width: spaceValue(theme, step),
          height: spaceValue(theme, step),
        };
  return (
    <div
      ref={ref}
      aria-id={controlId}
      onLayout={onLayout}
      testId={testId}
      style={mergeStyle(
        mergeStyle(fixed, recipeTw.classesToStyle(cn(className), theme).style),
        style,
      )}
    />
  );
};

export const Spacer = (props: SpacerProps): ReactElement =>
  renderSpacer(props, useTheme());
