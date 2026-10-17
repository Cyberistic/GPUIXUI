/**
 * Position checks for compound parts (`docs/component-api.md` §1).
 *
 * React 19 types every JSX expression as `React.JSX.Element` —
 * `ReactElement<any, any>` — so a parent cannot name its parts by element type:
 * any element satisfies a part-typed slot (measured, plan 304 §2). The strongest
 * narrowing left is {@link PartChildren}, which rejects text and numbers;
 * part identity lives on the element's `type` and is checked here, at render.
 *
 * The check is **family-scoped**: a parent rejects a part of its own component
 * that it does not host, and leaves everything else — a Button, a Badge, a
 * `div`, text — to the consumer. That catches the documented mistake
 * (`TabsContent` inside `TabsList`) without breaking decorative composition.
 */

import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * A component a parent can host, matched by reference. Its props do not matter
 * to identity, so `never` keeps every component assignable.
 */
export type PartComponent = (props: never) => ReactNode;

/**
 * The children of a parent that hosts parts: elements and conditional slots,
 * never text or numbers. A part's identity is still a runtime fact (see the
 * module note), but a misplaced paragraph is a compile error.
 */
export type PartChildren =
  | ReactElement<unknown>
  | boolean
  | null
  | undefined
  | ReadonlyArray<PartChildren>;

/** What a parent accepts, and what to say when it does not. */
export interface PartsContract {
  /** The parent, as the consumer writes it: `"TabsList"`. */
  readonly parent: string;
  /** Every part of the same component, so a misplaced sibling is recognised. */
  readonly family: ReadonlyArray<PartComponent>;
  /** The family members this parent hosts directly. */
  readonly accepts: ReadonlyArray<PartComponent>;
  /** What to do instead; appended to the rejection. */
  readonly hint?: string;
}

/** The name in a rejection: the component's identifier, or the tag. */
const componentName = (type: unknown): string =>
  P.isString(type)
    ? type
    : P.isFunction(type)
      ? type.name || "anonymous"
      : "element";

/** A Fragment's children, read without assuming the element's props shape. */
const fragmentChildren = (element: ReactElement<unknown>): ReactNode =>
  hasChildren(element.props) ? element.props.children : undefined;

const hasChildren = (
  value: unknown,
): value is { readonly children?: ReactNode } =>
  P.isObject(value) && "children" in value;

/** Direct leaves in order: arrays flattened, fragments unwrapped. */
const leaves = (children: ReactNode): ReadonlyArray<unknown> =>
  Arr.flatMap(Children.toArray(children), (child) =>
    isValidElement<unknown>(child) && child.type === Fragment
      ? leaves(fragmentChildren(child))
      : [child],
  );

/**
 * Reject a family part the parent does not host. A misplaced part is a
 * programming error at the composition boundary, not a domain failure, so this
 * throws — the same line as the existing "part must be used inside root" throws.
 */
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
