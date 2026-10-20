/**
 * A label that mixes an icon with text is one row (plan 803).
 *
 * The bug this guards: GPUix lays a box's children on the cross axis by
 * default, so `<Checkbox><Icon name="star" /> Accept</Checkbox>` — the shape
 * both selection pages advertise — painted the star **above** the word in a
 * 33 px label column. `Button` and `Toggle` children behaved the same way.
 * A mixed label now carries the row layout, while a text-only label's tree is
 * unchanged (the common path must not be re-baselined).
 *
 * This suite reads the element tree, so the rule is asserted before the runtime
 * sees the props; `runtime/label-row.runtime.test.tsx` proves the paint.
 */

import type { ReactElement, ReactNode } from "react";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { describe, expect, it, vi } from "vitest";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderSwitch } from "./Switch.js";
import { renderToggle } from "./Toggle.js";
import { elementChildren, elementProp, expectSome } from "./testing/element.js";
import type { FocusState } from "./internal.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

/** A `style` prop on a host element **or** a composed part (`Text`, `Icon`). */
const styleOf = (element: ReactElement): Record<string, unknown> =>
  expectSome(
    Option.flatMap(
      elementProp(element, "style"),
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown)),
    ),
  );
const booleanState = (value: boolean) =>
  initValueState(Option.some(value), false);

/** The child list's icon, with a concrete colour so the tree decodes. */
const icon = (): ReactNode => <Icon name="star" color="#123456" />;

interface Part {
  readonly name: string;
  readonly render: (children: ReactNode) => ReactElement;
  /** The label container: index 0 on a button, index 1 after the box/track. */
  readonly label: (root: ReactElement) => ReactElement;
}

const PARTS: ReadonlyArray<Part> = [
  {
    name: "Button",
    render: (children) =>
      renderButton({ children }, testTheme, { focused: false }),
    label: (root) => expectSome(Option.fromNullishOr(elementChildren(root)[0])),
  },
  {
    name: "Toggle",
    render: (children) =>
      renderToggle({ children }, testTheme, booleanState(false), idle, vi.fn()),
    label: (root) => expectSome(Option.fromNullishOr(elementChildren(root)[0])),
  },
  {
    name: "Checkbox",
    render: (children) =>
      renderCheckbox(
        { children },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
    label: (root) => expectSome(Option.fromNullishOr(elementChildren(root)[1])),
  },
  {
    name: "Switch",
    render: (children) =>
      renderSwitch({ children }, testTheme, booleanState(false), idle, vi.fn()),
    label: (root) => expectSome(Option.fromNullishOr(elementChildren(root)[1])),
  },
];

describe.each(PARTS)("$name", (part) => {
  it("lays an icon and the words on one row", () => {
    const label = part.label(part.render([icon(), "Accept"]));
    const style = styleOf(label);
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("row");
    expect(style.alignItems).toBe("center");
    expect(style.gap).toBe(testTheme.spacing.xs);
  });

  it("keeps a text-only label out of the row", () => {
    const label = part.label(part.render("Accept"));
    const style = styleOf(label);
    expect(style).not.toHaveProperty("display");
    expect(style.flexShrink).toBe(1);
  });

  it("keeps the fitted text run beside the icon", () => {
    // A row gives every child its own floor; the words must remain one
    // shrinkable item, or a long label paints outside the control (plan 368).
    const label = part.label(part.render([icon(), "Accept"]));
    const parts = elementChildren(label);
    expect(parts).toHaveLength(2);
    const run = expectSome(Option.fromNullishOr(parts[1]));
    expect(styleOf(run).minWidth).toBe(0);
  });
});

it("joins adjacent text beside an icon into one run", () => {
  const root = renderCheckbox(
    { children: ["Accept ", "notifications", icon()] },
    testTheme,
    booleanState(false),
    idle,
    vi.fn(),
  );
  const label = expectSome(Option.fromNullishOr(elementChildren(root)[1]));
  const parts = elementChildren(label);
  expect(parts).toHaveLength(2);
  const run = expectSome(Option.fromNullishOr(parts[0]));
  expect(styleOf(run).minWidth).toBe(0);
  expect(
    Option.getOrElse(
      Option.flatMap(elementProp(run, "children"), (text) =>
        typeof text === "string" ? Option.some(text) : Option.none(),
      ),
      () => expect.fail("the label run painted no text"),
    ),
  ).toBe("Accept notifications");
});
