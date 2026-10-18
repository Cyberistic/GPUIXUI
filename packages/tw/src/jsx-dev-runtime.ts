/** The dev JSX runtime, mirroring `./jsx-runtime.ts`. */

import type * as React from "react";
import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
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

export const jsxDEV = (
  type: React.ElementType,
  props: Record<string, unknown> | null,
  key: React.Key | undefined,
  isStaticChildren: boolean,
  source:
    | { readonly fileName: string; readonly lineNumber: number }
    | undefined,
  self: unknown,
): React.ReactElement =>
  isHost(type) && isClassed(props)
    ? reactJsxDEV(
        TwHost,
        withHost(type, props),
        key,
        isStaticChildren,
        source,
        self,
      )
    : reactJsxDEV(type, props, key, isStaticChildren, source, self);

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
