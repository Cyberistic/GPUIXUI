/**
 * `Label` as a press target for its control.
 *
 * The bug guarded (plan `749`): the page said a label "cannot move focus to
 * another element", so a pointer press on the visible name did nothing. The
 * renderer publishes `focusElement(instanceId)`, and a press on the label's text
 * bubbles to its root (measured), so the rule is expressible; it is not an
 * `htmlFor`/`aria-labelledby` association and does not pretend to be one.
 */

import type { RefObject } from "react";
import type { PublicInstance } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { labelActivation, renderLabel } from "./Label.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

/** A mounted-looking control instance, without a window. */
const instance: PublicInstance = { id: 7, type: "div", props: {} };

const refOf = (
  current: PublicInstance | null,
): RefObject<PublicInstance | null> => ({ current });

const focusRecorder = (): {
  readonly ids: ReadonlyArray<number>;
  readonly renderer: { readonly focusElement: (id: number) => void };
} => {
  const ids: number[] = [];
  return {
    ids,
    renderer: {
      focusElement: (id) => {
        ids.push(id);
      },
    },
  };
};

/** The label's name run: root → row → text. */
const nameRun = (element: ReturnType<typeof renderLabel>) => {
  const row = expectSome(Option.fromNullishOr(elementChildren(element).at(0)));
  return expectSome(Option.fromNullishOr(elementChildren(row).at(0)));
};

describe("labelActivation", () => {
  it("is absent without a control, so the tree is unchanged", () => {
    expect(labelActivation(undefined, focusRecorder().renderer)).toBe(
      undefined,
    );
  });

  it("focuses the instance the ref names", () => {
    const { ids, renderer } = focusRecorder();
    const activate = labelActivation(refOf(instance), renderer);
    expect(activate).toBeDefined();
    activate?.();
    expect(ids).toStrictEqual([7]);
  });

  it("is a no-op before the control mounts", () => {
    const { ids, renderer } = focusRecorder();
    const activate = labelActivation(refOf(null), renderer);
    expect(() => activate?.()).not.toThrow();
    expect(ids).toStrictEqual([]);
  });

  it("is a no-op without a renderer", () => {
    const activate = labelActivation(refOf(instance), null);
    expect(() => activate?.()).not.toThrow();
  });
});

describe("renderLabel", () => {
  it("paints no press target without an activation", () => {
    const element = renderLabel({ children: "Email" }, testTheme);
    expect(hostTag(element)).toStrictEqual(Option.some("div"));
    expect(hostProp(element, "onClick")).toStrictEqual(Option.none());
    expect(hostStyle(element, "cursor")).toStrictEqual(Option.none());
  });

  it("answers a press with a pointer, and nothing else", () => {
    const onActivate = vi.fn();
    const element = renderLabel({ children: "Email" }, testTheme, onActivate);
    expectSome(hostHandler(element, "onClick"))({
      elementId: 1,
      eventType: "click",
      button: 0,
    });
    expect(onActivate).toHaveBeenCalledOnce();
    expect(expectSome(hostStyleString(element, "cursor"))).toBe("pointer");
    // A label is text, not a surface: no wash on hover or press.
    expect(hostStyle(element, "backgroundColor")).toStrictEqual(Option.none());
    expect(hostStyle(element, "hover")).toStrictEqual(Option.none());
    expect(hostStyle(element, "active")).toStrictEqual(Option.none());
  });

  it("stays out of the tab order and invents no role", () => {
    const element = renderLabel({ children: "Email" }, testTheme, vi.fn());
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    expect(hostProp(element, "role")).toStrictEqual(Option.none());
  });

  it("lets a caller's cursor win", () => {
    const element = renderLabel(
      { style: { cursor: "default" }, children: "Email" },
      testTheme,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(element, "cursor"))).toBe("default");
  });

  it("leaves the name, marker and description unchanged", () => {
    const plain = renderLabel({ children: "Email" }, testTheme);
    const pressable = renderLabel({ children: "Email" }, testTheme, vi.fn());
    const name = (element: ReturnType<typeof renderLabel>) =>
      elementProp(nameRun(element), "children");
    expect(name(pressable)).toStrictEqual(name(plain));
    expect(elementProp(nameRun(pressable), "role")).toStrictEqual(
      elementProp(nameRun(plain), "role"),
    );
    const required = renderLabel(
      { required: true, children: "Email" },
      testTheme,
    );
    expect(
      elementChildren(
        expectSome(Option.fromNullishOr(elementChildren(required).at(0))),
      ),
    ).toHaveLength(2);
    const described = renderLabel(
      { description: "Shown on invitations", children: "Email" },
      testTheme,
      vi.fn(),
    );
    expect(elementChildren(described)).toHaveLength(2);
    expect(expectSome(hostStyleString(described, "flexDirection"))).toBe(
      "column",
    );
  });
});
