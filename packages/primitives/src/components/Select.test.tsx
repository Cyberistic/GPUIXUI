import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
  selectEntries,
  selectItemStyle,
  selectLabelStyle,
  selectOptions,
  selectSeparatorStyle,
  selectTriggerStyle,
  selectValueLabel,
  type SelectEntry,
  type SelectItemState,
  type SelectOption,
  type SelectProps,
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

const itemParts = (element: ReactElement): ReadonlyArray<ReactElement> => {
  const content =
    elementChildren(element)[1] ??
    expect.fail("the select rendered no content part");
  return elementChildren(content);
};

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

describe("Select's stored list", () => {
  it("reads a list a store wrote as no list", () => {
    // @ts-expect-error — a list a store wrote as absent.
    const element = renderSelect({ options: null, label: "Fruit" }, testTheme);
    expect(selectEntries(null)).toEqual([]);
    expect(itemsOf(element)).toEqual([]);
    expect(
      elementChildren(element).length,
      "the trigger and its list are still painted",
    ).toBe(2);

    expect(selectEntries({ items: grouped })).toEqual([]);
  });

  it("drops one malformed entry rather than the list beside it", () => {
    const entries = selectEntries([
      { value: "apple", label: "Apple" },
      null,
      "pear",
      { label: "No value" },
      { value: "pear" },
      { value: "fig", label: "   " },
    ]);

    expect(entries).toEqual([
      { value: "apple", label: "Apple", disabled: false },
      { value: "pear", label: "", disabled: false },
      { value: "fig", label: "   ", disabled: false },
    ]);
    expect(selectOptions(entries).map((option) => option.value)).toEqual([
      "apple",
      "pear",
      "fig",
    ]);
  });

  it("paints no caption line for a stored group whose name arrived blank", () => {
    const element = renderSelect(
      {
        options: [
          {
            label: "   ",
            options: [{ value: "apple", label: "Apple" }],
          },
        ],
      },
      testTheme,
    );
    const content =
      elementChildren(element)[1] ??
      expect.fail("the select rendered no content part");
    const group =
      elementChildren(content)[0] ?? expect.fail("the select painted no group");
    expect(elementChildren(group)).toHaveLength(1);
    expect(Option.isNone(elementProp(group, "aria-label"))).toBe(true);
  });

  it("reads a group's list, and drops a group whose list is not one", () => {
    const entries = selectEntries([
      {
        label: "Fruit",
        options: [{ value: "apple", label: "Apple" }, null],
      },
      { label: "Broken", options: null },
    ]);
    expect(entries).toHaveLength(1);
    expect(isSelectGroup(entries[0] ?? { value: "", label: "" })).toBe(true);
    expect(selectOptions(entries).map((option) => option.value)).toEqual([
      "apple",
    ]);
  });
});

