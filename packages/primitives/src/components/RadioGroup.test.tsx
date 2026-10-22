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
import { targetSize } from "@gpuixui/tokens";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  initialActiveIndex,
  radioItems,
  RadioGroupItem,
  renderRadioGroup,
  type RadioGroupHandlers,
  type RadioGroupFocus,
  type RadioGroupState,
  type RadioItemState,
  type RadioOption,
} from "./RadioGroup.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostRef,
  hostStyle,
  hostStyleString,
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

  it("moves the tab stop off a chosen option that cannot take focus", () => {
    // The bug guarded: the stop stayed on the selected option even when it was
    // disabled, and a disabled row has no tabIndex, so the group had no
    // reachable stop and a keyboard user could not enter it at all.
    const element = renderRadioGroup(
      {
        options: [
          { value: "alpha", label: "Alpha", disabled: true },
          { value: "beta", label: "Beta" },
        ],
      },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );

    expect(rows(element).map(stopOf)).toEqual(["absent", 0]);
  });

  it("hands a style callback the group's live state and lets its result win", () => {
    const seen: RadioGroupState[] = [];
    const element = renderRadioGroup(
      {
        options,
        style: (live) => {
          seen.push(live);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      text("alpha"),
      0,
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      radioHandlers(vi.fn()),
    );

    expect(seen).toEqual([{ disabled: false, focused: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("styles each option row from its own state", () => {
    const seen: RadioItemState[] = [];
    const element = renderRadioGroup(
      {
        options: [
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta", disabled: true },
          { value: "gamma", label: "Gamma" },
        ],
        itemStyle: (live) => {
          seen.push(live);
          return live.checked
            ? { backgroundColor: testTheme.colors.primary }
            : live.disabled
              ? { backgroundColor: testTheme.colors.muted }
              : { backgroundColor: testTheme.colors.card };
        },
      },
      testTheme,
      text("alpha"),
      0,
      { focusedIndex: Option.some(2), onFocus: vi.fn(), onBlur: vi.fn() },
      radioHandlers(vi.fn()),
    );

    expect(seen).toEqual([
      { disabled: false, focused: false, checked: true },
      { disabled: true, focused: false, checked: false },
      { disabled: false, focused: true, checked: false },
    ]);
    expect(
      rows(element).map((row) =>
        expectSome(hostStyleString(row, "backgroundColor")),
      ),
    ).toEqual([
      testTheme.colors.primary,
      testTheme.colors.muted,
      testTheme.colors.card,
    ]);
  });

  it("puts the ring, the floor and the press on the row, not its circle", () => {
    // The bugs these guard: `focusVisible` on the circle never painted (the
    // runtime applies a focus refinement only to an element it tracks focus
    // for), the circle's fill owns a mouse-blocking hitbox so it swallowed the
    // row's press, and a single-line row measured 17px tall — under the floor.
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const row = expectSome(Option.fromNullishOr(rows(element)[0]));
    const circle = expectSome(Option.fromNullishOr(elementChildren(row)[0]));

    expect(Option.isSome(hostStyle(row, "focusVisible"))).toBe(true);
    expect(Option.isSome(hostStyle(circle, "focusVisible"))).toBe(false);
    expect(expectSome(hostStyleString(circle, "pointerEvents"))).toBe("none");
    expect(expectSome(hostStyle(row, "minHeight"))).toBe(targetSize.minimum);
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

/** A row's tab stop, with "absent" standing in for `undefined`. */
const stopOf = (row: ReturnType<typeof rows>[number]): number | "absent" =>
  Option.getOrElse(
    Option.flatMap(hostProp(row, "tabIndex"), (value) =>
      typeof value === "number" ? Option.some(value) : Option.none(),
    ),
    () => "absent",
  );

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

  it("publishes a trimmed row name, and no name at all for a blank label", () => {
    // The bug guarded: the row's `aria-label` was the option's label verbatim,
    // so a padded label announced its padding and a blank one published `""` —
    // an empty name in the accessibility tree rather than no name, which is
    // what the package's `accessibleName` rule exists to prevent everywhere
    // else.
    const element = renderRadioGroup(
      {
        options: [
          { value: "icon", label: "   " },
          { value: "alpha", label: "  Alpha  " },
        ],
      },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );

    expect(rows(element).map((row) => hostProp(row, "aria-label"))).toEqual([
      Option.none(),
      Option.some("Alpha"),
    ]);
  });
});

// The `Checkbox`/`Switch` halves of the old selection suite moved to their own
// files: those two controls do not need the native binding, and keeping them in
// one file made a `useGpuix` import in `RadioGroup` take their tests down with
// it.

describe("a radio group's address and help", () => {
  it("announces the help on the group and addresses the row that holds the tab stop", () => {
    // Bug guarded: a form could not focus the group it failed on, and a
    // `Label`'s description reached nobody. The wrapper is not focusable, so
    // the address lands on the roving row; the help describes the group, not
    // each choice.
    const ref = vi.fn();
    const layout = vi.fn();
    const element = renderRadioGroup(
      {
        options,
        label: "Plan",
        description: "Choose the plan you want to bill.",
        ref,
        "aria-id": "plan-group",
        onLayout: layout,
      },
      testTheme,
      text("beta"),
      1,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Choose the plan you want to bill.",
    );
    // `beta` is selected, so its row is the tab stop and therefore the address.
    const beta = rows(element)[1] ?? expect.fail("no beta row");
    const merged = Option.getOrElse(hostRef(beta), () =>
      expect.fail("the beta row carried no ref"),
    );
    merged(null);
    expect(ref).toHaveBeenCalledWith(null);
    expect(expectSome(hostProp(beta, "aria-id"))).toBe("plan-group");
    expect(Option.getOrUndefined(hostHandler(beta, "onLayout"))).toBe(layout);
    const alpha = rows(element)[0] ?? expect.fail("no alpha row");
    expect(hostProp(alpha, "aria-id")).toStrictEqual(Option.none());
  });

  it("moves the address with the tab stop when the selection moves", () => {
    const ref = vi.fn();
    const element = renderRadioGroup(
      { options, ref, "aria-id": "plan-group" },
      testTheme,
      text("gamma"),
      2,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const gamma = rows(element)[2] ?? expect.fail("no gamma row");
    const merged = Option.getOrElse(hostRef(gamma), () =>
      expect.fail("the gamma row carried no ref"),
    );
    merged(null);
    expect(ref).toHaveBeenCalledWith(null);
    expect(expectSome(hostProp(gamma, "aria-id"))).toBe("plan-group");
  });
});
