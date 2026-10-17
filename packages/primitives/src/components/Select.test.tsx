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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { fieldVariant } from "../core/variants.js";
import {
  renderSelect,
  selectContentStyle,
  selectItemStyle,
  selectListHeight,
  selectTriggerStyle,
  type SelectHandlers,
} from "./Select.js";
import {
  tooltipRootStyle,
  renderTooltip,
  tooltipHeight,
  tooltipStyle,
} from "./Tooltip.js";
import { elementChildren, elementProp, expectSome } from "./testing/element.js";

const rest = { selected: false, highlighted: false, disabled: false };

const valueState = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");

const handlers: SelectHandlers = {
  onOpenChange: () => {},
  onValueChange: () => {},
  registerTrigger: () => {},
};

const itemsOf = (element: Parameters<typeof elementProp>[0]) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
    )(expectSome(elementProp(element, "items"))),
  );

const childAt = (
  element: Parameters<typeof elementChildren>[0],
  index: number,
) => expectSome(Option.fromNullishOr(elementChildren(element)[index]));

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

  it("gives an invalid trigger the destructive border", () => {
    const trigger = selectTriggerStyle(
      { variant: fieldVariant, size: "md", invalid: true },
      testTheme,
    )({ open: false, disabled: false, placeholder: false });
    expect(trigger.borderColor).toBe(testTheme.colors.destructive);
  });

  it("opens onto the popover surface at the measured trigger width", () => {
    expect(selectContentStyle(testTheme).backgroundColor).toBe(
      testTheme.colors.popover,
    );
    // No measurement (a tree rendered outside a renderer): the list hugs its
    // labels. A percentage was the old bug — it resolved against the layer.
    expect(selectContentStyle(testTheme).minWidth).toBeUndefined();
    expect(selectContentStyle(testTheme, 240).minWidth).toBe(240);
  });

  it("estimates the painted list height from the styles it mirrors", () => {
    // The side is chosen before the list exists, so the estimate must stay in
    // step with the two styles that paint it (plan 066).
    const content = selectContentStyle(testTheme);
    const row = selectItemStyle(testTheme)(rest);
    const paintedHeight = (rows: number): number =>
      2 * Number(content.padding) +
      rows * Number(row.height) +
      Math.max(rows - 1, 0) * Number(content.gap) +
      2 * Number(content.borderWidth);
    expect(selectListHeight(2, testTheme)).toBe(paintedHeight(2));
    expect(selectListHeight(0, testTheme)).toBe(paintedHeight(0));
  });

  it("maps the options to the labels the trigger shows", () => {
    const element = renderSelect(
      { options: [{ value: "alpha", label: "Alpha" }], disabled: true },
      testTheme,
      valueState(""),
      false,
      handlers,
    );
    expect(
      Option.map(Arr.head(itemsOf(element)), (item) => item["label"]),
    ).toStrictEqual(Option.some("Alpha"));
    expect(expectSome(elementProp(element, "disabled"))).toBe(true);
  });

  it("names the trigger as a combobox and reports its expanded state", () => {
    const closed = renderSelect(
      {
        options: [{ value: "alpha", label: "Alpha" }],
        label: "Fruit",
        placeholder: "Pick one",
      },
      testTheme,
      valueState(""),
      false,
      handlers,
    );
    const trigger = childAt(closed, 0);
    expect(expectSome(elementProp(trigger, "role"))).toBe("combobox");
    expect(expectSome(elementProp(trigger, "aria-label"))).toBe("Fruit");
    expect(expectSome(elementProp(trigger, "aria-expanded"))).toBe(false);
    expect(expectSome(elementProp(trigger, "aria-valuetext"))).toBe("Pick one");

    const open = renderSelect(
      { options: [{ value: "alpha", label: "Alpha" }], label: "Fruit" },
      testTheme,
      valueState("alpha"),
      true,
      handlers,
    );
    expect(expectSome(elementProp(childAt(open, 0), "aria-expanded"))).toBe(
      true,
    );
    expect(expectSome(elementProp(childAt(open, 0), "aria-valuetext"))).toBe(
      "Alpha",
    );
  });

  it("names the list and every option, with the selected one marked", () => {
    const element = renderSelect(
      {
        options: [
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta" },
        ],
        label: "Fruit",
      },
      testTheme,
      valueState("beta"),
      true,
      handlers,
    );
    const list = childAt(element, 1);
    expect(expectSome(elementProp(list, "role"))).toBe("listbox");
    expect(expectSome(elementProp(list, "aria-label"))).toBe("Fruit");
    const entries = elementChildren(list);
    expect(
      entries.map((item) => expectSome(elementProp(item, "role"))),
    ).toStrictEqual(["option", "option"]);
    expect(
      entries.map((item) => expectSome(elementProp(item, "aria-label"))),
    ).toStrictEqual(["Alpha", "Beta"]);
    expect(
      entries.map((item) => expectSome(elementProp(item, "aria-selected"))),
    ).toStrictEqual([false, true]);
  });
});

describe("Tooltip", () => {
  it("wears the popover surface and the caption type", () => {
    const style = tooltipStyle(testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.popover);
    expect(style.fontSize).toBe(testTheme.typography.caption.fontSize);
    expect(style.whiteSpace).toBe("nowrap");
  });

  it("hugs its trigger so the layer anchors to the trigger", () => {
    const tree = renderTooltip(
      { content: "A hint", children: null },
      testTheme,
    );
    expect(expectSome(elementProp(tree, "style"))).toStrictEqual(
      tooltipRootStyle,
    );
    expect(tooltipRootStyle.alignSelf).toBe("flex-start");
  });

  it("defaults to the alignment the runtime places exactly", () => {
    const contentOf = (align?: "start" | "center" | "end") =>
      expectSome(
        Arr.get(
          elementChildren(
            renderTooltip(
              { content: "A hint", children: null, align },
              testTheme,
            ),
          ),
          1,
        ),
      );
    expect(expectSome(elementProp(contentOf(), "align"))).toBe("start");
    expect(expectSome(elementProp(contentOf("end"), "align"))).toBe("end");
  });

  it("estimates the painted tip height from the style it mirrors", () => {
    // The side is chosen before the tip exists, so the estimate must stay in
    // step with the paint (plan 067).
    const style = tooltipStyle(testTheme);
    expect(tooltipHeight(testTheme)).toBe(
      2 * Number(style.paddingTop) +
        Number(style.lineHeight) +
        2 * Number(style.borderWidth),
    );
  });
});
