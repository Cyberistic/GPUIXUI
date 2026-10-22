/**
 * `Select` and `Tooltip` are themed wrappers over GPUix's own published controls
 * (plan 020 §1.5), so what this package owns — and what this suite pins — is the
 * paint and the data mapping. The list's open/close and arrow behaviour is
 * GPUix's and is exercised in the native runtime, not here.
 *
 * The bug it catches: a selected item that looks the same as a hovered one, a
 * disabled item that still offers a pointer, and a trigger that shows a raw
 * option value because the label mapping was dropped.
 */

import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { testTheme } from "../core/testing/theme.fixture.js";
import { fieldVariant } from "../core/variants.js";
import {
  isSelectGroup,
  renderSelect,
  selectContentStyle,
  selectItemStyle,
  selectLabelStyle,
  selectOptions,
  selectSeparatorStyle,
  selectTriggerStyle,
  type SelectEntry,
  type SelectItemState,
  type SelectTriggerState,
} from "./Select.js";
import { tooltipStyle } from "./Tooltip.js";
import { elementChildren, elementProp, expectSome } from "./testing/element.js";

const rest = { selected: false, highlighted: false, disabled: false };

const itemsOf = (element: Parameters<typeof elementProp>[0]) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
    )(expectSome(elementProp(element, "items"))),
  );

/** A rendered select's option rows, read out of the part tree. */
const itemParts = (element: ReactElement): ReadonlyArray<ReactElement> => {
  const content =
    elementChildren(element)[1] ??
    expect.fail("the select rendered no content part");
  return elementChildren(content);
};

/** A React element, decoded at the boundary instead of asserted. */
const ElementNode = Schema.declare(
  (input: unknown): input is ReactElement =>
    typeof input === "object" && input !== null && isValidElement(input),
  { description: "A React element, before the runtime sees it." },
);

/** A row's children function, which the runtime calls with the row's state. */
const rowChildren = (
  item: ReactElement,
): ((state: SelectItemState) => unknown) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.declare(
        (input: unknown): input is (state: SelectItemState) => unknown =>
          typeof input === "function",
        { description: "A SelectItem's function children." },
      ),
    )(expectSome(elementProp(item, "children"))),
  );

/** The row a selected or resting item paints. */
const rowOf = (item: ReactElement, state: SelectItemState): ReactElement =>
  expectSome(Schema.decodeUnknownOption(ElementNode)(rowChildren(item)(state)));

/** Two named groups, the second with a disabled row. */
const grouped: ReadonlyArray<SelectEntry> = [
  {
    label: "Fruit",
    options: [
      { value: "apple", label: "Apple" },
      { value: "pear", label: "Pear" },
    ],
  },
  {
    label: "Vegetables",
    options: [
      { value: "leek", label: "Leek" },
      { value: "yam", label: "Yam", disabled: true },
    ],
  },
];

describe("Select groups", () => {
  it("paints the caption in the muted role and the rule one pixel tall", () => {
    expect(selectLabelStyle(testTheme).color).toBe(
      testTheme.colors.mutedForeground,
    );
    expect(selectSeparatorStyle(testTheme).height).toBe(1);
  });

  it("flattens the groups into one list in render order", () => {
    expect(selectOptions(grouped).map((option) => option.value)).toEqual([
      "apple",
      "pear",
      "leek",
      "yam",
    ]);
    expect(isSelectGroup(grouped[0] ?? { value: "", label: "" })).toBe(true);
    expect(isSelectGroup({ value: "apple", label: "Apple" })).toBe(false);
  });

  it("paints a caption and a rule around each group, and the flat list to the runtime", () => {
    const element = renderSelect({ options: grouped }, testTheme);

    // The trigger still needs every label, so the runtime receives one flat list
    // in the same order the rows paint.
    expect(itemsOf(element).map((item) => item["value"])).toEqual([
      "apple",
      "pear",
      "leek",
      "yam",
    ]);

    const content =
      elementChildren(element)[1] ??
      expect.fail("the select rendered no content part");
    const parts = elementChildren(content);

    // Two groups with a rule between them: group, separator, group.
    expect(parts).toHaveLength(3);
    expect(
      elementChildren(parts[0] ?? expect.fail("no first group")),
    ).toHaveLength(3);
    expect(
      elementChildren(parts[1] ?? expect.fail("no separator")),
    ).toHaveLength(0);
    expect(
      elementChildren(parts[2] ?? expect.fail("no second group")),
    ).toHaveLength(3);
  });

  it("keeps every grouped row a real item with its own state function", () => {
    const element = renderSelect({ options: grouped }, testTheme);
    const content =
      elementChildren(element)[1] ??
      expect.fail("the select rendered no content part");
    const firstGroup = elementChildren(content)[0] ?? expect.fail("no group");
    const [label, apple] = elementChildren(firstGroup);

    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "children")),
    ).toBe("Fruit");
    expect(
      expectSome(elementProp(apple ?? expect.fail("no item"), "value")),
    ).toBe("apple");
    expect(
      rowOf(apple ?? expect.fail("no item"), { ...rest, selected: true }),
    ).toBeDefined();
  });
});

