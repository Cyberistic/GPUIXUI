/**
 * The accessibility contract every example must satisfy.
 *
 * The bug this guards: GPUix 0.10.0 reports no accessible name for a `div` with
 * an interactive role whose label is only a text child (measured for menu rows
 * in plan 387). A control without an authored name is announced as "button" and
 * nothing else, so each part that draws a role must supply `aria-label` — see
 * `internal/name.ts`.
 *
 * Every registered example is mounted in the real renderer, so a new example or
 * a new part is covered without editing this file. The per-component behaviour
 * belongs to the other suites; here the rules are deliberately narrow: an
 * interactive node must have a name, and the walk must find interactive nodes at
 * all, so an empty tree cannot pass.
 *
 * AccessKit spells an `option` as **`listboxoption`** (measured 2026-10-20), so
 * both spellings are listed: the contract must see a listbox row, or two shipped
 * listboxes can carry unnamed options while this passes (plan 783).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { examples } from "../../examples/index.js";
import { a11yNodes } from "../internal/a11y.js";
import { renderComponent } from "../internal/test-root.js";

/** Roles whose name a user hears before the control's value or state. */
const INTERACTIVE_ROLES: ReadonlyArray<string> = [
  "button",
  "checkbox",
  "combobox",
  "img",
  "link",
  "listboxoption",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "switch",
  "tab",
  "textbox",
];

describe("accessibility", () => {
  it("names every interactive node in every example", () => {
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
        if (!Arr.contains(INTERACTIVE_ROLES, node.role)) return;
        found.push(id);
        if (node.name.length === 0) unnamed.push(`${id}: ${node.role}`);
      });
    });

    root.unmount();
    expect(found.length).toBeGreaterThan(0);
    expect(unnamed).toEqual([]);
  });
});
