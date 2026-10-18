/**
 * `ToggleGroup` — the element tree the runtime receives.
 *
 * The two behaviours worth guarding here are the ones the runtime suite cannot
 * fake cheaply: the **single tab stop** (one item is `0`, every other is `-1`)
 * and the announced state, which must ride on `aria-valuetext` because 0.10.0
 * has no `aria-pressed`.
 */

import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import * as Option from "effect/Option";
import { initValueState, type ValueState } from "../core/state.js";
import type { ToggleGroupOption } from "../core/toggle-group.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderToggleGroup,
  type ToggleGroupFocus,
  type ToggleGroupHandlers,
  type ToggleGroupMultipleProps,
  type ToggleGroupSingleProps,
} from "./ToggleGroup.js";
import { clickEvent, keyEvent, keyUpEvent } from "./testing/event.js";
import {
  elementChildren,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const options: ReadonlyArray<ToggleGroupOption> = [
  { value: "left", label: "Align left" },
  { value: "centre", label: "Align centre" },
  { value: "right", label: "Align right" },
];

const unfocused: ToggleGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const handlers = (
  onPress: (value: string) => void = vi.fn(),
): ToggleGroupHandlers => ({
  onPress,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

const selected = (
  values: ReadonlyArray<string>,
): ValueState<ReadonlyArray<string>> => initValueState(Option.some(values), []);

const single: ToggleGroupSingleProps = {
  type: "single",
  options,
  label: "Text alignment",
  defaultValue: "left",
};

const multiple: ToggleGroupMultipleProps = {
  type: "multiple",
  options,
  label: "Formatting",
  defaultValue: ["left"],
};

const itemAt = (element: ReactElement, index: number): ReactElement =>
  expectSome(Option.fromNullishOr(elementChildren(element)[index]));

const propOf = (element: ReactElement, index: number, name: string) =>
  expectSome(hostProp(itemAt(element, index), name));

describe("ToggleGroup", () => {
  it("shrinks an item and contains its label", () => {
    // Plan 368: a segmented control given a width must not paint an item's
    // label outside itself; the item shares the group's width and the label is
    // one clipped flex item.
    const element = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    const item = itemAt(element, 0);
    expect(expectSome(hostStyleRecord(item))).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
    });
    const label = expectSome(Option.fromNullishOr(elementChildren(item)[0]));
    expect(expectSome(hostStyleRecord(label))).toMatchObject({
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
  });

  it("is a named group of named buttons", () => {
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    expect(expectSome(hostProp(group, "role"))).toBe("group");
    expect(expectSome(hostProp(group, "aria-label"))).toBe("Text alignment");
    expect(elementChildren(group)).toHaveLength(3);
    expect(
      elementChildren(group).map((item) => expectSome(hostProp(item, "role"))),
    ).toStrictEqual(["button", "button", "button"]);
    expect(
      elementChildren(group).map((item) =>
        expectSome(hostProp(item, "aria-label")),
      ),
    ).toStrictEqual(["Align left", "Align centre", "Align right"]);
  });

  it("announces the pressed set through value text, never aria-pressed", () => {
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    expect(propOf(group, 0, "aria-valuetext")).toBe("pressed");
    expect(propOf(group, 1, "aria-valuetext")).toBe("not pressed");
    expect(hostProp(itemAt(group, 0), "aria-pressed")).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps one tab stop in single mode", () => {
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["centre"]),
      1,
      unfocused,
      handlers(),
    );
    expect(propOf(group, 0, "tabIndex")).toBe(-1);
    expect(propOf(group, 1, "tabIndex")).toBe(0);
    expect(propOf(group, 2, "tabIndex")).toBe(-1);
  });

  it("continues an arrow from the focused item, not the deferred value", () => {
    // The bug guarded (plan 359): a controlled parent that does not apply the
    // reported value leaves the ring ahead of the value-derived tab stop, so
    // starting the next move there repeated the first move and trapped the
    // keyboard. Both modes read the one cursor rule.
    const onPress = vi.fn();
    const handlersWithFocus = handlers(onPress);
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      { ...unfocused, focusedIndex: Option.some(1) },
      handlersWithFocus,
    );
    expectSome(hostHandler(group, "onKeyDown"))(keyEvent("right"));
    expect(onPress).toHaveBeenCalledWith("right");
    expect(handlersWithFocus.onFocusMove).toHaveBeenCalledWith(2);
  });

  it("keeps one tab stop in multiple mode, on the roving index", () => {
    const group = renderToggleGroup(
      multiple,
      testTheme,
      selected(["left", "right"]),
      2,
      unfocused,
      handlers(),
    );
    expect(
      [0, 1, 2].map((index) => propOf(group, index, "tabIndex")),
    ).toStrictEqual([-1, -1, 0]);
  });

  it("leaves a disabled item out of the tab order and refuses its press", () => {
    const onPress = vi.fn();
    const group = renderToggleGroup(
      {
        ...single,
        options: [
          { value: "left", label: "Align left" },
          { value: "centre", label: "Align centre", disabled: true },
        ],
      },
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(onPress),
    );
    expect(hostProp(itemAt(group, 1), "tabIndex")).toStrictEqual(Option.none());
    expectSome(hostHandler(itemAt(group, 1), "onClick"))(clickEvent);
    expect(onPress).toHaveBeenCalledTimes(0);
  });

  it("lays items out along the chosen axis", () => {
    const vertical = renderToggleGroup(
      { ...single, orientation: "vertical" },
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    expect(expectSome(hostStyleString(vertical, "flexDirection"))).toBe(
      "column",
    );
  });

  it("paints the pressed item with the accent role", () => {
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    expect(
      expectSome(hostStyleString(itemAt(group, 0), "backgroundColor")),
    ).toBe(testTheme.colors.accent);
  });

  it("activates on Enter down and Space up, and on a click", () => {
    const onPress = vi.fn();
    const group = renderToggleGroup(
      single,
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(onPress),
    );
    const item = itemAt(group, 1);
    expectSome(hostHandler(item, "onKeyDown"))(keyEvent("enter"));
    expect(onPress).toHaveBeenLastCalledWith("centre");
    expectSome(hostHandler(item, "onKeyDown"))(keyEvent("space"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(item, "onKeyUp"))(keyUpEvent("space"));
    expect(onPress).toHaveBeenCalledTimes(2);
    expectSome(hostHandler(item, "onClick"))(clickEvent);
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it("derives each item's locator from the group's testId", () => {
    const group = renderToggleGroup(
      { ...single, testId: "align" },
      testTheme,
      selected(["left"]),
      0,
      unfocused,
      handlers(),
    );
    expect(
      elementChildren(group).map((item) =>
        expectSome(hostProp(item, "testId")),
      ),
    ).toStrictEqual(["align-left", "align-centre", "align-right"]);
  });
});
