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
  renderSelect,
  selectContentStyle,
  selectItemStyle,
  selectTriggerStyle,
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

describe("Tooltip", () => {
  it("wears the popover surface and the caption type", () => {
    const style = tooltipStyle(testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.popover);
    expect(style.fontSize).toBe(testTheme.typography.caption.fontSize);
    expect(style.whiteSpace).toBe("nowrap");
  });
});
