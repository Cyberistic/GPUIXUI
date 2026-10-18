/**
 * A JSX runtime that lets shadcn-style host elements keep `className`.
 *
 * The runtime only wraps GPUix host elements that carry a class string; every
 * other element goes straight to React's runtime. The wrapper (`TwHost`) reads
 * the theme and resolves the classes at render time, so theme changes and
 * stateful variants work without a build step.
 */

import type * as React from "react";
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from "react/jsx-runtime";
import type {
  AnchoredProps,
  CodeProps,
  DiffProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  Props,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "@gpuix/react";
import { TwHost } from "./host.js";
import { isClassed, isHost, withHost } from "./runtime.js";

const create = (
  type: React.ElementType,
  props: Record<string, unknown> | null,
  key: React.Key | undefined,
  jsxs: boolean,
): React.ReactElement => {
  if (isHost(type) && isClassed(props)) {
    const next = withHost(type, props);
    return jsxs ? reactJsxs(TwHost, next, key) : reactJsx(TwHost, next, key);
  }
  return jsxs ? reactJsxs(type, props, key) : reactJsx(type, props, key);
};

export const jsx = (
  type: React.ElementType,
  props: Record<string, unknown> | null,
  key?: React.Key,
): React.ReactElement => create(type, props, key, false);

export const jsxs = (
  type: React.ElementType,
  props: Record<string, unknown> | null,
  key?: React.Key,
): React.ReactElement => create(type, props, key, true);

export { Fragment };

export declare namespace JSX {
  type ElementType = React.JSX.ElementType;
  type Element = React.JSX.Element;
  type ElementClass = React.JSX.ElementClass;
  type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
  type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;

  interface IntrinsicElements {
    div: Props & { className?: string };
    text: Props & { className?: string };
    img: ImgProps & { className?: string };
    svg: SvgProps & { className?: string };
    canvas: Props & { className?: string };
    input: InputProps & { className?: string };
    textarea: TextareaProps & { className?: string };
    anchored: AnchoredProps & { className?: string };
    code: CodeProps & { className?: string };
    diff: DiffProps & { className?: string };
    markdown: MarkdownProps & { className?: string };
    "virtual-list": VirtualListProps & { className?: string };
  }
}
