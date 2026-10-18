/**
 * The JSX runtime the components compile against.
 *
 * `jsxImportSource` is `@gpuix/react`, whose package `exports` correctly point
 * at `jsx-runtime.d.ts`/`.js`. The isolated linker puts that package under this
 * package's `node_modules`, and `@gpuixui/tokens/react` is compiled inside this
 * program from its own directory — where the package is not resolvable. The
 * `tsconfig.json` `paths` entry routes both through this module.
 *
 * It must be a `.ts` file, not the installed `.d.ts`: Node's type stripping
 * refuses to load declaration files, and nub resolves this specifier at run time
 * (plan 380). Values come from React's runtime; the intrinsic map is the one the
 * installed `jsx-runtime.d.ts` declares. A GPUix element missing here is a
 * compile error in this package, not a silently accepted DOM element.
 */

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

export { Fragment, jsx, jsxs } from "react/jsx-runtime";

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
