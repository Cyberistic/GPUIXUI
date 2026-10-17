/**
 * The position-check unit suite.
 *
 * The bug these guard: a part of one component used inside the wrong parent of
 * the same component (`TabsContent` inside `TabsList`) used to render silently.
 * `assertParts` now rejects it, while leaving decoration — a Button, a Badge, a
 * `div`, text — alone, because decorative children are not misplaced parts.
 *
 * The real-renderer half of this guard is `src/behaviour/parts.test.tsx`.
 */

import { createElement, Fragment, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  assertParts,
  type PartComponent,
  type PartsContract,
} from "./parts.js";

const One = (): ReactNode => null;
const Two = (): ReactNode => null;
const Stranger = (): ReactNode => null;

const contract: PartsContract = {
  parent: "DemoList",
  family: [One, Two] satisfies ReadonlyArray<PartComponent>,
  accepts: [One],
  hint: "Use One.",
};

describe("assertParts", () => {
  it("accepts every directly hosted part", () => {
    expect(() =>
      assertParts(contract, [createElement(One), createElement(One)]),
    ).not.toThrow();
  });

  it("accepts conditional slots and fragments", () => {
    const children = [
      false,
      null,
      undefined,
      createElement(Fragment, null, createElement(One)),
      createElement(Fragment, null, [createElement(One), null]),
    ];

    expect(() => assertParts(contract, children)).not.toThrow();
  });

  it("rejects a sibling part and names both sides", () => {
    expect(() => assertParts(contract, createElement(Two))).toThrow(
      "Two cannot be used inside DemoList. Use One.",
    );
  });

  it("finds a misplaced part inside a nested fragment", () => {
    const nested = createElement(
      Fragment,
      null,
      createElement(Fragment, null, createElement(Two)),
    );

    expect(() => assertParts(contract, nested)).toThrow(
      "Two cannot be used inside DemoList",
    );
  });

  it("leaves decoration and foreign parts alone", () => {
    expect(() =>
      assertParts(contract, [
        createElement("div"),
        createElement(Stranger),
        "metadata",
      ]),
    ).not.toThrow();
  });

  it("ignores an empty parent", () => {
    expect(() => assertParts(contract, null)).not.toThrow();
    expect(() => assertParts(contract, undefined)).not.toThrow();
  });
});
