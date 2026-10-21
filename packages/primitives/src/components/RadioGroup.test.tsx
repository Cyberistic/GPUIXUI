/**
 * `RadioGroup` — the element tree the runtime receives.
 *
 * The bug this suite guards is the roving tab stop: arrows changed the
 * selection but native focus stayed on the old radio, so the platform's
 * "selection follows focus" contract was broken and a ring would have sat on
 * the wrong item. It also holds the group to the supported accessibility
 * subset: `@gpuix/native` 0.11.0 has no `aria-checked`, so state is announced through
 * `aria-valuetext`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  initialActiveIndex,
  radioItems,
  RadioGroupItem,
  renderRadioGroup,
  type RadioGroupHandlers,
  type RadioGroupFocus,
  type RadioOption,
} from "./RadioGroup.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostTag,
} from "./testing/element.js";

const unfocused: RadioGroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
/** The group's handlers, with the focus move recorded by default. */
const radioHandlers = (
  onSelect: (value: string) => void,
): RadioGroupHandlers => ({
  onSelect,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});
const text = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");

const options: ReadonlyArray<RadioOption> = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma" },
];

describe("RadioGroup", () => {
  it("moves the selection with the arrow key and reports the option it landed on", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(onSelect),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("radiogroup");
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("selects on the Space release, not on the press before it", () => {
    // The bug guarded: the group handled only the press, where Space is not an
    // activation, so Space did nothing although the docs promise it selects.
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("beta"),
      1,
      unfocused,
      radioHandlers(onSelect),
    );
    const press = keyEvent("space");
    expectSome(hostHandler(element, "onKeyDown"))(press);
    expect(onSelect).toHaveBeenCalledTimes(0);
    expect(press.prevented).toBe(true);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("moves focus to the option an arrow lands on", () => {
    const handlers = radioHandlers(vi.fn());
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      handlers,
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(1);
  });

  it("jumps focus to the option Home lands on", () => {
    const handlers = radioHandlers(vi.fn());
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      handlers,
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("home"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(0);
    expect(handlers.onFocusMove).toHaveBeenCalledTimes(1);
  });

  it("wraps from the last option back to the first", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      radioHandlers(onSelect),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("alpha");
  });

  it("never selects a disabled option through a click", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options: [{ value: "alpha", label: "Alpha", disabled: true }] },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(onSelect),
    );
    expect(expectSome(hostTag(element))).toBe("div");
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("starts the roving index on the selection, or the first option a user can pick", () => {
    expect(initialActiveIndex(options, "gamma")).toBe(2);
    expect(
      initialActiveIndex(
        [
          { value: "a", label: "A", disabled: true },
          { value: "b", label: "B" },
        ],
        "",
      ),
    ).toBe(1);
  });
});

/** Three items written as elements, the middle one disabled and rich. */
const itemChildren = (
  <>
    <RadioGroupItem value="alpha" label="Alpha" />
    <RadioGroupItem value="beta" label="Beta" disabled>
      <Icon name="check" color="red" size={8} />
    </RadioGroupItem>
    <RadioGroupItem value="gamma" label="Gamma" description="Last" />
  </>
);

/** The group's option rows, from the rendered tree. */
const rows = (element: ReturnType<typeof renderRadioGroup>) =>
  elementChildren(element);

describe("RadioGroupItem", () => {
  it("reads its children into the same option list the data prop produces", () => {
    const items = radioItems({ children: itemChildren });

    expect(items.map((item) => item.value)).toEqual(["alpha", "beta", "gamma"]);
    expect(items.map((item) => item.disabled)).toEqual([
      undefined,
      true,
      undefined,
    ]);
    // Rich content is carried through, and the name stays the label.
    expect(items[1]?.content).toBeDefined();
    expect(items[1]?.label).toBe("Beta");
  });

  it("moves the selection and focus with an arrow, exactly as data options do", () => {
    const onSelect = vi.fn();
    const handlers = radioHandlers(onSelect);
    const element = renderRadioGroup(
      { children: itemChildren },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      handlers,
    );

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));

    // `beta` is disabled, so the arrow lands on `gamma` — the same skip the
    // data path performs.
    expect(onSelect).toHaveBeenCalledWith("gamma");
    expect(handlers.onFocusMove).toHaveBeenCalledWith(2);
  });

  it("announces the selected state of the item whose value matches", () => {
    const element = renderRadioGroup(
      { children: itemChildren },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const states = rows(element).map((row) =>
      expectSome(hostProp(row, "aria-valuetext")),
    );

    expect(states).toEqual(["unchecked", "unchecked", "checked"]);
  });

  it("draws the item's rich content in the row", () => {
    const element = renderRadioGroup(
      { children: itemChildren },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const beta = rows(element)[1] ?? expect.fail("no second row");
    // The row draws its box, then the body that holds the item's content.
    const body = elementChildren(beta)[1] ?? expect.fail("no item body");
    const glyph = elementChildren(body)[0] ?? expect.fail("no rich content");

    expect(expectSome(elementProp(glyph, "name"))).toBe("check");
  });

  it("still names every row for assistive technology", () => {
    const element = renderRadioGroup(
      { children: itemChildren },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );

    expect(
      rows(element).map((row) => expectSome(hostProp(row, "aria-label"))),
    ).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});

// The `Checkbox`/`Switch` halves of the old selection suite moved to their own
// files: those two controls do not need the native binding, and keeping them in
// one file made a `useGpuix` import in `RadioGroup` take their tests down with
// it.
