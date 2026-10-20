/**
 * A data option with a blank label is not an unnamed control (plan 589).
 *
 * The bug this guards: the data-driven option rows passed `option.label`
 * straight through `ariaName`, so a computed empty label removed the row's
 * name while its role, hit area and tab stop stayed — an unnamed focus stop
 * (the class plan 578 fixed for the select-all parent). `Select` also painted
 * and announced the blank label. An option's `value` is its other identity, so
 * a blank label now falls back to it; a real label keeps its verbatim paint.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { ReactElement } from "react";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderCheckboxGroup,
  type CheckboxGroupFocus,
  type CheckboxGroupHandlers,
} from "./CheckboxGroup.js";
import {
  renderRadioGroup,
  type RadioGroupFocus,
  type RadioGroupHandlers,
} from "./RadioGroup.js";
import {
  renderToggleGroup,
  type ToggleGroupFocus,
  type ToggleGroupHandlers,
} from "./ToggleGroup.js";
import { renderSelect, type SelectHandlers } from "./Select.js";
import { elementChildren, elementProp, expectSome } from "./testing/element.js";

const noFocus = {
  focusedIndex: Option.none<number>(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
const checkboxFocus: CheckboxGroupFocus = noFocus;
const radioFocus: RadioGroupFocus = noFocus;
const toggleFocus: ToggleGroupFocus = noFocus;

const checkboxHandlers: CheckboxGroupHandlers = {
  onToggle: vi.fn(),
  onToggleAll: vi.fn(),
};
const radioHandlers: RadioGroupHandlers = {
  onSelect: vi.fn(),
  onFocusMove: vi.fn(),
  onTypeahead: vi.fn(),
  registerItem: () => () => {},
};
const toggleHandlers: ToggleGroupHandlers = {
  onPress: vi.fn(),
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
};
const selectHandlers: SelectHandlers = {
  onOpenChange: () => {},
  onValueChange: () => {},
  registerTrigger: () => {},
  registerContent: () => {},
  registerItem: () => () => {},
  onHighlight: () => {},
};

const empty = (): ReturnType<typeof initValueState<ReadonlyArray<string>>> =>
  initValueState(Option.some([]), []);
const noSelection = () =>
  initValueState<string | undefined>(Option.none(), undefined);
const selected = (value: string) =>
  initValueState<string | undefined>(Option.some(value), undefined);

/** A direct child by its `testId`, failing the test when the tree lacks it. */
const childById = (element: ReactElement, testId: string): ReactElement =>
  expectSome(
    Arr.findFirst(
      elementChildren(element),
      (child) => Option.getOrUndefined(elementProp(child, "testId")) === testId,
    ),
  );

/** The string a `Text`/`div` child paints. */
const painted = (element: ReactElement): string =>
  `${expectSome(elementProp(element, "children"))}`;

const itemsOf = (element: ReactElement) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
    )(expectSome(elementProp(element, "items"))),
  );

describe("CheckboxGroup", () => {
  it("names and paints a blank-labelled row by its value", () => {
    const element = renderCheckboxGroup(
      {
        testId: "cg",
        label: "Channels",
        options: [
          { value: "apple", label: "   " },
          { value: "pear", label: "Pear" },
        ],
      },
      testTheme,
      empty(),
      checkboxFocus,
      checkboxHandlers,
    );
    const apple = childById(element, "cg-apple");
    expect(expectSome(elementProp(apple, "aria-label"))).toBe("apple");
    const column = expectSome(Option.fromNullishOr(elementChildren(apple)[1]));
    expect(
      painted(expectSome(Option.fromNullishOr(elementChildren(column)[0]))),
    ).toBe("apple");
    expect(
      expectSome(elementProp(childById(element, "cg-pear"), "aria-label")),
    ).toBe("Pear");
  });

  it("leaves a fully blank option unnamed and unpainted", () => {
    const element = renderCheckboxGroup(
      {
        testId: "cg",
        options: [{ value: "  ", label: "   " }],
      },
      testTheme,
      empty(),
      checkboxFocus,
      checkboxHandlers,
    );
    const row = childById(element, "cg-  ");
    expect(elementProp(row, "aria-label")).toStrictEqual(Option.none());
  });
});

describe("RadioGroup", () => {
  it("names a blank-labelled row by its value and keeps a real label verbatim", () => {
    const element = renderRadioGroup(
      {
        testId: "rg",
        label: "Colour",
        options: [
          { value: "red", label: "" },
          { value: "blue", label: "  Blue  " },
        ],
      },
      testTheme,
      noSelection(),
      0,
      radioFocus,
      radioHandlers,
    );
    const red = childById(element, "rg-red");
    expect(expectSome(elementProp(red, "aria-label"))).toBe("red");
    expect(
      painted(expectSome(Option.fromNullishOr(elementChildren(red)[1]))),
    ).toBe("red");
    const blue = childById(element, "rg-blue");
    expect(expectSome(elementProp(blue, "aria-label"))).toBe("Blue");
    expect(
      painted(expectSome(Option.fromNullishOr(elementChildren(blue)[1]))),
    ).toBe("  Blue  ");
  });
});

describe("ToggleGroup", () => {
  it("names and paints a blank-labelled item by its value", () => {
    const element = renderToggleGroup(
      {
        testId: "tg",
        type: "single",
        options: [
          { value: "left", label: "  " },
          { value: "right", label: "Right" },
        ],
      },
      testTheme,
      empty(),
      0,
      toggleFocus,
      toggleHandlers,
    );
    const left = childById(element, "tg-left");
    expect(expectSome(elementProp(left, "aria-label"))).toBe("left");
    expect(
      painted(expectSome(Option.fromNullishOr(elementChildren(left)[0]))),
    ).toBe("left");
  });
});

describe("Select", () => {
  it("paints and announces a blank-labelled selected option by its value", () => {
    const element = renderSelect(
      {
        testId: "sel",
        label: "Fruit",
        options: [
          { value: "one", label: "   " },
          { value: "two", label: "Two" },
        ],
      },
      testTheme,
      selected("one"),
      false,
      { focused: false, onFocus: () => {}, onBlur: () => {} },
      selectHandlers,
    );
    const items = itemsOf(element);
    expect(items[0]?.label).toBe("one");
    expect(items[0]?.textValue).toBe("one");
    expect(items[1]?.label).toBe("Two");
    expect(
      expectSome(
        elementProp(childById(element, "sel-trigger"), "aria-valuetext"),
      ),
    ).toBe("one");
    const option = childById(
      childById(element, "sel-content"),
      "sel-option-one",
    );
    expect(expectSome(elementProp(option, "aria-label"))).toBe("one");
  });
});
