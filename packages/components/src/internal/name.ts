/**
 * The accessible name for a part that draws an interactive role itself.
 *
 * GPUix 0.10.0 does not lift a control's text child into its accessible name for
 * a `div` with a role (measured for menu rows in plan 387 and for every example
 * in plan 391), so the part supplies the name as `aria-label` — the same string
 * a name-from-contents runtime would compute.
 *
 * Only plain text is read. Strings and numbers inside arrays and fragments count;
 * any other element is skipped, so an icon, a spinner or a badge never leaks into
 * the name. A composed label that is not plain text still passes `aria-label`.
 */

import * as Arr from "effect/Array";
import { Match, pipe } from "effect";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

const isFragment = (
  node: ReactNode,
): node is ReactElement<{ readonly children?: ReactNode }> =>
  isValidElement<{ readonly children?: ReactNode }>(node) &&
  node.type === Fragment;

/** The plain text under `children`; `""` when there is none. */
export const plainText = (children: ReactNode): string =>
  pipe(
    Children.toArray(children),
    Arr.map((child) =>
      Match.value(child).pipe(
        Match.when(P.isString, (text) => text),
        Match.when(P.isNumber, (value) => `${value}`),
        Match.when(isFragment, (fragment) =>
          plainText(fragment.props.children),
        ),
        Match.orElse(() => ""),
      ),
    ),
    Arr.join(""),
  );

/** A trimmed non-empty string, or `None`. */
const clean = (value: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(value),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
  );

/**
 * The name a control should carry: the caller's `aria-label` when it authored
 * one, otherwise the plain text in its children. `undefined` means the caller
 * must name it (a composed label, or an icon-only control).
 */
export const controlName = (
  authored: string | undefined,
  children: ReactNode,
): string | undefined =>
  Option.getOrUndefined(
    pipe(
      clean(authored),
      Option.orElse(() => clean(plainText(children))),
    ),
  );

/**
 * The name for a control whose caller-authored label may be absent and whose
 * visible sources are ordered: the first trimmed, non-empty source wins.
 * `undefined` means the caller must name it.
 */
export const controlNameFrom = (
  authored: string | undefined,
  sources: ReadonlyArray<string | undefined>,
): string | undefined =>
  Option.getOrUndefined(
    Option.firstSomeOf([clean(authored), ...Arr.map(sources, clean)]),
  );

/**
 * The name for a part whose visible content is several strings rather than one
 * text child — a label and the value it pairs with. The caller's `aria-label`
 * wins when it authored one; otherwise the trimmed, non-empty parts are joined
 * by `", "`. `None` means the caller must name it.
 */
export const composedName = (
  authored: string | undefined,
  parts: ReadonlyArray<string>,
): Option.Option<string> =>
  pipe(
    clean(authored),
    Option.orElse(() =>
      clean(
        pipe(
          parts,
          Arr.map(Str.trim),
          Arr.filter(Str.isNonEmpty),
          Arr.join(", "),
        ),
      ),
    ),
  );
