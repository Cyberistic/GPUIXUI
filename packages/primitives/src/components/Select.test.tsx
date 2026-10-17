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
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { controlFocusStyle } from "../core/style.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { fieldVariant } from "../core/variants.js";
import {
  renderSelect,
  selectContentStyle,
  selectGroupStyle,
  selectHeadingHeight,
  selectHeadingStyle,
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
  registerItem: () => () => {},
  onHighlight: () => {},
};

const noFocus = { focused: false, onFocus: () => {}, onBlur: () => {} };

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

  it("keeps each option at its own height inside a capped list", () => {
    // Without this the rows shrink to fit a capped list instead of the list
    // scrolling (measured: 30 rows squashed into 748 px — plan 068 §6).
    expect(selectItemStyle(testTheme)(rest).flexShrink).toBe(0);
  });

  it("gives an invalid trigger the destructive border", () => {
    const trigger = selectTriggerStyle(
      { variant: fieldVariant, size: "md", invalid: true },
      testTheme,
    )({ open: false, disabled: false, placeholder: false, focused: false });
    expect(trigger.borderColor).toBe(testTheme.colors.destructive);
  });

  it("rings the trigger while it holds focus or its list is open", () => {
    // The bug guarded (plan 083): the trigger took native focus and painted no
    // ring, so a keyboard user could not see which control they were on.
    const spec = { variant: fieldVariant, size: "md" as const };
    const paint = selectTriggerStyle(spec, testTheme);
    const resting = {
      open: false,
      disabled: false,
      placeholder: false,
      focused: false,
    };
    const ring = controlFocusStyle(spec, testTheme);
    expect(paint({ ...resting, focused: true }).boxShadow).toStrictEqual(
      ring.boxShadow,
    );
    expect(paint({ ...resting, open: true }).boxShadow).toStrictEqual(
      ring.boxShadow,
    );
    expect(paint(resting).boxShadow).toBeUndefined();
    expect(
      paint({ ...resting, disabled: true, focused: true }).boxShadow,
    ).toBeUndefined();
  });

  it("names the trigger separately and wires its focus handlers", () => {
    const element = renderSelect(
      { options: [], label: "Fruit", testId: "sel" },
      testTheme,
      valueState(""),
      false,
      noFocus,
      handlers,
    );
    const trigger = childAt(element, 0);
    expect(expectSome(elementProp(trigger, "testId"))).toBe("sel-trigger");
    expect(P.isFunction(expectSome(elementProp(trigger, "onFocus")))).toBe(
      true,
    );
    expect(P.isFunction(expectSome(elementProp(trigger, "onBlur")))).toBe(true);
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
    // step with the styles that paint it (plans 066, 075).
    const content = selectContentStyle(testTheme);
    const row = selectItemStyle(testTheme)(rest);
    const heading = selectHeadingStyle(testTheme);
    const paintedHeight = (rows: number, headings: number): number =>
      2 * Number(content.padding) +
      rows * Number(row.height) +
      headings * selectHeadingHeight(testTheme) +
      Math.max(rows + headings - 1, 0) * Number(content.gap) +
      2 * Number(content.borderWidth);
    expect(selectListHeight(2, testTheme)).toBe(paintedHeight(2, 0));
    expect(selectListHeight(0, testTheme)).toBe(paintedHeight(0, 0));
    expect(selectListHeight(2, testTheme, 1)).toBe(paintedHeight(2, 1));
    // The heading's own estimate must follow the caption line and its padding.
    expect(selectHeadingHeight(testTheme)).toBe(
      2 * Number(heading.paddingTop) + Number(heading.lineHeight),
    );
  });

  it("keeps the list's gap inside a group as well as between entries", () => {
    // A group is one flex child, so without this its rows would lose the gap
    // the flat list had — and the height estimate counts every row pair.
    const group = selectGroupStyle(testTheme);
    const content = selectContentStyle(testTheme);
    expect(group.flexDirection).toBe("column");
    expect(group.gap).toBe(content.gap);
  });

  it("caps a list taller than its space and makes it scroll", () => {
    // A short list must not gain a scrollbar; a long one must not run off the
    // window (measured: plan 068).
    const natural = selectContentStyle(testTheme, 100);
    expect(natural.maxHeight).toBeUndefined();
    expect(natural.overflowY).toBeUndefined();
    const capped = selectContentStyle(testTheme, 100, 300);
    expect(capped.maxHeight).toBe(300);
    expect(capped.overflowY).toBe("scroll");
  });

  it("maps the options to the labels the trigger shows", () => {
    const element = renderSelect(
      { options: [{ value: "alpha", label: "Alpha" }], disabled: true },
      testTheme,
      valueState(""),
      false,
      noFocus,
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
      noFocus,
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
      noFocus,
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
      noFocus,
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

  it("renders a named group with its heading and options, and reads its label", () => {
    // The bug guarded (plan 075): a grouped list could not be expressed, so a
    // long list was one undifferentiated run of options.
    const element = renderSelect(
      {
        options: [
          {
            label: "Europe",
            options: [{ value: "eu", label: "Europe West" }],
          },
          { value: "us", label: "United States" },
        ],
        label: "Region",
      },
      testTheme,
      valueState("eu"),
      true,
      noFocus,
      handlers,
    );
    const trigger = childAt(element, 0);
    expect(expectSome(elementProp(trigger, "aria-valuetext"))).toBe(
      "Europe West",
    );
    expect(
      Option.map(Arr.head(itemsOf(element)), (item) => item["label"]),
    ).toStrictEqual(Option.some("Europe West"));

    const list = childAt(element, 1);
    const children = elementChildren(list);
    expect(children).toHaveLength(2);
    const group = expectSome(Arr.head(children));
    expect(expectSome(elementProp(group, "role"))).toBe("group");
    expect(expectSome(elementProp(group, "aria-label"))).toBe("Europe");
    expect(expectSome(elementProp(group, "style"))).toStrictEqual(
      selectGroupStyle(testTheme),
    );
    const groupChildren = elementChildren(group);
    expect(groupChildren).toHaveLength(2);
    const heading = expectSome(Arr.head(groupChildren));
    expect(expectSome(elementProp(heading, "style"))).toStrictEqual(
      selectHeadingStyle(testTheme),
    );
    expect(
      groupChildren.map((child) =>
        Option.getOrUndefined(elementProp(child, "role")),
      ),
    ).toStrictEqual([undefined, "option"]);
    expect(expectSome(elementProp(childAt(list, 1), "role"))).toBe("option");
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

  it("makes a string tip the trigger's description and a named tooltip node", () => {
    // The bug guarded (plan 071): the tip was painted but absent from the
    // accessibility tree, and its text was never associated with the trigger.
    const parts = elementChildren(
      renderTooltip({ content: "A hint", children: null }, testTheme),
    );
    const trigger = expectSome(Arr.get(parts, 0));
    const tip = expectSome(Arr.get(parts, 1));
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe("A hint");
    expect(expectSome(elementProp(tip, "role"))).toBe("tooltip");
    expect(expectSome(elementProp(tip, "aria-label"))).toBe("A hint");
  });

  it("exposes non-string content as a tooltip node without inventing a name", () => {
    const parts = elementChildren(
      renderTooltip({ content: <div />, children: null }, testTheme),
    );
    const trigger = expectSome(Arr.get(parts, 0));
    const tip = expectSome(Arr.get(parts, 1));
    expect(expectSome(elementProp(tip, "role"))).toBe("tooltip");
    expect(elementProp(trigger, "aria-description")).toStrictEqual(
      Option.none(),
    );
    expect(elementProp(tip, "aria-label")).toStrictEqual(Option.none());
  });
});
