/** The dev JSX runtime, mirroring `./jsx-runtime.ts` (plan 380). */

import type * as React from "react";
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

export { Fragment, jsxDEV } from "react/jsx-dev-runtime";

export declare namespace JSX {
  type ElementType = React.JSX.ElementType;
  type Element = React.JSX.Element;
  type ElementClass = React.JSX.ElementClass;
  type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
  type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;

  interface IntrinsicElements {
    div: Props;
    text: Props;
    img: ImgProps;
    svg: SvgProps;
    canvas: Props;
    input: InputProps;
    textarea: TextareaProps;
    anchored: AnchoredProps;
    code: CodeProps;
    diff: DiffProps;
    markdown: MarkdownProps;
    "virtual-list": VirtualListProps;
  }
}