describe("Select", () => {
  it("announces the trigger as the named control", () => {
    const select = renderSelect(
      {
        options: [{ value: "apple", label: "Apple" }],
        label: "Fruit",
      },
      testTheme,
    );
    const trigger = Arr.head(elementChildren(select));
    expect(
      Option.map(trigger, (element) =>
        expectSome(elementProp(element, "role")),
      ),
    ).toStrictEqual(Option.some("combobox"));
    expect(
      Option.map(trigger, (element) =>
        expectSome(elementProp(element, "aria-label")),
      ),
    ).toStrictEqual(Option.some("Fruit"));
    expect(elementProp(select, "aria-label")).toStrictEqual(Option.none());
  });

  it("gives the trigger the address and help a form owns", () => {
    const ref = { current: null };
    const layout = (): void => {};
    const triggerOf = (props: {
      readonly description?: string;
    }): ReactElement =>
      expectSome(
        Arr.head(
          elementChildren(
            renderSelect(
              {
                options: [{ value: "apple", label: "Apple" }],
                label: "Fruit",
                "aria-id": "fruit-trigger",
                onLayout: layout,
                ref,
                ...props,
              },
              testTheme,
            ),
          ),
        ),
      );
    const trigger = triggerOf({ description: "Pick a fruit to ship." });
    expect(elementProp(trigger, "aria-id")).toStrictEqual(
      Option.some("fruit-trigger"),
    );
    expect(elementProp(trigger, "aria-description")).toStrictEqual(
      Option.some("Pick a fruit to ship."),
    );
    expect(elementProp(trigger, "onLayout")).toStrictEqual(Option.some(layout));
    expect(elementProp(trigger, "ref")).toStrictEqual(Option.some(ref));

    expect(
      elementProp(triggerOf({ description: "  " }), "aria-description"),
    ).toStrictEqual(Option.none());
  });

  it("announces the choice the trigger shows, and nothing when there is none", () => {
    const triggerOf = (props: {
      readonly value?: string;
      readonly defaultValue?: string;
      readonly selectedValue?: string;
      readonly placeholder?: string;
    }) =>
      expectSome(
        Arr.head(
          elementChildren(
            renderSelect(
              {
                options: grouped,
                label: "Produce",
                ...props,
              },
              testTheme,
            ),
          ),
        ),
      );
    const announced = (
      props: Parameters<typeof triggerOf>[0],
    ): Option.Option<unknown> =>
      elementProp(triggerOf(props), "aria-valuetext");

    expect(announced({ defaultValue: "yam" })).toStrictEqual(
      Option.some("Yam"),
    );
    expect(announced({ value: "leek" })).toStrictEqual(Option.some("Leek"));

    expect(
      announced({ defaultValue: "apple", selectedValue: "peer" }),
    ).toStrictEqual(Option.none());
    expect(
      announced({ defaultValue: "apple", selectedValue: "pear" }),
    ).toStrictEqual(Option.some("Pear"));

    expect(announced({ placeholder: "Pick one" })).toStrictEqual(Option.none());
    expect(announced({ value: "gone" })).toStrictEqual(Option.none());
  });

  it("resolves a value's label, refusing a blank one", () => {
    const label = (value?: string) =>
      selectValueLabel(grouped, Option.fromNullishOr(value));
    expect(label("apple")).toStrictEqual(Option.some("Apple"));
    expect(label(undefined)).toStrictEqual(Option.none());
    expect(label("")).toStrictEqual(Option.none());
    expect(label("gone")).toStrictEqual(Option.none());

    expect(
      selectValueLabel(
        [{ value: "blank", label: "   " }],
        Option.some("blank"),
      ),
    ).toStrictEqual(Option.none());
  });

  it("publishes the open state the trigger was rendered with", () => {
    const trigger = (open?: boolean) =>
      Arr.head(
        elementChildren(
          renderSelect(
            {
              options: [{ value: "apple", label: "Apple" }],
              label: "Fruit",
              open,
            },
            testTheme,
          ),
        ),
      );
    const expandedOf = (open?: boolean) =>
      Option.flatMap(trigger(open), (element) =>
        elementProp(element, "aria-expanded"),
      );
    expect(expandedOf(true)).toStrictEqual(Option.some(true));
    expect(expandedOf(false)).toStrictEqual(Option.some(false));
    expect(expandedOf(undefined)).toStrictEqual(Option.none());
  });

  it("paints a selected item differently from a hovered or resting one", () => {
    const paint = selectItemStyle(testTheme);
    const selected = paint({ ...rest, selected: true });
    const highlighted = paint({ ...rest, highlighted: true });
    expect(selected.backgroundColor).toBe(testTheme.colors.selected);
    expect(highlighted.backgroundColor).toBe(testTheme.colors.hover);
    expect(paint(rest).backgroundColor).toBeUndefined();
  });

  it("keeps a selected row's label above the body floor on the selection wash", () => {
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
    expect(selectContentStyle(testTheme).boxShadow).toEqual(
      elevationShadow(testTheme, "lg"),
    );
  });

  it("bounds the list and scrolls it, because the runtime sets no bound", () => {
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
    const marks = elementChildren(
      renderSelectRow({ value: "beta", label: "Beta" }, testTheme, {
        ...rest,
        selected: true,
      }),
    );
    expect(marks).toHaveLength(1);
    const mark = marks[0] ?? expect.fail("the selected row painted no mark");
    expect(expectSome(elementProp(mark, "name"))).toBe("check");
    expect(expectSome(elementProp(mark, "color"))).toBe(
      testTheme.colors.popoverForeground,
    );
    expect(
      elementChildren(
        renderSelectRow({ value: "alpha", label: "Alpha" }, testTheme, rest),
      ),
    ).toStrictEqual([]);
  });

  it("announces the row it paints, and its selection", () => {
    const chosen = renderSelectRow(
      { value: "beta", label: "Beta" },
      testTheme,
      { ...rest, selected: true },
    );
    expect(expectSome(elementProp(chosen, "role"))).toBe("option");
    expect(expectSome(elementProp(chosen, "aria-label"))).toBe("Beta");
    expect(expectSome(elementProp(chosen, "aria-selected"))).toBe(true);
    expect(
      expectSome(
        elementProp(
          renderSelectRow({ value: "alpha", label: "Alpha" }, testTheme, rest),
          "aria-selected",
        ),
      ),
    ).toBe(false);
  });

  it("hands the runtime the placement a caller asks for, and nothing it did not", () => {
    const contentOf = (props: Partial<Pick<SelectProps, "side" | "align">>) =>
      expectSome(
        Arr.get(
          elementChildren(
            renderSelect({ options: grouped, ...props }, testTheme),
          ),
          1,
        ),
      );
    const placed = contentOf({ side: "bottom", align: "end" });
    expect(elementProp(placed, "side")).toStrictEqual(Option.some("bottom"));
    expect(elementProp(placed, "align")).toStrictEqual(Option.some("end"));

    const plain = contentOf({});
    expect(elementProp(plain, "side")).toStrictEqual(Option.none());
    expect(elementProp(plain, "align")).toStrictEqual(Option.none());
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

describe("Select's source prose", () => {
  const source = readFileSync(new URL("./Select.tsx", import.meta.url), "utf8");

  it("does not promise a compound escape hatch the file does not ship", () => {
    expect(source).not.toMatch(/export (?:const|function) SelectItem\b/);
  });

  it("exports no compound item, so a highlighted row is the only route", () => {
    expect(source).toContain("SelectOption");
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