describe("Select", () => {
  it("paints a selected item differently from a hovered or resting one", () => {
    const paint = selectItemStyle(testTheme);
    const selected = paint({ ...rest, selected: true });
    const highlighted = paint({ ...rest, highlighted: true });
    expect(selected.backgroundColor).toBe(testTheme.colors.selected);
    expect(highlighted.backgroundColor).toBe(testTheme.colors.hover);
    expect(paint(rest).backgroundColor).toBeUndefined();
  });

  it("keeps a disabled item from offering a pointer", () => {
    const disabled = selectItemStyle(testTheme)({ ...rest, disabled: true });
    expect(disabled.cursor).toBe("not-allowed");
    expect(disabled.color).toBe(testTheme.colors.disabledForeground);
  });

  it("declares the keyboard ring on the trigger, destructive while invalid", () => {
    // The bug: the trigger was the only Tier 1 control with no ring at all, so
    // a keyboard user could not see where Tab had landed.
    const ringAt = (spec: Parameters<typeof selectTriggerStyle>[0]) =>
      selectTriggerStyle(
        spec,
        testTheme,
      )({
        open: false,
        disabled: false,
        placeholder: false,
      });
    const rest = ringAt({ variant: fieldVariant, size: "md" });
    expect(rest.focusVisible?.outlineColor).toBe(testTheme.colors.ring);
    const invalid = ringAt({
      variant: fieldVariant,
      size: "md",
      invalid: true,
    });
    expect(invalid.focusVisible?.outlineColor).toBe(
      testTheme.colors.destructive,
    );
    const disabled = selectTriggerStyle(
      { variant: fieldVariant, size: "md" },
      testTheme,
    )({ open: false, disabled: true, placeholder: false });
    expect(disabled.focusVisible).toBeUndefined();
  });

  it("gives an invalid trigger the destructive border", () => {
    const trigger = selectTriggerStyle(
      { variant: fieldVariant, size: "md", invalid: true },
      testTheme,
    )({ open: false, disabled: false, placeholder: false });
    expect(trigger.borderColor).toBe(testTheme.colors.destructive);
  });

  it("opens onto the popover surface", () => {
    expect(selectContentStyle(testTheme).backgroundColor).toBe(
      testTheme.colors.popover,
    );
  });

  it("bounds the list and scrolls it, because the runtime sets no bound", () => {
    // The runtime's own content has no `maxHeight`/`overflow` and its edge-scroll
    // parts are empty in 0.11.0, so without this a 40-option list painted its
    // tail outside the window with nothing able to reach it.
    const style = selectContentStyle(testTheme);
    expect(style.maxHeight).toBe(320);
    expect(style.overflowY).toBe("scroll");
    expect(selectContentStyle(testTheme).padding).toBe(testTheme.spacing.xs);
  });

  it("maps the options to the labels the trigger shows", () => {
    const element = renderSelect(
      { options: [{ value: "alpha", label: "Alpha" }], disabled: true },
      testTheme,
    );
    expect(
      Option.map(Arr.head(itemsOf(element)), (item) => item["label"]),
    ).toStrictEqual(Option.some("Alpha"));
    expect(expectSome(elementProp(element, "disabled"))).toBe(true);
  });

  it("marks the selected row from the state the runtime reports", () => {
    // The bug guarded: a selected row was only a tint, so a reader who cannot
    // rely on colour had no mark. The children are a function of the row's own
    // reported state, so an uncontrolled Select needs no mirror of its value.
    const element = renderSelect(
      {
        options: [
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta" },
        ],
        value: "beta",
      },
      testTheme,
    );
    const [first, second] = itemParts(element);
    expect(
      elementChildren(
        rowOf(first ?? element, {
          selected: false,
          highlighted: false,
          disabled: false,
        }),
      ),
    ).toStrictEqual([]);
    const marks = elementChildren(
      rowOf(second ?? element, {
        selected: true,
        highlighted: false,
        disabled: false,
      }),
    );
    expect(marks).toHaveLength(1);
    expect(expectSome(elementProp(marks[0] ?? element, "name"))).toBe("check");
    expect(expectSome(elementProp(marks[0] ?? element, "color"))).toBe(
      testTheme.colors.popoverForeground,
    );
  });

  it("hands the trigger style callback its live state and lets its result win", () => {
    const seen: Array<SelectTriggerState> = [];
    const trigger = selectTriggerStyle(
      { variant: fieldVariant, size: "md", invalid: true },
      testTheme,
      (live) => {
        seen.push(live);
        return { backgroundColor: testTheme.colors.destructive };
      },
    )({ open: true, disabled: false, placeholder: false });

    expect(seen).toEqual([{ open: true, disabled: false, placeholder: false }]);
    expect(trigger.backgroundColor).toBe(testTheme.colors.destructive);
  });

  it("hands each option's style callback that option's state", () => {
    const seen: Array<SelectItemState> = [];
    const paint = selectItemStyle(testTheme, (live) => {
      seen.push(live);
      return {
        backgroundColor: live.selected
          ? testTheme.colors.primary
          : testTheme.colors.card,
      };
    });

    expect(paint({ ...rest, selected: true }).backgroundColor).toBe(
      testTheme.colors.primary,
    );
    expect(paint(rest).backgroundColor).toBe(testTheme.colors.card);
    expect(seen).toEqual([{ ...rest, selected: true }, rest]);
  });
});

