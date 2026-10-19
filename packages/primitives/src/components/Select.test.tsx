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

import { describe, expect, it, vi } from "vitest";
import { Fragment } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { fieldRecipeStyle } from "../core/recipes.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderSelect,
  selectContentStyle,
  selectGroupStyle,
  selectHeadingHeight,
  selectHeadingStyle,
  selectItemStyle,
  selectListHeight,
  selectListOverhang,
  selectTriggerStyle,
  type SelectHandlers,
} from "./Select.js";
import {
  tooltipRootStyle,
  renderTooltip,
  tooltipHeight,
  tooltipStyle,
} from "./Tooltip.js";
import {
  elementChildren,
  elementHandler,
  elementProp,
  expectSome,
  hostTag,
} from "./testing/element.js";
import { clickEvent, keyEvent } from "./testing/event.js";

const rest = { selected: false, highlighted: false, disabled: false };

const valueState = (value: string): ValueState<string | undefined> =>
  initValueState(Option.some(value), undefined);

/** The state a select is in when neither `value` nor `defaultValue` is supplied. */
const noSelection = (): ValueState<string | undefined> =>
  initValueState(Option.none(), undefined);

const handlers: SelectHandlers = {
  onOpenChange: () => {},
  onValueChange: () => {},
  registerTrigger: () => {},
  registerContent: () => {},
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

  it("leaves the option rows on their own metric, not the field recipe", () => {
    // The trigger is a field (plan 372) but a row is not an input: it keeps the
    // density metric until `select.tsx`'s item string joins `@gpuixui/tw`.
    expect(selectItemStyle(testTheme)(rest).height).toBe(
      testTheme.density.controlHeight.sm,
    );
  });

  it("gives an invalid trigger the destructive border", () => {
    const trigger = selectTriggerStyle(
      { invalid: true },
      testTheme,
    )({
      open: false,
      disabled: false,
      placeholder: false,
      focused: false,
    });
    expect(trigger.borderColor).toBe(testTheme.colors.destructive);
  });

  it("is chrome: a pointer cursor and no text selection", () => {
    // The bug guarded (plan 386): the trigger wore the field recipe's text
    // cursor and selectable text, so a drag across a select highlighted its
    // value, and the open list's options and headings were selectable too.
    const paint = selectTriggerStyle({}, testTheme);
    const resting = {
      open: false,
      disabled: false,
      placeholder: false,
      focused: false,
    };
    expect(paint(resting).userSelect).toBe("none");
    expect(paint(resting).cursor).toBe("pointer");
    expect(paint({ ...resting, disabled: true }).userSelect).toBe("none");
    expect(paint({ ...resting, disabled: true }).cursor).toBe("not-allowed");
    expect(selectItemStyle(testTheme)(rest).userSelect).toBe("none");
    expect(selectHeadingStyle(testTheme).userSelect).toBe("none");
  });

  it("rings the trigger with the field recipe while it holds focus or its list is open", () => {
    // The bug guarded (plan 083): the trigger took native focus and painted no
    // ring, so a keyboard user could not see which control they were on. Since
    // plan 372 it is a field, so it paints the same recipe chrome as `Input`;
    // since plan 585 that includes the recipe's `shadow-xs` at rest, so the
    // assertion is about the ring (positive spread), not about any shadow.
    const paint = selectTriggerStyle({}, testTheme);
    const resting = {
      open: false,
      disabled: false,
      placeholder: false,
      focused: false,
    };
    const fieldResting = fieldRecipeStyle(
      { focused: false, invalid: false, disabled: false },
      testTheme,
    );
    const ring = fieldRecipeStyle(
      { focused: true, invalid: false, disabled: false },
      testTheme,
    );
    expect(paint(resting).boxShadow).toStrictEqual(fieldResting.boxShadow);
    expect(paint(resting).boxShadow?.spreadRadius).toBe(0);
    expect(paint({ ...resting, focused: true }).boxShadow).toStrictEqual(
      ring.boxShadow,
    );
    expect(paint({ ...resting, open: true }).boxShadow).toStrictEqual(
      ring.boxShadow,
    );
    expect(
      paint({ ...resting, disabled: true, focused: true }).boxShadow,
    ).toStrictEqual(fieldResting.boxShadow);
  });

  it("paints a decorative trailing chevron in the trigger", () => {
    // The bug guarded (plan 343): the trigger reserved `space-between` for a
    // trailing child and rendered none, so a select looked like an Input.
    const at = (disabled: boolean) =>
      renderSelect(
        { options: [], label: "Fruit", testId: "sel", disabled },
        testTheme,
        noSelection(),
        false,
        noFocus,
        handlers,
      );
    const trigger = childAt(at(false), 0);
    const indicator = expectSome(
      Option.fromNullishOr(elementChildren(trigger)[1]),
    );
    expect(elementChildren(trigger)).toHaveLength(2);
    expect(expectSome(elementProp(indicator, "name"))).toBe("chevron-down");
    expect(expectSome(elementProp(indicator, "size"))).toBe(
      testTheme.iconSize.sm,
    );
    expect(expectSome(elementProp(indicator, "color"))).toBe(
      testTheme.colors.mutedForeground,
    );
    expect(expectSome(elementProp(indicator, "testId"))).toBe("sel-chevron");
    // Decoration, not content: it must not invent a name for the combobox.
    expect(Option.isNone(elementProp(indicator, "label"))).toBe(true);
    expect(expectSome(elementProp(trigger, "aria-label"))).toBe("Fruit");

    const disabledTrigger = childAt(at(true), 0);
    const disabledIndicator = expectSome(
      Option.fromNullishOr(elementChildren(disabledTrigger)[1]),
    );
    expect(expectSome(elementProp(disabledIndicator, "color"))).toBe(
      testTheme.colors.placeholder,
    );
  });

  it("shrinks its value and caps its list to the window", () => {
    // Plan 368: the value is a div the runtime can shrink, and the list is at
    // most the window's usable width — a long label cannot push the chevron
    // out of the trigger or the list past the screen.
    const element = renderSelect(
      { options: [], label: "Fruit", testId: "sel" },
      testTheme,
      valueState("Apple"),
      false,
      noFocus,
      handlers,
    );
    const trigger = childAt(element, 0);
    const value = expectSome(Option.fromNullishOr(elementChildren(trigger)[0]));
    expect(expectSome(elementProp(value, "style"))).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    const content = childAt(element, 1);
    expect(expectSome(elementProp(content, "testId"))).toBe("sel-content");
    expect(selectContentStyle(testTheme, 120, 200, 1264)).toMatchObject({
      minWidth: 120,
      maxHeight: 200,
      maxWidth: 1264,
    });
  });

  it("points the chevron up while the list is open", () => {
    const element = renderSelect(
      { options: [], label: "Fruit" },
      testTheme,
      noSelection(),
      true,
      noFocus,
      handlers,
    );
    const indicator = expectSome(
      Option.fromNullishOr(elementChildren(childAt(element, 0))[1]),
    );
    expect(expectSome(elementProp(indicator, "name"))).toBe("chevron-up");
  });

  it("names the trigger separately and wires its focus handlers", () => {
    const element = renderSelect(
      { options: [], label: "Fruit", testId: "sel" },
      testTheme,
      noSelection(),
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

  it("reserves the list's own padding as the trigger overhang", () => {
    // The runtime anchors a layer's content box, so the surface's padding falls
    // back over the trigger; the reserved number must follow the style that
    // paints it (plan `597`).
    expect(selectListOverhang(testTheme)).toBe(
      Number(selectContentStyle(testTheme).padding),
    );
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
      noSelection(),
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
      noSelection(),
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
        testId: "sel",
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
    ).toStrictEqual([false, true]); // An option is addressable like the trigger and its indicator (plan 390),
    // so a suite never has to find the painted label and walk to its parent.
    expect(
      entries.map((item) => expectSome(elementProp(item, "testId"))),
    ).toStrictEqual(["sel-option-alpha", "sel-option-beta"]);
  });

  it("invents no option locator when the select has no testId", () => {
    const element = renderSelect(
      { options: [{ value: "alpha", label: "Alpha" }], label: "Fruit" },
      testTheme,
      valueState("alpha"),
      true,
      noFocus,
      handlers,
    );
    const option = childAt(childAt(element, 1), 0);
    expect(Option.isNone(elementProp(option, "testId"))).toBe(true);
  });

  it("publishes a blank label as absent on the trigger and list, and names an option by its value", () => {
    // Plan 026 (the field's own label) + plan 589: an option has a second
    // identity — its value — so a blank label must not leave it unnamed.
    const element = renderSelect(
      { options: [{ value: "alpha", label: "   " }], label: "   " },
      testTheme,
      noSelection(),
      true,
      noFocus,
      handlers,
    );
    expect(elementProp(childAt(element, 0), "aria-label")).toStrictEqual(
      Option.none(),
    );
    const list = childAt(element, 1);
    expect(elementProp(list, "aria-label")).toStrictEqual(Option.none());
    expect(expectSome(elementProp(childAt(list, 0), "aria-label"))).toBe(
      "alpha",
    );
  });

  it("renders nothing for an empty group, while the other entries keep their rows", () => {
    // The bug guarded (plan 363): every group entry painted its heading
    // unconditionally, so a filtered-out group left a title over blank space
    // while `selectRowCounts` already counted it as nothing.
    const element = renderSelect(
      {
        options: [
          { label: "Empty", options: [] },
          { value: "a", label: "Alpha" },
        ],
        label: "Fruit",
      },
      testTheme,
      valueState("a"),
      true,
      noFocus,
      handlers,
    );
    const entries = elementChildren(childAt(element, 1));
    expect(entries).toHaveLength(1);
    expect(expectSome(elementProp(expectSome(Arr.head(entries)), "role"))).toBe(
      "option",
    );
  });

  it("paints no heading for a group whose name says nothing", () => {
    // The bug guarded (plan 579): a group's heading was painted and counted
    // whenever the group had options, so a computed blank group name left an
    // empty caption row above its options and made the list one caption taller
    // than `selectRowCounts` estimated. The group's rows paint flat instead.
    const element = renderSelect(
      {
        options: [
          {
            label: "   ",
            options: [{ value: "eu", label: "Europe West" }],
          },
          { value: "us", label: "United States" },
        ],
        label: "Region",
        testId: "region",
      },
      testTheme,
      valueState("eu"),
      true,
      noFocus,
      handlers,
    );
    const children = elementChildren(childAt(element, 1));
    expect(
      children.map((child) =>
        Option.getOrUndefined(elementProp(child, "role")),
      ),
    ).toStrictEqual(["option", "option"]);
    expect(
      children.map((child) =>
        Option.getOrUndefined(elementProp(child, "testId")),
      ),
    ).toStrictEqual(["region-option-eu", "region-option-us"]);
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
        testId: "region",
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
    // A grouped option is addressable too; the caption above it is not a
    // control, so it carries no locator (plan 390).
    expect(
      groupChildren.map((child) =>
        Option.getOrUndefined(elementProp(child, "testId")),
      ),
    ).toStrictEqual([undefined, "region-option-eu"]);
    expect(expectSome(elementProp(childAt(list, 1), "role"))).toBe("option");
    expect(expectSome(elementProp(childAt(list, 1), "testId"))).toBe(
      "region-option-us",
    );
  });

  it("passes an empty-string selection through instead of erasing it", () => {
    // The bug guarded (plan 501): the wrapper rewrote `""` to `undefined`, so an
    // option valued `""` — "Any", "All", "None" — could never be shown, even
    // though the headless runtime selects an `""` item.
    const element = renderSelect(
      { options: [{ value: "", label: "Any" }], label: "Filter" },
      testTheme,
      valueState(""),
      false,
      noFocus,
      handlers,
    );
    expect(expectSome(elementProp(element, "value"))).toBe("");
  });

  it("passes no selection as undefined", () => {
    // The other half: absence must stay absent, so a select with an empty-valued
    // option still shows its placeholder until a choice is made.
    const element = renderSelect(
      { options: [{ value: "", label: "Any" }], label: "Filter" },
      testTheme,
      noSelection(),
      false,
      noFocus,
      handlers,
    );
    expect(elementProp(element, "value")).toStrictEqual(Option.none());
  });
});

describe("Tooltip", () => {
  it("wears the popover surface and the caption type", () => {
    const style = tooltipStyle(testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.popover);
    expect(style.fontSize).toBe(testTheme.typography.caption.fontSize);
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.maxWidth).toBeUndefined();
  });

  it("caps a measured tip to the window and lets its text wrap", () => {
    // The bug guarded (plan 391): a 200-word tip painted 6 270 px wide in a
    // 1 280 px window because the tip was nowrap and had no width cap.
    const style = tooltipStyle(testTheme, 400);
    expect(style.maxWidth).toBe(400);
    expect(style.whiteSpace).toBe("normal");
  });

  it("puts the measured cap on the tip it renders", () => {
    const tipOf = (maxWidth?: number) =>
      expectSome(
        Arr.get(
          elementChildren(
            renderTooltip({ content: "A hint", children: null }, testTheme, {
              maxWidth,
            }),
          ),
          1,
        ),
      );
    expect(expectSome(elementProp(tipOf(400), "style"))).toMatchObject({
      maxWidth: 400,
      whiteSpace: "normal",
    });
    expect(expectSome(elementProp(tipOf(), "style"))).toMatchObject({
      whiteSpace: "nowrap",
    });
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

  it("passes the wrapper's resolved alignment and offset to the tip", () => {
    // The wrapper measures the trigger and the open tip and maps `center` to
    // `start` plus half the difference (plan 095); the element tree just checks
    // the resolved values reach the host.
    const tipOf = (placement?: {
      readonly align: "start" | "end";
      readonly offset: number;
    }) =>
      expectSome(
        Arr.get(
          elementChildren(
            renderTooltip({ content: "A hint", children: null }, testTheme, {
              placement,
            }),
          ),
          1,
        ),
      );
    const centred = tipOf({ align: "start", offset: 179 });
    expect(expectSome(elementProp(centred, "align"))).toBe("start");
    expect(expectSome(elementProp(centred, "alignOffset"))).toBe(179);
    // Unmeasured: the caller's value with no offset, so the first frame does not
    // jump away from the documented default.
    const unmeasured = tipOf();
    expect(expectSome(elementProp(unmeasured, "alignOffset"))).toBe(0);
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

  it("drops a tip whose content is only whitespace", () => {
    // Plan 573: a computed blank translation published `aria-description: "   "`
    // and opened an empty popover named `"   "`. A whitespace-only string is no
    // tip; the child renders unchanged.
    const tree = renderTooltip(
      { content: "   ", children: <div /> },
      testTheme,
    );
    expect(tree.type).toBe(Fragment);
    const children = elementChildren(tree);
    expect(children).toHaveLength(1);
    expect(expectSome(hostTag(expectSome(Arr.get(children, 0))))).toBe("div");
  });

  it("trims a real string tip's description and name", () => {
    const parts = elementChildren(
      renderTooltip({ content: "  A hint  ", children: null }, testTheme),
    );
    const trigger = expectSome(Arr.get(parts, 0));
    const tip = expectSome(Arr.get(parts, 1));
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe("A hint");
    expect(expectSome(elementProp(tip, "aria-label"))).toBe("A hint");
  });

  it("forwards a controlled open state and the hover-close flag to the runtime", () => {
    // The bug guarded (plan 347): GPUix publishes `open`/`defaultOpen`/
    // `onOpenChange` and `disableHoverableContent`, but this wrapper exposed
    // only `delay`, so a tip could not be opened from code.
    const onOpenChange = vi.fn();
    const tree = renderTooltip(
      {
        content: "A hint",
        children: null,
        open: true,
        disableHoverableContent: true,
      },
      testTheme,
      { onOpenChange },
    );
    expect(expectSome(elementProp(tree, "open"))).toBe(true);
    expect(expectSome(elementProp(tree, "disableHoverableContent"))).toBe(true);
    expect(Option.getOrUndefined(elementHandler(tree, "onOpenChange"))).toBe(
      onOpenChange,
    );
  });

  it("keeps the runtime controlled while the tip is closed", () => {
    // A closed wrapper still owns open: `open={false}` must reach the runtime,
    // not `undefined`, or the runtime would silently become uncontrolled and
    // the pointer could open a tip the parent said was closed.
    const tree = renderTooltip(
      { content: "A hint", children: null, open: false },
      testTheme,
    );
    expect(expectSome(elementProp(tree, "open"))).toBe(false);
    expect(elementProp(tree, "defaultOpen")).toStrictEqual(Option.none());
  });
});

describe("Select as a slot trigger", () => {
  it("forwards a slot's handlers and description to its trigger", () => {
    // Plan 345: the tooltip's cloned props stopped at the Select boundary, so a
    // tip around a select never opened. GPUix's SelectTrigger composes the key
    // handler itself, so the wrapper passes the slot's through unchanged.
    const onMouseEnter = vi.fn();
    const onKeyDown = vi.fn();
    const element = renderSelect(
      {
        options: [{ value: "eu", label: "Europe" }],
        onMouseEnter,
        onKeyDown,
        "aria-description": "A hint",
      },
      testTheme,
      valueState("eu"),
      false,
      noFocus,
      handlers,
    );
    const trigger = childAt(element, 0);
    expectSome(elementHandler(trigger, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(elementHandler(trigger, "onKeyDown"))(keyEvent("escape"));
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe("A hint");
  });
});
