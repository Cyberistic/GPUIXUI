import type { TestRenderer } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";

export interface A11yNode {
  readonly role: string;
  readonly name: string;

  readonly description: Option.Option<string>;
  readonly level: Option.Option<number>;

  readonly selected: Option.Option<boolean>;

  readonly expanded: Option.Option<boolean>;
}

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

export const nodesWithRole = (
  renderer: TestRenderer,
  role: string,
): ReadonlyArray<A11yNode> =>
  Arr.filter(
    a11yNodes(renderer),
    (node) => node.role === Str.toLowerCase(role),
  );