describe("Select locators", () => {
  it("puts the trigger id on the trigger and derives one per option row", () => {
    // The bug guarded: `testId` landed on the root, which paints nothing but
    // the wrapper's width, so an automation host could address neither the
    // control nor a row and had to walk children and label text instead.
    const select = renderSelect(
      {
        options: [
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ],
        testId: "fruit",
        triggerTestId: "fruit-trigger",
        itemTestId: (value) => `fruit-${value}`,
      },
      testTheme,
    );
    const trigger = Arr.head(elementChildren(select));
    expect(
      Option.map(trigger, (element) =>
        expectSome(elementProp(element, "testId")),
      ),
    ).toStrictEqual(Option.some("fruit-trigger"));
    expect(
      Arr.map(itemParts(select), (item) =>
        expectSome(elementProp(item, "testId")),
      ),
    ).toEqual(["fruit-apple", "fruit-pear"]);
  });

  it("keeps the root id off the trigger and the rows", () => {
    // A caller passing only `testId` gets a locator for a wrapper that paints
    // no control: the trigger and every row stay unaddressable, by design.
    const select = renderSelect(
      {
        options: [{ value: "apple", label: "Apple" }],
        testId: "fruit",
      },
      testTheme,
    );
    const trigger = Arr.head(elementChildren(select));
    expect(
      Option.isNone(
        Option.flatMap(trigger, (element) => elementProp(element, "testId")),
      ),
    ).toBe(true);
    expect(
      Arr.map(itemParts(select), (item) =>
        Option.isNone(elementProp(item, "testId")),
      ),
    ).toEqual([true]);
  });
});

describe("Tooltip", () => {
  it("wears the popover surface and the caption type", () => {
    const style = tooltipStyle(testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.popover);
    expect(style.fontSize).toBe(testTheme.typography.caption.fontSize);
    expect(style.whiteSpace).toBe("nowrap");
  });
});
