/**
 * What a child list paints.
 *
 * A control's visible label and an overlay's content are both caller children,
 * and both can be computed — a missing translation arrives as `""`, a loaded
 * record as `undefined`. The library's rule is that blank text is absent, so
 * the probe that decides whether to paint a row or open a tip has to see
 * through the wrappers a caller uses for typography.
 */

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import { Text } from "./Text.js";

/**
 * Whether a child list paints anything.
 *
 * `Children.toArray` already drops `null`, `undefined` and booleans, so what
 * remains is text/numbers — meaningful only when they say something — or an
 * element. An element counts unless it is **transparent**: a `Text` run paints
 * exactly its children, and a fragment paints its children, so the probe looks
 * through both. That is what makes a blank label wrapped for typography absent
 * (plans `743`, `782`) while an icon child or a rich node still counts as
 * content (plans `744`, `746`).
 */
export const paintsContent = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (part) =>
    P.isString(part) || P.isNumber(part)
      ? Str.isNonEmpty(Str.trim(`${part}`))
      : isValidElement<{ children?: ReactNode }>(part)
        ? part.type === Text || part.type === Fragment
          ? paintsContent(part.props.children)
          : true
        : false,
  );

/**
 * Whether a child list contains an element that is not a typographic run.
 *
 * The paint-side twin of the name rule (plans `746`, `803`): a control's visible
 * label may mix an icon with its words, and a `Text` run or a fragment is still
 * text. An opaque element means the label is a row, because GPUix otherwise
 * stacks its children on the cross axis.
 */
export const hasOpaqueContent = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (part) =>
    isValidElement<{ children?: ReactNode }>(part)
      ? part.type !== Text && part.type !== Fragment
        ? true
        : hasOpaqueContent(part.props.children)
      : false,
  );

/** One piece of a mixed label: a fitted text run, or the caller's element. */
export type LabelPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "element"; readonly element: ReactElement };

const NO_PARTS: ReadonlyArray<LabelPart> = [];

/**
 * Split a label into its opaque elements and its **contiguous** text runs.
 *
 * A row gives every child its own flex item, so the words beside an icon must
 * be one fitted run: splitting each string would insert the row's gap between
 * every word (plan `803`). A whitespace-only run carries nothing and is dropped
 * — the blank-label rule `paintsContent` already applies.
 */
export const labelParts = (children: ReactNode): ReadonlyArray<LabelPart> =>
  Arr.reduce(Children.toArray(children), NO_PARTS, (parts, child) =>
    P.isString(child) || P.isNumber(child)
      ? appendText(parts, `${child}`)
      : isValidElement<{ children?: ReactNode }>(child)
        ? Arr.append(parts, { kind: "element", element: child })
        : parts,
  );

const appendText = (
  parts: ReadonlyArray<LabelPart>,
  text: string,
): ReadonlyArray<LabelPart> =>
  Option.match(Arr.last(parts), {
    onNone: () => (saysNothing(text) ? [] : [{ kind: "text", text }]),
    onSome: (last) =>
      last.kind === "text"
        ? Arr.append(Arr.dropRight(parts, 1), {
            kind: "text",
            text: `${last.text}${text}`,
          })
        : saysNothing(text)
          ? parts
          : Arr.append(parts, { kind: "text", text }),
  });

const saysNothing = (text: string): boolean => !Str.isNonEmpty(Str.trim(text));
