/**
 * What a child list paints.
 *
 * A control's visible label and an overlay's content are both caller children,
 * and both can be computed — a missing translation arrives as `""`, a loaded
 * record as `undefined`. The library's rule is that blank text is absent, so
 * the probe that decides whether to paint a row or open a tip has to see
 * through the wrappers a caller uses for typography.
 */

import { Children, Fragment, isValidElement, type ReactNode } from "react";
import * as Arr from "effect/Array";
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
