/**
 * The accessibility dump, normalised once so every behaviour suite asserts on
 * one shape.
 *
 * Three facts measured in the pinned runtime's test renderer, each of which made
 * an earlier Card assertion read `[]`:
 *
 * - the dump describes the **last painted frame**, and `TestRoot.render`'s own
 *   flush does not populate it: a further paint is needed, which
 *   {@link a11yNodes} performs so a suite reads the tree it just rendered;
 * - a `role` prop is a lowercase ARIA token (`"heading"`), but the dump reports
 *   AccessKit's capitalised name (`"Heading"`), so the role is lowercased here;
 * - a `<text>` node's accessible text arrives as `aria.value`, while an element
 *   labelled with `aria-label` uses `aria.label`; {@link A11yNode.name} takes
 *   whichever the dump filled.
 *
 * Only behaviour suites import this: it takes a `TestRenderer`.
 */

import type { TestRenderer } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";

/** One accessibility node: `role` lowercased, `name` the accessible text. */
export interface A11yNode {
  readonly role: string;
  readonly name: string;
  /** `aria-description`, the help or state a node publishes beside its name. */
  readonly description: Option.Option<string>;
  readonly level: Option.Option<number>;
  /** `aria-selected`, present only where the dump reports a selection. */
  readonly selected: Option.Option<boolean>;
  /** `aria-expanded`, present only where the dump reports an expanded state. */
  readonly expanded: Option.Option<boolean>;
}

/** Every node in the accessibility tree of the frame painted just now. */
export const a11yNodes = (renderer: TestRenderer): ReadonlyArray<A11yNode> => {
  renderer.flush();
  return Arr.getSomes(
    Arr.map(R.values(renderer.getA11yTree().nodes ?? {}), (node) =>
      node.aria?.role === undefined
        ? Option.none()
        : Option.some({
            role: Str.toLowerCase(node.aria.role),
            name: Option.getOrElse(
              Option.firstSomeOf([
                Option.fromNullishOr(node.aria.label),
                Option.fromNullishOr(node.aria.value),
              ]),
              () => "",
            ),
            description: Option.fromNullishOr(node.aria.description),
            level: Option.fromNullishOr(node.aria.level),
            selected: Option.fromNullishOr(node.aria.selected),
            expanded: Option.fromNullishOr(node.aria.expanded),
          }),
    ),
  );
};

/** Every node whose role is `role`, given as the ARIA token in any case. */
export const nodesWithRole = (
  renderer: TestRenderer,
  role: string,
): ReadonlyArray<A11yNode> =>
  Arr.filter(
    a11yNodes(renderer),
    (node) => node.role === Str.toLowerCase(role),
  );
