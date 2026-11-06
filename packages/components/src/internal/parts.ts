import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type PartComponent = (props: never) => ReactNode;

export type PartChildren =
  | ReactElement<unknown>
  | boolean
  | null
  | undefined
  | ReadonlyArray<PartChildren>;

export interface PartsContract {
  readonly parent: string;

  readonly family: ReadonlyArray<PartComponent>;

  readonly accepts: ReadonlyArray<PartComponent>;

  readonly hint?: string;
}

const componentName = (type: unknown): string =>
  P.isString(type)
    ? type
    : P.isFunction(type)
      ? type.name || "anonymous"
      : "element";

const fragmentChildren = (element: ReactElement<unknown>): ReactNode =>
  hasChildren(element.props) ? element.props.children : undefined;

const hasChildren = (
  value: unknown,
): value is { readonly children?: ReactNode } =>
  P.isObject(value) && "children" in value;

const leaves = (children: ReactNode): ReadonlyArray<unknown> =>
  Arr.flatMap(Children.toArray(children), (child) =>
    isValidElement<unknown>(child) && child.type === Fragment
      ? leaves(fragmentChildren(child))
      : [child],
  );

export const assertParts = (
  contract: PartsContract,
  children: ReactNode,
): void => {
  Arr.forEach(leaves(children), (leaf) => {
    if (!isValidElement(leaf)) return;
    if (Arr.some(contract.accepts, (part) => part === leaf.type)) return;
    if (!Arr.some(contract.family, (part) => part === leaf.type)) return;

    throw new Error(
      `${componentName(leaf.type)} cannot be used inside ${contract.parent}.` +
        (contract.hint === undefined ? "" : ` ${contract.hint}`),
    );
  });
};
