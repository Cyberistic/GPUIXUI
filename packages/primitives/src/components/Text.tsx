/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { TextAlign, TextTone } from "../core/style.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { textClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { childrenName, mergeStyle, type ElementHostProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface TextProps extends ElementHostProps {
  readonly role?: TextRole;

  readonly tone?: TextTone;
  readonly align?: TextAlign;

  readonly truncate?: boolean;

  readonly clamp?: number;

  readonly selectable?: boolean;
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly testId?: string;
  readonly children?: ReactNode;
}

const semanticsOf = (
  role: TextRole,
): { readonly role?: string; readonly level?: number } =>
  role === "h1"
    ? { role: "heading", level: 1 }
    : role === "h2"
      ? { role: "heading", level: 2 }
      : role === "h3"
        ? { role: "heading", level: 3 }
        : role === "code" || role === "codeBlock"
          ? { role: "code" }
          : {};

export const renderText = (
  {
    role = "body",
    tone = "default",
    align,
    truncate,
    clamp,
    selectable,
    style,
    className,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
    children,
  }: TextProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(
      textClass({ role, tone, align, truncate, clamp, selectable }),
      className,
    ),
    theme,
  );
  const semantics = semanticsOf(role);
  return (
    <text
      ref={ref}
      testId={testId}
      role={semantics.role}
      aria-level={semantics.level}
      aria-id={controlId}
      aria-label={
        semantics.role === undefined ? undefined : childrenName(children)
      }
      onLayout={onLayout}
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </text>
  );
};

export const Text = (props: TextProps): ReactElement =>
  renderText(props, useTheme());
