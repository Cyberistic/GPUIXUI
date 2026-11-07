import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { keyboardFocusRing, targetSize } from "@gpuixui/tokens";
import { decideTypeAhead } from "../core/keyboard.js";
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
import { groupOptions } from "./group.js";
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
const labels = Arr.map(options, (option) => option.label);

const typeAhead = (from: number, key: string) =>
  decideTypeAhead(labels, from, key);

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

  it("lands on the option a typed prefix names, and selects it", () => {
    const onSelect = vi.fn();
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      { ...radioHandlers(onSelect), typeAhead },
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("g"));
    expect(onSelect).toHaveBeenCalledWith("gamma");
  });

  it("selects on the Space release, not on the press before it", () => {
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

  it("reads a stored orientation name as the documented vertical axis", () => {
    const onSelect = vi.fn();
    const groupHandlers = radioHandlers(onSelect);
    const element = renderRadioGroup(
      { options, orientation: "row" as "vertical" },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      groupHandlers,
    );

    expect(hostStyleString(element, "flexDirection")).toStrictEqual(
      Option.some("column"),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onSelect).toHaveBeenCalledWith("beta");
    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(1);
  });

  it("continues from the row that holds focus when the owner has not applied the choice", () => {
    const onSelect = vi.fn();
    const handlers = radioHandlers(onSelect);
    const element = renderRadioGroup(
      { options },
      testTheme,

      text("alpha"),
      0,
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      handlers,
    );
    expect(rows(element).map(stopOf)).toEqual([-1, 0, -1]);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledWith("gamma");
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onSelect).toHaveBeenLastCalledWith("beta");
  });

  it("falls back to the value's row when the focused row can no longer take keys", () => {
    const handlers = radioHandlers(vi.fn());
    const element = renderRadioGroup(
      {
        options: [
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta", disabled: true },
          { value: "gamma", label: "Gamma" },
        ],
      },
      testTheme,
      text("gamma"),
      2,
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      handlers,
    );
    expect(rows(element).map(stopOf)).toEqual([-1, "absent", 0]);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(handlers.onFocusMove).toHaveBeenCalledWith(0);
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

  it("reports no focus for an option the group no longer draws", () => {
    const groupSeen: RadioGroupState[] = [];
    const rowSeen: RadioItemState[] = [];
    const element = renderRadioGroup(
      {
        options: Arr.take(options, 2),
        style: (live) => {
          groupSeen.push(live);
          return {};
        },
        itemStyle: (live) => {
          rowSeen.push(live);
          return {};
        },
      },
      testTheme,
      text("alpha"),
      0,
      { focusedIndex: Option.some(2), onFocus: vi.fn(), onBlur: vi.fn() },
      radioHandlers(vi.fn()),
    );

    expect(groupSeen).toEqual([{ disabled: false, focused: false }]);
    expect(Arr.every(rowSeen, (row) => !row.focused)).toBe(true);
    expect(stopOf(rows(element)[0] ?? expect.fail("no row"))).toBe(0);
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

  it("marks an invalid group on every empty edge and every row ring", () => {
    const element = renderRadioGroup(
      { options, invalid: true },
      testTheme,
      text("alpha"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    const checkedRow = expectSome(Option.fromNullishOr(rows(element)[0]));
    const emptyRow = expectSome(Option.fromNullishOr(rows(element)[1]));
    const checkedCircle = expectSome(
      Option.fromNullishOr(elementChildren(checkedRow)[0]),
    );
    const emptyCircle = expectSome(
      Option.fromNullishOr(elementChildren(emptyRow)[0]),
    );

    expect(expectSome(hostStyleString(checkedCircle, "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
    expect(expectSome(hostStyleString(emptyCircle, "borderColor"))).toBe(
      testTheme.colors.destructive,
    );
    expect(hostStyle(emptyCircle, "backgroundColor")).toStrictEqual(
      Option.none(),
    );
    Arr.forEach([checkedRow, emptyRow], (row) =>
      expect(hostStyle(row, "focusVisible")).toStrictEqual(
        Option.some({
          ...keyboardFocusRing(testTheme).focusVisible,
          outlineColor: testTheme.colors.destructive,
        }),
      ),
    );
  });
});

const itemChildren = (
  <>
    <RadioGroupItem value="alpha" label="Alpha" />
    <RadioGroupItem value="beta" label="Beta" disabled>
      <Icon name="check" color="red" size={8} />
    </RadioGroupItem>
    <RadioGroupItem value="gamma" label="Gamma" description="Last" />
  </>
);

const rows = (element: ReturnType<typeof renderRadioGroup>) =>
  elementChildren(element);

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

    expect(items[1]?.content).toBeDefined();
    expect(items[1]?.label).toBe("Beta");
  });

  it("reads a stored list structurally, dropping a record it cannot place", () => {
    const items = groupOptions([
      null,
      { value: "alpha" },
      { value: "beta", label: "   " },
      { label: "No value" },
    ]);
    expect(items).toEqual([
      { value: "alpha", label: "", disabled: false },
      { value: "beta", label: "   ", disabled: false },
    ]);
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

  it("announces an option's caption as the row's help", () => {
    const element = renderRadioGroup(
      {
        options: [
          { value: "weekly", label: "Weekly", description: "Every Monday." },
          { value: "monthly", label: "Monthly", description: "   " },
        ],
      },
      testTheme,
      text("weekly"),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );

    expect(
      rows(element).map((row) =>
        Option.getOrUndefined(hostProp(row, "aria-description")),
      ),
    ).toEqual(["Every Monday.", undefined]);
  });

  it("paints an option whose value is the empty string as the chosen one", () => {
    const element = renderRadioGroup(
      {
        options: [
          { value: "", label: "Any" },
          { value: "eu", label: "EU" },
        ],
      },
      testTheme,
      text(""),
      0,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(
      rows(element).map((row) => expectSome(hostProp(row, "aria-valuetext"))),
    ).toStrictEqual(["checked", "unchecked"]);
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

describe("a radio group's address and help", () => {
  it("announces the help on the group and addresses the row that holds the tab stop", () => {
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

describe("a radio group's row locators", () => {
  it("names each row from its value and leaves the group's own id on the wrapper", () => {
    const element = renderRadioGroup(
      {
        options,
        testId: "plan",
        itemTestId: (value) => `plan-${value}`,
      },
      testTheme,
      text("beta"),
      1,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(expectSome(hostProp(element, "testId"))).toBe("plan");
    expect(
      Arr.map(rows(element), (row) =>
        Option.getOrElse(hostProp(row, "testId"), () => "unnamed"),
      ),
    ).toEqual(["plan-alpha", "plan-beta", "plan-gamma"]);
  });

  it("paints no row locator when the caller derives none", () => {
    const element = renderRadioGroup(
      { options, testId: "plan" },
      testTheme,
      text("beta"),
      1,
      unfocused,
      radioHandlers(vi.fn()),
    );
    expect(
      Arr.filter(rows(element), (row) =>
        Option.isSome(hostProp(row, "testId")),
      ),
    ).toHaveLength(0);
  });
});
