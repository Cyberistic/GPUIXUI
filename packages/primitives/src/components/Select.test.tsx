/**
 * `Select` and `Tooltip` are themed wrappers over GPUix's own published controls
 * (see `docs/gpuix-capabilities.md`), so what this package owns — and what this suite pins — is the
 * paint and the data mapping. The list's open/close and arrow behaviour is
 * GPUix's and is exercised in the native runtime, not here.
 *
 * The bug it catches: a selected item that looks the same as a hovered one, a
 * disabled item that still offers a pointer, and a trigger that shows a raw
 * option value because the label mapping was dropped.
 */

import { describe, expect, it } from "vitest";
import { type ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  contrastFloors,
  contrastRatio,
  darkTheme,
  elevationShadow,
  lightTheme,
} from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import { fieldVariant } from "../core/variants.js";
import * as primitives from "../index.js";
import {
  isSelectGroup,
  renderSelect,
  renderSelectRow,
  selectContentStyle,
  selectItemStyle,
  selectLabelStyle,
  selectOptions,
  selectSeparatorStyle,
  selectTriggerStyle,
  type SelectEntry,
  type SelectItemState,
  type SelectOption,
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

/** The option a row component carries, decoded at the boundary. */
const optionOf = (row: ReactElement): SelectOption =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.declare(
        (input: unknown): input is SelectOption =>
          typeof input === "object" &&
          input !== null &&
          "value" in input &&
          "label" in input,
        { description: "A Select row's option." },
      ),
    )(expectSome(elementProp(row, "option"))),
  );

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

  it("keeps every grouped row a row of its own", () => {
    const element = renderSelect({ options: grouped }, testTheme);
    const content =
      elementChildren(element)[1] ??
      expect.fail("the select rendered no content part");
    const firstGroup = elementChildren(content)[0] ?? expect.fail("no group");
    const [label, apple] = elementChildren(firstGroup);

    expect(
      expectSome(elementProp(label ?? expect.fail("no label"), "children")),
    ).toBe("Fruit");
    expect(optionOf(apple ?? expect.fail("no item")).value).toBe("apple");
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

  it("keeps a selected row's label above the body floor on the selection wash", () => {
    // The gap this holds at the consumer: the selected row paints
    // `popoverForeground` on `selected`, and `contrastPairs` measures that role
    // on `popover`, `hover` and `active` — not on the selection wash. So a
    // recipe that moved the label to a role the wash erases would pass the
    // tokens gate. The pair is measured here off the painted style, in both
    // shipped palettes; adding it to `contrastPairs` is the tokens-side row in
    // `TODO.md`.
    Arr.forEach([lightTheme, darkTheme], (theme) => {
      const painted = selectItemStyle(theme)({ ...rest, selected: true });
      const ratio = expectSome(
        Option.fromNullishOr(
          contrastRatio(
            expectSome(Option.fromNullishOr(painted.color)),
            expectSome(Option.fromNullishOr(painted.backgroundColor)),
          ),
        ),
      );
      expect(ratio, theme.name).toBeGreaterThanOrEqual(contrastFloors.body);
    });
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

  it("paints an empty trigger's hint in the placeholder role", () => {
    // The bug guarded: GPUix's `SelectValue` paints its fallback inside the
    // trigger, so the trigger's own colour is what a hint inherits. It kept the
    // value role, so an unchosen select read as chosen and the measured
    // `placeholder` role — the one the contrast table holds on the field's fill
    // — was never painted by this control. A chosen value keeps the value role.
    const trigger = (placeholder: boolean) =>
      selectTriggerStyle(
        { variant: fieldVariant, size: "md" },
        testTheme,
      )({ open: false, disabled: false, placeholder });
    expect(trigger(true).color).toBe(testTheme.colors.placeholder);
    expect(trigger(false).color).toBe(testTheme.colors.inputForeground);
  });

  it("opens onto the popover surface", () => {
    expect(selectContentStyle(testTheme).backgroundColor).toBe(
      testTheme.colors.popover,
    );
  });

  it("lifts the list like every other floating surface", () => {
    // The bug guarded: the list floats over page content and was the one
    // floating surface with no lift — the page even claimed the reserved,
    // empty `overlay` level. It takes `lg`, the level dialogs, popovers and
    // menus paint, read from the same token table.
    expect(selectContentStyle(testTheme).boxShadow).toEqual(
      elevationShadow(testTheme, "lg"),
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
    // rely on colour had no mark. The mark is read off the row the state
    // produces, so an uncontrolled Select needs no mirror of its value.
    const marks = elementChildren(
      renderSelectRow({ value: "beta", label: "Beta" }, testTheme, true),
    );
    expect(marks).toHaveLength(1);
    const mark = marks[0] ?? expect.fail("the selected row painted no mark");
    expect(expectSome(elementProp(mark, "name"))).toBe("check");
    expect(expectSome(elementProp(mark, "color"))).toBe(
      testTheme.colors.popoverForeground,
    );
    expect(
      elementChildren(
        renderSelectRow({ value: "alpha", label: "Alpha" }, testTheme, false),
      ),
    ).toStrictEqual([]);
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

describe("Select's public surface", () => {
  it("exports the helpers its page names from the package root", () => {
    // The bug guarded: `docs/select.mdx` teaches `selectTriggerStyle`,
    // `selectContentStyle` and `selectItemStyle`, and the data helpers flatten a
    // grouped list — none of them was reachable from `@gpuixui/primitives`,
    // while every sibling family (radio, checkbox, toggle, rating) publishes
    // its helpers. A page naming a symbol a consumer cannot import is a dead
    // end.
    const family = [
      "isSelectGroup",
      "selectOptions",
      "selectTriggerStyle",
      "selectContentStyle",
      "selectLabelStyle",
      "selectSeparatorStyle",
      "selectItemStyle",
    ] as const;
    expect(
      Arr.filter(family, (name) => !(name in primitives)),
      "helpers missing from the package root",
    ).toEqual([]);
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
