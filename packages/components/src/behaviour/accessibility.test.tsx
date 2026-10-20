/**
 * The accessibility contract every example must satisfy.
 *
 * The bug this guards: GPUix 0.10.0 reports no accessible name for a `div` with
 * a role whose label is only a text child (measured for menu rows in plan 387).
 * A control without an authored name is announced as "button" and nothing else,
 * and an announced region is heard as a bare "alert" with its text detached — so
 * each part that draws a role must supply `aria-label` (see `internal/name.ts`).
 *
 * Every registered example is mounted in the real renderer, so a new example or
 * a new part is covered without editing this file. The per-component behaviour
 * belongs to the other suites; here the rule is deliberately narrow and
 * **role-agnostic**: every painted role except the two structural list roles must
 * carry a name, and the walk must find nodes at all, so an empty tree cannot
 * pass. Stating the rule over roles rather than over a spelling list is what
 * plans 783 and 790 needed twice: AccessKit spells `option` as
 * `listboxoption` and `<input>` as `textinput`, and a hand-written list silently
 * skipped both (plan 792).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { examples } from "../../examples/index.js";
import { a11yNodes } from "../internal/a11y.js";
import { renderComponent } from "../internal/test-root.js";

/**
 * Roles that take their content from children, which AccessKit reports as
 * separate `label` nodes; ARIA requires no name for either, and naming a row
 * would repeat the text it already reads.
 */
const UNNAMED_BY_DESIGN: ReadonlyArray<string> = ["list", "listitem"];

/** Every node that must carry a name, named or not, per example. */
const walkNamedRoles = (): {
  readonly found: Array<string>;
  readonly unnamed: Array<string>;
} => {
  const root = renderComponent(<div />);
  const found: Array<string> = [];
  const unnamed: Array<string> = [];

  Arr.forEach(R.keys(examples), (id) => {
    const Example: ComponentType = Option.getOrElse(
      Option.fromNullishOr(examples[id]),
      () => expect.fail(`the example registry has no "${id}" entry`),
    );
    root.rerender(<Example key={id} />);
    Arr.forEach(a11yNodes(root.renderer), (node) => {
      if (Arr.contains(UNNAMED_BY_DESIGN, node.role)) return;
      found.push(id);
      if (node.name.length === 0) unnamed.push(`${id}: ${node.role}`);
    });
  });

  root.unmount();
  return { found, unnamed };
};

describe("accessibility", () => {
  it("names every node that is not a structural list", () => {
    const { found, unnamed } = walkNamedRoles();

    expect(found.length).toBeGreaterThan(0);
    expect(unnamed).toEqual([]);
  });
});
