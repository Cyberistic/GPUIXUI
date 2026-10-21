/**
 * `ToggleGroup` — the element tree the runtime receives.
 *
 * The two contracts this suite guards: an arrow key moves focus **without**
 * toggling (a toggle sets a mode for the next action, so moving focus must not
 * change it), and the group's single tab stop never sits on a disabled option.
 * State is announced through `aria-valuetext` because 0.11.0 has no
 * `aria-pressed`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { toggleSelection } from "../core/selection.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { type GroupFocus } from "./group.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleString,
} from "./testing/element.js";
import {
  renderToggleGroup,
  ToggleGroupItem,
  toggleGroupItems,
  toggleGroupValue,
  toggleGroupValues,
  type ToggleGroupHandlers,
  type ToggleGroupOption,
  type ToggleGroupState,
  type ToggleItemState,
} from "./ToggleGroup.js";

const idle: GroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

const handlers = (onToggle: (value: string) => void): ToggleGroupHandlers => ({
  onToggle,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

const options: ReadonlyArray<ToggleGroupOption> = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
];

const render = (
  props: Parameters<typeof renderToggleGroup>[0],
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  groupHandlers: ToggleGroupHandlers,
  focus: GroupFocus = idle,
) =>
  renderToggleGroup(
    props,
    testTheme,
    values,
    preferredIndex,
    focus,
    groupHandlers,
  );

const rows = (element: ReturnType<typeof renderToggleGroup>) =>
  elementChildren(element);

const stopOf = (row: ReturnType<typeof rows>[number]): number | "absent" =>
  Option.getOrElse(
    Option.flatMap(hostProp(row, "tabIndex"), (value) =>
      typeof value === "number" ? Option.some(value) : Option.none(),
    ),
    () => "absent",
  );

describe("toggleGroupValues", () => {
  it("reads a single string, an empty string and an array as the same value space", () => {
    expect(toggleGroupValues("bold")).toEqual(["bold"]);
    expect(toggleGroupValues("")).toEqual([]);
    expect(toggleGroupValues(["bold", "italic"])).toEqual(["bold", "italic"]);
  });

  it("hands a caller the shape its mode implies", () => {
    expect(toggleGroupValue("single", ["bold"])).toBe("bold");
    expect(toggleGroupValue("single", [])).toBe("");
    expect(toggleGroupValue("multiple", ["bold", "italic"])).toEqual([
      "bold",
      "italic",
    ]);
  });
});

describe("toggleSelection", () => {
  it("keeps at most one value in single mode, and pressing it clears it", () => {
    expect(toggleSelection("single", ["bold"], "italic")).toEqual(["italic"]);
    expect(toggleSelection("single", ["bold"], "bold")).toEqual([]);
  });

  it("adds and removes one value in multiple mode", () => {
    expect(toggleSelection("multiple", ["bold"], "italic")).toEqual([
      "bold",
      "italic",
    ]);
    expect(toggleSelection("multiple", ["bold", "italic"], "bold")).toEqual([
      "italic",
    ]);
  });
});

describe("ToggleGroup", () => {
  it("announces each option's pressed state as value text, and never invents aria-pressed", () => {
    const element = render(
      { options, label: "Formatting" },
      ["bold", "underline"],
      Option.none(),
      handlers(vi.fn()),
    );

    expect(expectSome(hostProp(element, "role"))).toBe("group");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Formatting");
    expect(
      rows(element).map((row) => expectSome(hostProp(row, "aria-valuetext"))),
    ).toEqual(["pressed", "not pressed", "pressed"]);
    expect(rows(element).map((row) => hostProp(row, "aria-pressed"))).toEqual([
      Option.none(),
      Option.none(),
      Option.none(),
    ]);
  });

  it("keeps the tab stop on an option a keyboard user can reach", () => {
    const element = render(
      {
        options: [
          { value: "bold", label: "Bold", disabled: true },
          { value: "italic", label: "Italic" },
          { value: "underline", label: "Underline" },
        ],
      },
      [],
      Option.some(0),
      handlers(vi.fn()),
    );

    expect(rows(element).map(stopOf)).toEqual(["absent", 0, -1]);
  });

  it("moves focus with an arrow without toggling the mode", () => {
    const onToggle = vi.fn();
    const groupHandlers = handlers(onToggle);
    const element = render(
      { options },
      ["bold"],
      Option.some(0),
      groupHandlers,
    );

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));

    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(1);
    expect(onToggle).toHaveBeenCalledTimes(0);
  });

  it("toggles the focused option on Space-up and on Enter-down", () => {
    const onToggle = vi.fn();
    const element = render({ options }, [], Option.some(1), handlers(onToggle));

    const press = keyEvent("space");
    expectSome(hostHandler(element, "onKeyDown"))(press);
    expect(onToggle).toHaveBeenCalledTimes(0);
    expect(press.prevented).toBe(true);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onToggle).toHaveBeenCalledWith("italic");

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("skips a disabled option in the arrow navigation", () => {
    const groupHandlers = handlers(vi.fn());
    const element = render(
      {
        options: [
          { value: "bold", label: "Bold" },
          { value: "italic", label: "Italic", disabled: true },
          { value: "underline", label: "Underline" },
        ],
      },
      [],
      Option.some(0),
      groupHandlers,
    );

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));

    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(2);
  });

  it("toggles on a click, and a disabled option installs no press at all", () => {
    const onToggle = vi.fn();
    const element = render(
      { options: [{ value: "bold", label: "Bold" }] },
      [],
      Option.none(),
      handlers(onToggle),
    );
    const row = rows(element)[0] ?? expect.fail("no row");

    expectSome(hostHandler(row, "onClick"))({
      elementId: 0,
      eventType: "click",
    });
    expect(onToggle).toHaveBeenCalledWith("bold");

    const blocked = render(
      { options: [{ value: "bold", label: "Bold", disabled: true }] },
      [],
      Option.none(),
      handlers(vi.fn()),
    );
    const blockedRow = rows(blocked)[0] ?? expect.fail("no row");

    expect(hostHandler(blockedRow, "onClick")).toStrictEqual(Option.none());
    expect(stopOf(blockedRow)).toBe("absent");
  });

  it("hands a style callback the group's live state and lets its result win", () => {
    const seen: ToggleGroupState[] = [];
    const element = render(
      {
        options,
        style: (live) => {
          seen.push(live);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      [],
      Option.none(),
      handlers(vi.fn()),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
    );

    expect(seen).toEqual([{ disabled: false, focused: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("styles each option button from its own pressed state", () => {
    const seen: ToggleItemState[] = [];
    const element = render(
      {
        options,
        itemStyle: (live) => {
          seen.push(live);
          return live.pressed
            ? { backgroundColor: testTheme.colors.primary }
            : live.disabled
              ? { backgroundColor: testTheme.colors.muted }
              : { backgroundColor: testTheme.colors.card };
        },
      },
      ["bold"],
      Option.some(0),
      handlers(vi.fn()),
      { focusedIndex: Option.some(2), onFocus: vi.fn(), onBlur: vi.fn() },
    );

    expect(seen).toEqual([
      { disabled: false, focused: false, pressed: true },
      { disabled: false, focused: false, pressed: false },
      { disabled: false, focused: true, pressed: false },
    ]);
    expect(
      rows(element).map((row) =>
        expectSome(hostStyleString(row, "backgroundColor")),
      ),
    ).toEqual([
      testTheme.colors.primary,
      testTheme.colors.card,
      testTheme.colors.card,
    ]);
  });
});

/** Two items written as elements, the second one rich. */
const itemChildren = (
  <>
    <ToggleGroupItem value="bold" label="Bold" />
    <ToggleGroupItem value="italic" label="Italic">
      <Icon name="check" color="red" size={8} />
    </ToggleGroupItem>
  </>
);

describe("toggleGroupItems", () => {
  it("reads its children into the same option list the data prop produces", () => {
    const items = toggleGroupItems({ children: itemChildren });

    expect(items.map((item) => item.value)).toEqual(["bold", "italic"]);
    expect(items[1]?.content).toBeDefined();
    expect(items[1]?.label).toBe("Italic");
  });

  it("draws an item's rich content inside its button", () => {
    const element = render(
      { children: itemChildren },
      [],
      Option.none(),
      handlers(vi.fn()),
    );
    const italic = rows(element)[1] ?? expect.fail("no second row");
    const body = elementChildren(italic)[0] ?? expect.fail("no item body");
    const glyph = elementChildren(body)[0] ?? expect.fail("no rich content");

    expect(expectSome(elementProp(glyph, "name"))).toBe("check");
  });
});
