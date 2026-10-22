/**
 * `CheckboxGroup` — the element tree the runtime receives.
 *
 * The bug this suite guards is the group's roving tab stop: a group whose
 * chosen (or first) option is disabled used to leave the stop on that row,
 * which has no `tabIndex`, so there was no reachable stop to Tab into. It also
 * holds the group to the supported accessibility subset — 0.11.0 has no
 * `aria-checked`, so state is announced as `aria-valuetext` — and proves that an
 * arrow moves focus without changing the value, which is what separates a
 * checkbox group from a radio group.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { keyboardFocusRing, targetSize } from "@gpuixui/tokens";
import { decideTypeAhead } from "../core/keyboard.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  CheckboxGroupItem,
  checkboxGroupItems,
  renderCheckboxGroup,
  type CheckboxGroupHandlers,
  type CheckboxGroupState,
  type CheckboxItemState,
  type CheckboxGroupOption,
} from "./CheckboxGroup.js";
import { type GroupFocus } from "./group.js";
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

const idle: GroupFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

/** The group's handlers, with the value toggle recorded by default. */
const handlers = (
  onToggle: (value: string) => void,
): CheckboxGroupHandlers => ({
  onToggle,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

const options: ReadonlyArray<CheckboxGroupOption> = [
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
  { value: "sms", label: "SMS" },
];
const labels = Arr.map(options, (option) => option.label);

/** Type-ahead as the component wires it: the buffer is the caller's, the match is not. */
const typeAhead = (from: number, key: string) =>
  decideTypeAhead(labels, from, key);

const render = (
  props: Parameters<typeof renderCheckboxGroup>[0],
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  groupHandlers: CheckboxGroupHandlers,
  focus: GroupFocus = idle,
) =>
  renderCheckboxGroup(
    props,
    testTheme,
    values,
    preferredIndex,
    focus,
    groupHandlers,
  );

/** The group's option rows, from the rendered tree. */
const rows = (element: ReturnType<typeof renderCheckboxGroup>) =>
  elementChildren(element);

/** A row's tab stop, with "absent" standing in for `undefined`. */
const stopOf = (row: ReturnType<typeof rows>[number]): number | "absent" =>
  Option.getOrElse(
    Option.flatMap(hostProp(row, "tabIndex"), (value) =>
      typeof value === "number" ? Option.some(value) : Option.none(),
    ),
    () => "absent",
  );

describe("CheckboxGroup", () => {
  it("moves focus to the option a typed prefix names, without toggling it", () => {
    // The bug this guards: a reader who knew the option's name had to arrow to
    // it. A checkbox group's arrows move focus only, so type-ahead must not
    // change a value either — moving focus and toggling in one key would be a
    // press this keyboard contract does not have.
    const onToggle = vi.fn();
    const onFocusMove = vi.fn();
    const element = render({ options, label: "Channels" }, [], Option.some(0), {
      ...handlers(onToggle),
      onFocusMove,
      typeAhead,
    });
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("s"));
    expect(onFocusMove).toHaveBeenCalledWith(2);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("announces every row's state as value text, and never invents aria-checked", () => {
    const element = render(
      { options, label: "Channels" },
      ["push"],
      Option.none(),
      handlers(vi.fn()),
    );

    expect(expectSome(hostProp(element, "role"))).toBe("group");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Channels");
    expect(
      rows(element).map((row) => expectSome(hostProp(row, "aria-valuetext"))),
    ).toEqual(["unchecked", "checked", "unchecked"]);
    expect(rows(element).map((row) => hostProp(row, "aria-checked"))).toEqual([
      Option.none(),
      Option.none(),
      Option.none(),
    ]);
  });

  it("announces the group's help and addresses the row that holds the stop", () => {
    // Bug guarded: a checkbox group is a control a form owns, but it had no
    // address and no announced help — a form could not focus the group it
    // failed on, an automation host could not name it, and a visible `Label`'s
    // description reached nobody. The wrapper is not focusable, so the address
    // lands on the row that holds the tab stop; the help rides the group node.
    const ref = vi.fn();
    const layout = vi.fn();
    const register = vi.fn();
    const element = render(
      {
        options,
        label: "Channels",
        description: "Pick at least one.",
        ref,
        "aria-id": "channels",
        onLayout: layout,
      },
      [],
      Option.some(1),
      {
        ...handlers(vi.fn()),
        registerItem: (index) => (instance) => register(index, instance),
      },
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Pick at least one.",
    );
    const [email, push, sms] = rows(element);
    expect(hostProp(email ?? expect.fail("no row"), "aria-id")).toStrictEqual(
      Option.none(),
    );
    expect(expectSome(hostProp(push ?? expect.fail("no row"), "aria-id"))).toBe(
      "channels",
    );
    expect(
      Option.getOrUndefined(
        hostHandler(push ?? expect.fail("no row"), "onLayout"),
      ),
    ).toBe(layout);
    expect(hostProp(sms ?? expect.fail("no row"), "aria-id")).toStrictEqual(
      Option.none(),
    );
    const merged = Option.getOrElse(
      hostRef(push ?? expect.fail("no row")),
      () => expect.fail("the addressed row carried no ref"),
    );
    merged(null);
    expect(register).toHaveBeenCalledWith(1, null);
    expect(ref).toHaveBeenCalledWith(null);
  });

  it("publishes a trimmed row name, and no name at all for a blank label", () => {
    // The bug guarded: the row's `aria-label` was the option's label verbatim,
    // so a padded label announced its padding and a blank one published `""` —
    // the runtime puts an empty string in the accessibility tree, which is not
    // the same as no name. An icon-only option whose label a caller left blank
    // announced nothing at all instead of leaving the name to its content.
    const element = render(
      {
        options: [
          { value: "icon", label: "   " },
          { value: "push", label: "  Push  " },
        ],
      },
      [],
      Option.none(),
      handlers(vi.fn()),
    );

    expect(rows(element).map((row) => hostProp(row, "aria-label"))).toEqual([
      Option.none(),
      Option.some("Push"),
    ]);
  });

  it("keeps the tab stop on an option a keyboard user can reach", () => {
    const element = render(
      {
        options: [
          { value: "email", label: "Email", disabled: true },
          { value: "push", label: "Push" },
          { value: "sms", label: "SMS" },
        ],
      },
      [],
      Option.some(0),
      handlers(vi.fn()),
    );

    expect(rows(element).map(stopOf)).toEqual(["absent", 0, -1]);
  });

  it("moves focus with an arrow without changing the value", () => {
    const onToggle = vi.fn();
    const groupHandlers = handlers(onToggle);
    const element = render({ options }, [], Option.some(0), groupHandlers);

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));

    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(1);
    expect(onToggle).toHaveBeenCalledTimes(0);
  });

  it("toggles the focused option on the Space release, not on the press before it", () => {
    const onToggle = vi.fn();
    const element = render({ options }, [], Option.some(1), handlers(onToggle));

    const press = keyEvent("space");
    expectSome(hostHandler(element, "onKeyDown"))(press);
    expect(onToggle).toHaveBeenCalledTimes(0);
    expect(press.prevented).toBe(true);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onToggle).toHaveBeenCalledWith("push");
  });

  it("skips a disabled option in the arrow navigation", () => {
    const onToggle = vi.fn();
    const groupHandlers = handlers(onToggle);
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
          { value: "sms", label: "SMS" },
        ],
      },
      [],
      Option.some(0),
      groupHandlers,
    );

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));

    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(2);
    expect(onToggle).toHaveBeenCalledTimes(0);
  });

  it("jumps to the first enabled option with Home and the last with End", () => {
    const groupHandlers = handlers(vi.fn());
    const element = render(
      {
        options: [
          { value: "email", label: "Email", disabled: true },
          { value: "push", label: "Push" },
          { value: "sms", label: "SMS" },
        ],
      },
      [],
      Option.some(1),
      groupHandlers,
    );

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("home"));
    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(1);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("end"));
    expect(groupHandlers.onFocusMove).toHaveBeenCalledWith(2);
  });

  it("toggles on a click, and a disabled row installs no press at all", () => {
    const onToggle = vi.fn();
    const element = render(
      { options: [{ value: "email", label: "Email" }] },
      [],
      Option.none(),
      handlers(onToggle),
    );
    const row = rows(element)[0] ?? expect.fail("no row");

    expectSome(hostHandler(row, "onClick"))({
      elementId: 0,
      eventType: "click",
    });
    expect(onToggle).toHaveBeenCalledWith("email");

    const blocked = render(
      { options: [{ value: "email", label: "Email", disabled: true }] },
      [],
      Option.none(),
      handlers(vi.fn()),
    );
    const blockedRow = rows(blocked)[0] ?? expect.fail("no row");

    expect(hostHandler(blockedRow, "onClick")).toStrictEqual(Option.none());
    expect(stopOf(blockedRow)).toBe("absent");
  });

  it("hands a style callback the group's live state and lets its result win", () => {
    const seen: CheckboxGroupState[] = [];
    const element = render(
      {
        options,
        style: (live) => {
          seen.push(live);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      ["email"],
      Option.none(),
      handlers(vi.fn()),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
    );

    expect(seen).toEqual([{ disabled: false, focused: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("reports no focus for an option the group no longer draws", () => {
    // The bug guarded: focus is tracked by index, so a group whose options shrank
    // kept telling its `style` callback `focused: true` while the row that held
    // native focus was gone — a caller painting a group-level focus state showed
    // it on a group nothing could Tab into.
    const groupSeen: CheckboxGroupState[] = [];
    const rowSeen: CheckboxItemState[] = [];
    const element = render(
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
      [],
      Option.some(0),
      handlers(vi.fn()),
      { focusedIndex: Option.some(2), onFocus: vi.fn(), onBlur: vi.fn() },
    );

    expect(groupSeen).toEqual([{ disabled: false, focused: false }]);
    expect(Arr.every(rowSeen, (row) => !row.focused)).toBe(true);
    // The shrink must not cost the group its tab stop either.
    expect(stopOf(rows(element)[0] ?? expect.fail("no row"))).toBe(0);
  });

  it("styles each option row from its own state", () => {
    const seen: CheckboxItemState[] = [];
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
          { value: "sms", label: "SMS" },
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
      ["email"],
      Option.some(0),
      handlers(vi.fn()),
      { focusedIndex: Option.some(2), onFocus: vi.fn(), onBlur: vi.fn() },
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

  it("puts the ring, the floor and the press on the row, not its box", () => {
    // The bugs these guard: `focusVisible` on the box never painted (the
    // runtime applies a focus refinement only to an element it tracks focus
    // for), the checked box's fill owns a mouse-blocking hitbox so it swallowed
    // the row's press, and a single-line row measured 17px tall — under the
    // floor.
    const element = render(
      { options },
      ["email"],
      Option.some(0),
      handlers(vi.fn()),
    );
    const row = expectSome(Option.fromNullishOr(rows(element)[0]));
    const box = expectSome(Option.fromNullishOr(elementChildren(row)[0]));

    expect(Option.isSome(hostStyle(row, "focusVisible"))).toBe(true);
    expect(Option.isSome(hostStyle(box, "focusVisible"))).toBe(false);
    expect(expectSome(hostStyleString(box, "pointerEvents"))).toBe("none");
    expect(expectSome(hostStyle(row, "minHeight"))).toBe(targetSize.minimum);
  });

  it("marks an invalid group on every empty edge and every row ring", () => {
    // The bug guarded: the page promised that `invalid` paints "every box and
    // its ring destructive", while a checked box keeps its accent fill — only
    // the empty box's border and the row's focus ring take the destructive
    // role, exactly as the standalone `Checkbox` does.
    const element = render(
      { options, invalid: true },
      ["email"],
      Option.some(0),
      handlers(vi.fn()),
    );
    const checkedRow = expectSome(Option.fromNullishOr(rows(element)[0]));
    const emptyRow = expectSome(Option.fromNullishOr(rows(element)[1]));
    const checkedBox = expectSome(
      Option.fromNullishOr(elementChildren(checkedRow)[0]),
    );
    const emptyBox = expectSome(
      Option.fromNullishOr(elementChildren(emptyRow)[0]),
    );

    expect(expectSome(hostStyleString(checkedBox, "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
    expect(expectSome(hostStyleString(emptyBox, "borderColor"))).toBe(
      testTheme.colors.destructive,
    );
    expect(hostStyle(emptyBox, "backgroundColor")).toStrictEqual(Option.none());
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

/** Three items written as elements, the middle one disabled and rich. */
const itemChildren = (
  <>
    <CheckboxGroupItem value="email" label="Email" />
    <CheckboxGroupItem value="push" label="Push" disabled>
      <Icon name="check" color="red" size={8} />
    </CheckboxGroupItem>
    <CheckboxGroupItem value="sms" label="SMS" description="Charges apply" />
  </>
);

describe("checkboxGroupItems", () => {
  it("reads its children into the same option list the data prop produces", () => {
    const items = checkboxGroupItems({ children: itemChildren });

    expect(items.map((item) => item.value)).toEqual(["email", "push", "sms"]);
    expect(items.map((item) => item.disabled)).toEqual([
      undefined,
      true,
      undefined,
    ]);
    expect(items[1]?.content).toBeDefined();
    expect(items[1]?.label).toBe("Push");
  });

  it("renders the description and the rich content the item carries", () => {
    const element = render(
      { children: itemChildren },
      [],
      Option.none(),
      handlers(vi.fn()),
    );
    const push = rows(element)[1] ?? expect.fail("no second row");
    const body = elementChildren(push)[1] ?? expect.fail("no item body");

    expect(expectSome(hostTag(body))).toBe("div");

    const rich = elementChildren(body)[0] ?? expect.fail("no rich content");
    expect(expectSome(elementProp(rich, "name"))).toBe("check");

    const sms = rows(element)[2] ?? expect.fail("no third row");
    const smsBody = elementChildren(sms)[1] ?? expect.fail("no item body");
    const labels = elementChildren(smsBody).map((node) =>
      expectSome(elementProp(node, "children")),
    );
    expect(labels).toEqual(["SMS", "Charges apply"]);
  });
});
