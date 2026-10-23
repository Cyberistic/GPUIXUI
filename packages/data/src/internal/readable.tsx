/**
 * Paint a value so the words reach the accessibility tree.
 *
 * GPUix reaches its tree only through an element that carries a role: a `<text>`
 * is the runtime's `Label` node, while a role-less `div` holding a string paints
 * the words and announces nothing (`a11y-tree`). A data surface that shows
 * information rather than a control therefore paints a primitive value as text
 * and leaves a composed node to whatever role it paints itself.
 */

import type { StyleDesc } from "@gpuix/react";
import * as P from "effect/Predicate";
import type { ReactNode } from "react";

/** The two properties a readable run needs from the surface that hosts it. */
export interface ReadableProps {
  readonly testId?: string;
  readonly style?: StyleDesc;
}

/** A primitive value as a `Label`, or the caller's node unchanged. */
export const readable = (
  value: ReactNode,
  { testId, style }: ReadableProps = {},
) =>
  P.isString(value) || P.isNumber(value) ? (
    <text testId={testId} style={style}>
      {value}
    </text>
  ) : (
    <div testId={testId} style={style}>
      {value}
    </div>
  );
